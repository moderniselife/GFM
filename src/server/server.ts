import express from 'express';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import cors from 'cors';
import Server from "ws";
import http from 'http';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { promises as fs } from 'fs';

const app = express();
const server = http.createServer(app);
const wss = new Server.WebSocketServer({ server, path: '/api/gfm/logs' });
const port = 3001;

app.use(cors());
app.use(express.json());

// Error handling middleware
const errorHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: errorMessage });
    }
  };
};

// Helper function to execute shell commands
const execCommand = (command: string, dir?: string) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: dir || process.cwd()
    });
  } catch (error: any) {
    console.error('Command execution failed:');
    console.error('Command:', command);
    console.error('Error:', error.message);
    console.error('stdout:', error.stdout);
    console.error('stderr:', error.stderr);

    throw new Error(`Command failed with exit code ${error.status}: ${error.stderr || error.message}`);
  }
};

// WebSocket connection handling
wss.on('connection', (ws: any) => {
  console.log('New WebSocket client connected');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'register') {
        ws.clientId = data.clientId;
        console.log('Client registered with ID:', data.clientId);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected:', ws.clientId);
  });
});

// Get current Firebase project
app.get('/api/firebase/current-project', errorHandler(async (req, res) => {
  try {
    const dir = req.query.dir as string;
    const output = execCommand('firebase use --json', dir);
    const result = JSON.parse(output);
    res.json({ project: result.result || 'No current project' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get current project' });
  }
}));

// Switch Firebase project
app.post('/api/firebase/switch-project', errorHandler(async (req, res) => {
  try {
    const { projectId } = req.body;
    const dir = req.query.dir as string;
    const msg = execCommand(`firebase use ${projectId}`, dir);
    res.json({ message: `Switched to project: ${projectId}`, serverMsg: msg });
  } catch (error) {
    console.error('Switch project error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to switch project';
    res.status(500).json({ error: errorMessage });
  }
}));

// Install dependencies
app.post('/api/firebase/install-dependencies', errorHandler(async (req, res) => {
  try {
    const { clientId } = req.body;
    const dir = req.query.dir as string;
    const packageDirs = ['./functions', './app', './public', './trust'];
    const usesBun = existsSync('/usr/local/bin/bun');
    const installCmd = usesBun ? 'bun install' : 'npm install --legacy-peer-deps';

    // Find the corresponding WebSocket client
    const wsClient = Array.from(wss.clients).find(
      (client: ExtendedWebSocket) => client.clientId === clientId
    ) as ExtendedWebSocket;

    if (!wsClient) {
      throw new Error('WebSocket connection not found');
    }

    // Send initial response
    res.json({ message: 'Installation started' });

    for (const subDir of packageDirs) {
      const fullPath = join(dir || process.cwd(), subDir);
      if (!existsSync(fullPath)) continue;

      wsClient.send(JSON.stringify({
        type: 'log',
        message: `Installing dependencies in ${subDir}...`,
        level: 'info'
      }));

      // Install dependencies
      const installProcess = spawn(`cd ${subDir} && ${installCmd}`, {
        shell: true,
        cwd: dir || process.cwd()
      });

      // Handle stdout
      installProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          wsClient.send(JSON.stringify({
            type: 'log',
            message,
            level: 'info'
          }));
        }
      });

      // Handle stderr
      installProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          wsClient.send(JSON.stringify({
            type: 'log',
            message,
            level: 'error'
          }));
        }
      });

      // Wait for install to complete
      await new Promise((resolve, reject) => {
        installProcess.on('close', (code) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error(`Install process exited with code ${code}`));
          }
        });
      });
    }

    wsClient.send(JSON.stringify({
      type: 'complete',
      message: 'Dependencies installed successfully'
    }));
    wsClient.close();

  } catch (error) {
    console.error('Installation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Installation failed';
    res.status(500).json({
      error: errorMessage,
      type: 'installation_error'
    });
  }
}));

// Deploy to Firebase
app.post('/api/firebase/deploy', errorHandler(async (req, res) => {
  try {
    const { options, projectId, clientId } = req.body;
    const dir = req.query.dir as string;

    // Find the corresponding WebSocket client
    const wsClient = Array.from(wss.clients).find(
      (client: ExtendedWebSocket) => client.clientId === clientId
    ) as ExtendedWebSocket;

    if (!wsClient) {
      throw new Error('WebSocket connection not found');
    }

    // First switch to the correct project
    if (projectId) {
      execCommand(`firebase use ${projectId}`, dir);
    }

    let deployCmd = 'firebase deploy';

    if (!options.all) {
      let deployOptions = Object.entries(options)
        .filter(([key, value]) => value === true && key !== 'all')
        .map(([key]) => {
          if (key === 'hosting') {
            return `hosting:${projectId}`;
          }
          return key;
        })
        .join(',');

      if (deployOptions) {
        deployCmd += ` --only ${deployOptions}`;
      }
    }

    // Use spawn instead of execSync to get real-time output
    const deployProcess = spawn(deployCmd, {
      shell: true,
      cwd: dir || process.cwd()
    });

    // Send initial response
    res.json({ message: 'Deployment started', command: deployCmd });

    // Handle stdout
    deployProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        wsClient.send(JSON.stringify({
          type: 'log',
          message,
          level: 'info'
        }));
      }
    });

    // Handle stderr
    deployProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        wsClient.send(JSON.stringify({
          type: 'log',
          message,
          level: 'error'
        }));
      }
    });

    // Handle process completion
    deployProcess.on('close', (code) => {
      if (code === 0) {
        wsClient.send(JSON.stringify({
          type: 'complete',
          message: 'Deployment completed successfully'
        }));
      } else {
        wsClient.send(JSON.stringify({
          type: 'error',
          message: `Deployment failed with code ${code}`
        }));
      }
      wsClient.close();
    });

  } catch (error) {
    console.error('Deploy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
    res.status(500).json({
      error: errorMessage,
      type: 'deployment_error'
    });
  }
}));

// Manage emulators
app.post('/api/firebase/emulators', errorHandler(async (req, res) => {
  try {
    let { action, services, projectId, clientId } = req.body;
    const dir = req.query.dir as string;
    const emulatorExportDir = join(dir || process.cwd(), 'emulator_exports');

    // Find the corresponding WebSocket client
    const wsClient = Array.from(wss.clients).find(
      (client: ExtendedWebSocket) => client.clientId === clientId
    ) as ExtendedWebSocket;

    if (!wsClient) {
      throw new Error('WebSocket connection not found');
    }

    if (projectId) {
      execCommand(`firebase use ${projectId}`, dir);
    }

    // Send initial response
    res.json({ message: `Emulator ${action} started` });

    if (action === 'stop') {
      try {
        execCommand('pkill -f "firebase emulators"');
        wsClient.send(JSON.stringify({
          type: 'log',
          message: 'Emulators stopped successfully',
          level: 'success'
        }));
      } catch (error) {
        // Ignore if no process was running
        wsClient.send(JSON.stringify({
          type: 'log',
          message: 'No emulators were running',
          level: 'info'
        }));
      }
      wsClient.close();
      return;
    }

    if (action === 'restart') {
      try {
        execCommand('pkill -f "firebase emulators"');
        wsClient.send(JSON.stringify({
          type: 'log',
          message: 'Stopping existing emulators...',
          level: 'info'
        }));
      } catch (error) {
        // Ignore if no process was running
      }
    }

    let cmd = 'firebase emulators:start';
    if (services && services.length > 0) {
      // If hosting is a service, we need to add the projectID to the command
      if (services.includes('hosting')) {
        // Remove old hosting from services
        services = services.filter((service: string) => service !== 'hosting');
        services.push(`hosting:${projectId}`);
      }
      cmd += ` --only ${services.join(',')}`;
    }
    cmd += ` --import ${emulatorExportDir} --export-on-exit ${emulatorExportDir}`;

    wsClient.send(JSON.stringify({
      type: 'log',
      message: `Starting emulators with command: ${cmd}`,
      level: 'info'
    }));

    const emulatorProcess = spawn(cmd, {
      shell: true,
      cwd: dir || process.cwd()
    });

    emulatorProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        wsClient.send(JSON.stringify({
          type: 'log',
          message,
          level: 'info'
        }));

        // Check for successful emulator start
        if (message.includes('All emulators ready!')) {
          wsClient.send(JSON.stringify({
            type: 'complete',
            message: 'Emulators started successfully'
          }));
        } else if (message.includes('Shutting down emulators.')) {
          wsClient.send(JSON.stringify({
            type: 'complete',
            message: 'Emulators stopped successfully'
          }));
        }
      }
    });

    emulatorProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        wsClient.send(JSON.stringify({
          type: 'log',
          message,
          level: 'error'
        }));
      }
    });

    emulatorProcess.on('close', (code) => {
      if (code === 0) {
        wsClient.send(JSON.stringify({
          type: 'complete',
          message: `Emulators ${action}ed successfully`
        }));
      } else {
        wsClient.send(JSON.stringify({
          type: 'error',
          message: `Emulator process exited with code ${code}`
        }));
      }
      wsClient.close();
    });

  } catch (error) {
    console.error('Emulator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Emulator operation failed';
    res.status(500).json({
      error: errorMessage,
      type: 'emulator_error'
    });
  }
}));

// Get all Firebase projects
app.get('/api/firebase/projects', errorHandler(async (req, res) => {
  try {
    const dir = req.query.dir as string;
    const output = execCommand('firebase projects:list --json', dir);
    const result = JSON.parse(output);
    res.json({ projects: result.result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get projects list' });
  }
}));

// Add this new endpoint
app.post('/api/secrets/fetch', errorHandler(async (req, res) => {
  try {
    const { projectDir, environment, projectId } = req.body;
    const client = new SecretManagerServiceClient();

    // Construct the secret name based on environment
    const secretName = `projects/${projectId}/secrets/${environment}-env/versions/latest`;

    // Access the secret
    const [version] = await client.accessSecretVersion({
      name: secretName,
    });

    const secretValue = version.payload.data.toString();

    // Determine the file path based on environment
    const filePath = join(projectDir, `.env.${environment}`);

    // Write the secret to a file
    await fs.writeFile(filePath, secretValue);

    res.json({
      success: true,
      filePath: `.env.${environment}`
    });
  } catch (error) {
    console.error('Error fetching secrets:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch secrets'
    });
  }
}));

server.listen(port, () => {
  console.log(`Firebase Manager API running on port ${port}`);
}); 