import express from 'express';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import cors from 'cors';
import Server from "ws";
import http from 'http';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { promises as fs } from 'fs';
import { homedir, tmpdir } from 'os';
import { initializeApp, cert, ServiceAccount, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// Store service accounts by project ID
const serviceAccounts = new Map<string, ServiceAccount>();

// Add endpoint to set service account
app.post('/api/firebase/set-service-account', errorHandler(async (req, res) => {
  try {
    const { projectId, serviceAccount } = req.body;

    if (!projectId || !serviceAccount) {
      throw new Error('Project ID and service account are required');
    }

    // Validate service account has required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account format');
    }

    // Store the service account
    serviceAccounts.set(projectId, serviceAccount);

    // Clean up existing Firebase app if it exists
    const existingApp = getApps().find(app => app.name === projectId);
    if (existingApp) {
      await deleteApp(existingApp);
    }

    console.log('Service account set for project:', projectId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting service account:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to set service account'
    });
  }
}));

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

// Update the secrets fetch endpoints with better error handling
app.post('/api/secrets/fetch', errorHandler(async (req, res) => {
  try {
    const { projectDir, environment, projectId } = req.body;
    const client = new SecretManagerServiceClient();

    // Construct the secret name based on environment
    const secretName = `projects/${projectId}/secrets/${environment}-env/versions/latest`;

    try {
      // First check if the secret exists
      await client.accessSecretVersion({
        name: secretName,
      });
    } catch (error: any) {
      // Check for specific error types
      if (error.code === 5) { // NOT_FOUND
        throw new Error(`Secret '${environment}-env' not found. Please ensure the secret exists in your Google Cloud project.`);
      } else if (error.code === 7) { // PERMISSION_DENIED
        throw new Error(`Permission denied. Please ensure you have the 'Secret Manager Secret Accessor' role.`);
      } else if (error.message?.includes('Could not load the default credentials')) {
        throw new Error('Authentication failed. Please try logging in again with Google Cloud.');
      }
      throw error;
    }

    // If we get here, the secret exists and we have access
    const [version] = await client.accessSecretVersion({
      name: secretName,
    });

    const secretValue = version.payload.data.toString();
    const filePath = join(projectDir, `.env.${environment}`);
    await fs.writeFile(filePath, secretValue);

    res.json({
      success: true,
      filePath: `.env.${environment}`
    });
  } catch (error) {
    console.error('Error fetching secrets:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch secrets',
      code: error.code
    });
  }
}));

// Add this new endpoint
app.get('/api/firebase/running-emulators', errorHandler(async (req, res) => {
  try {
    // Use ps command to find running emulator processes
    const psOutput = execCommand('ps aux | grep "firebase emulators"');
    const lines = psOutput.split('\n');

    // Extract running emulators from the command line
    const runningEmulators = new Set<string>();

    lines.forEach(line => {
      if (line.includes('--only')) {
        const match = line.match(/--only\s+([^\s]+)/);
        if (match) {
          const emulators = match[1].split(',');
          emulators.forEach(emulator => {
            // Handle the special case of hosting:projectId
            if (emulator.startsWith('hosting:')) {
              runningEmulators.add('hosting');
            } else {
              runningEmulators.add(emulator);
            }
          });
        }
      }
    });

    res.json({ runningEmulators: Array.from(runningEmulators) });
  } catch (error) {
    // If the grep returns nothing, it means no emulators are running
    res.json({ runningEmulators: [] });
  }
}));

// Update the secrets fetch endpoints with better error handling
app.post('/api/secrets/fetch-custom', errorHandler(async (req, res) => {
  try {
    const { projectDir, secretKey, targetPath, projectId } = req.body;

    if (!projectId) {
      throw new Error('No project ID provided');
    }

    console.log(`Fetching secret: ${secretKey} for project: ${projectId}`);
    const client = new SecretManagerServiceClient();

    // Construct the secret name
    const secretName = `projects/${projectId}/secrets/${secretKey}/versions/latest`;
    console.log(`Accessing secret: ${secretName}`);

    try {
      // Add a timeout to the secret access
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });

      const secretPromise = client.accessSecretVersion({ name: secretName });
      const [version] = await Promise.race([secretPromise, timeoutPromise]) as any;

      if (!version?.payload?.data) {
        throw new Error('Secret payload is empty');
      }

      const secretValue = version.payload.data.toString();
      const targetPaths = Array.isArray(targetPath) ? targetPath : [targetPath];
      const results = [];

      for (const path of targetPaths) {
        const filePath = join(projectDir, path);

        // Create directory if it doesn't exist
        await fs.mkdir(dirname(filePath), { recursive: true });

        // Write the file
        await fs.writeFile(filePath, secretValue);

        // Verify file was created
        const fileExists = await fs.access(filePath)
          .then(() => true)
          .catch(() => false);

        if (!fileExists) {
          throw new Error(`Failed to create file at ${filePath}`);
        }

        console.log(`✅ Secret written to: ${filePath}`);
        results.push({ targetPath: path, absolutePath: filePath });
      }

      res.json({
        success: true,
        results
      });

    } catch (error: any) {
      console.error('Error accessing secret:', error);

      if (error.message === 'Request timed out') {
        throw new Error(`Timeout while accessing secret '${secretKey}'. Please check your internet connection and try again.`);
      }

      // NOT_FOUND (code 5) means the secret doesn't exist
      if (error.code === 5 || error.details?.includes('NOT_FOUND')) {
        throw new Error(`❌ Secret '${secretKey}' does not exist in project '${projectId}'. Please create it first in the Google Cloud Console. - https://console.cloud.google.com/security/secret-manager?project=${projectId}`);
      }

      if (error.code === 7) { // PERMISSION_DENIED
        throw new Error(`❌ Permission denied accessing secret '${secretKey}'. Please ensure you have the 'Secret Manager Secret Accessor' role.`);
      }

      if (error.message?.includes('Could not load the default credentials')) {
        throw new Error('❌ Authentication failed. Please ensure you have completed the Google Cloud login and ADC setup.');
      }

      throw error;
    }

  } catch (error) {
    console.error('Error in fetch-custom:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch custom secret',
      code: (error as any).code,
      details: (error as any).details
    });
  }
}));

// Update the auth status endpoint
app.get('/api/gcloud/auth-status', errorHandler(async (req, res) => {
  try {
    // Check if user is authenticated with gcloud
    let isAuthenticated = false;
    try {
      execCommand('gcloud auth print-access-token');
      isAuthenticated = true;
    } catch (error) {
      isAuthenticated = false;
    }

    // Check if ADC is configured by looking for the credentials file
    const adcPath = join(homedir(), '.config/gcloud/application_default_credentials.json');
    const isADCConfigured = existsSync(adcPath);

    res.json({
      isAuthenticated,
      isADCConfigured
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.json({
      isAuthenticated: false,
      isADCConfigured: false
    });
  }
}));

app.post('/api/gcloud/login', errorHandler(async (req, res) => {
  try {
    // Execute gcloud auth login command
    execCommand('gcloud auth login');
    res.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
}));

app.post('/api/gcloud/setup-adc', errorHandler(async (req, res) => {
  try {
    // Execute gcloud auth application-default login command
    execCommand('gcloud auth application-default login');
    res.json({ success: true });
  } catch (error) {
    console.error('ADC setup error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'ADC setup failed'
    });
  }
}));

// Add this new endpoint
app.post('/api/files/exists', errorHandler(async (req, res) => {
  try {
    const { projectDir, filePath } = req.body;
    const fullPath = join(projectDir, filePath);

    const exists = await fs.access(fullPath)
      .then(() => true)
      .catch(() => false);

    res.json({ exists });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check file existence'
    });
  }
}));

// Add this new endpoint
app.post('/api/secrets/create', errorHandler(async (req, res) => {
  try {
    const { projectId, secretKey, secretValue } = req.body;
    console.log('Creating secret:', { projectId, secretKey, secretValueLength: secretValue?.length });

    // First verify authentication
    try {
      const authOutput = execCommand('gcloud auth print-access-token');
      console.log('Authentication verified');
    } catch (error) {
      throw new Error('Authentication failed. Please ensure you are logged in with `gcloud auth login` and have run `gcloud auth application-default login`');
    }

    // Create client with explicit credentials
    const client = new SecretManagerServiceClient({
      projectId,
      keyFilename: join(homedir(), '.config/gcloud/application_default_credentials.json')
    });
    console.log('SecretManager client created');

    // Add a timeout to the create secret operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 10000);
    });

    // Create secret with timeout
    try {
      console.log('Attempting to create secret...');
      await Promise.race([
        client.createSecret({
          parent: `projects/${projectId}`,
          secretId: secretKey,
          secret: {
            replication: {
              automatic: {}
            }
          }
        }),
        timeoutPromise
      ]);
      console.log('Secret created successfully');
    } catch (error: any) {
      console.log('Create secret error:', error.code, error.message);
      if (error.message === 'Operation timed out') {
        throw new Error('Failed to create secret: operation timed out. Please verify your permissions and authentication.');
      }
      // Ignore error if secret already exists (error code 6)
      if (error.code !== 6) {
        throw error;
      }
      console.log('Secret already exists, continuing...');
    }

    // Add secret version with timeout
    console.log('Adding secret version...');
    const [version] = await Promise.race([
      client.addSecretVersion({
        parent: `projects/${projectId}/secrets/${secretKey}`,
        payload: {
          data: Buffer.from(secretValue, 'utf8')
        }
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 10000);
      })
    ]) as any;

    console.log('Secret version added:', version.name);

    res.json({
      success: true,
      version: version.name
    });

  } catch (error: any) {
    console.error('Error creating secret:', {
      code: error.code,
      message: error.message,
      details: error.details
    });

    if (error.code === 7) { // PERMISSION_DENIED
      throw new Error('Permission denied. Please ensure you have the "Secret Manager Admin" role.');
    }
    if (error.message?.includes('Could not load the default credentials')) {
      throw new Error('Authentication failed. Please ensure you have completed the Google Cloud login and ADC setup.');
    }

    throw error;
  }
}));

// Add this endpoint to save the updated config file
app.post('/api/config/save', errorHandler(async (req, res) => {
  try {
    const { projectDir, config } = req.body;
    const configPath = join(projectDir, 'secrets.config.json');

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      path: configPath
    });
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}));

// Firebase Auth endpoints
app.get('/api/firebase/auth/users', errorHandler(async (req, res) => {
  try {
    const dir = req.query.dir as string;
    const projectId = req.query.projectId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!projectId) {
      throw new Error('No project ID provided');
    }

    // Create a temporary file path
    const tempFile = join(tmpdir(), `firebase-auth-export-${Date.now()}.json`);

    // Execute the auth export command with the project ID and output file
    const cmdOutput = execCommand(`firebase auth:export ${tempFile} --format=json --project ${projectId}`, dir);
    console.log('Firebase CLI Output:', cmdOutput); // Debug log

    try {
      // Read and parse the exported file using fs.promises
      const fileContent = await fs.readFile(tempFile, 'utf8');
      console.log('File Content:', fileContent); // Debug log

      // Clean up the temporary file
      await fs.unlink(tempFile);

      try {
        // Handle empty user list
        if (!fileContent.trim()) {
          res.json({
            users: [],
            pagination: {
              page: 1,
              limit,
              totalUsers: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false
            }
          });
          return;
        }

        let allUsers;
        try {
          allUsers = JSON.parse(fileContent);
          allUsers = allUsers.users;
        } catch (jsonError) {
          // If parsing fails, try to extract JSON from the output
          const jsonMatch = fileContent.match(/\[.*\]/s);
          if (jsonMatch) {
            allUsers = JSON.parse(jsonMatch[0]);
          } else {
            throw jsonError;
          }
        }

        // Ensure allUsers is an array
        if (!Array.isArray(allUsers)) {
          allUsers = [];
        }

        const totalUsers = allUsers.length;
        const totalPages = Math.ceil(totalUsers / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const users = allUsers.slice(startIndex, endIndex);

        res.json({
          users,
          pagination: {
            page,
            limit,
            totalUsers,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        });
      } catch (parseError) {
        console.error('Parse Error:', parseError);
        console.error('Failed to parse users data. Content:', fileContent);
        throw new Error(`Failed to parse users data: ${parseError.message}`);
      }
    } catch (fileError) {
      console.error('File Error:', fileError);
      throw new Error(`Failed to read authentication data: ${fileError.message}`);
    }
  } catch (error) {
    console.error('Auth export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
    res.status(500).json({ error: errorMessage });
  }
}));

app.post('/api/firebase/auth/update-user', errorHandler(async (req, res) => {
  try {
    const { uid, disabled } = req.body;
    const dir = req.query.dir as string;

    // First get the current project ID
    const projectOutput = execCommand('firebase use --json', dir);
    const { result: projectId } = JSON.parse(projectOutput);

    if (!projectId) {
      throw new Error('No active project found');
    }

    // Execute the auth command with the project ID
    execSync(`firebase auth:${disabled ? 'disable' : 'enable'} ${uid} --project ${projectId}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: dir || process.cwd()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Auth update error:', error);
    const errorMessage = error.stderr?.toString() || error.message;
    res.status(500).json({ error: errorMessage });
  }
}));

// Firestore endpoints
app.get('/api/firebase/firestore/get', errorHandler(async (req, res) => {
  try {
    const path = req.query.path as string;
    const projectId = req.query.projectId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!projectId) {
      throw new Error('No project ID provided');
    }

    const serviceAccount = serviceAccounts.get(projectId);
    if (!serviceAccount) {
      throw new Error('No service account configured for this project. Please add it in the settings.');
    }

    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId
    }, projectId);

    const db = getFirestore(app);
    const ref = db.doc(path).get().then(doc => {
      // If it's a document that exists, return it
      if (doc.exists) {
        return {
          isDocument: true,
          data: {
            id: doc.id,
            data: doc.data(),
            path: doc.ref.path
          }
        };
      }
    }).catch(() => {
      // If not a document, try as collection
      return db.collection(path)
        .orderBy('__name__')
        .limit(limit)
        .offset((page - 1) * limit)
        .get()
        .then(async (querySnapshot) => {
          const totalSnapshot = await db.collection(path).count().get();
          const totalDocs = totalSnapshot.data().count;

          const data = [];
          querySnapshot.forEach(doc => {
            data.push({
              id: doc.id,
              data: doc.data(),
              path: doc.ref.path
            });
          });

          return {
            isDocument: false,
            data,
            pagination: {
              page,
              limit,
              totalDocs,
              totalPages: Math.ceil(totalDocs / limit),
              hasNextPage: page * limit < totalDocs,
              hasPreviousPage: page > 1
            }
          };
        });
    });

    const result = await ref;
    await deleteApp(app);
    res.json(result);

  } catch (error) {
    console.error('Firestore get error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Firestore data';
    res.status(500).json({ error: errorMessage });
  }
}));

app.get('/api/firebase/firestore/collections', errorHandler(async (req, res) => {
  try {
    const dir = req.query.dir as string;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      throw new Error('No project ID provided');
    }

    // List root collections
    const output = execCommand(`firebase firestore:indexes list --project ${projectId}`, dir);

    try {
      // Parse the output to get collection names
      const collections = output
        .split('\n')
        .filter(line => line.includes('collection'))
        .map(line => {
          const match = line.match(/collection\s+([^\s]+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      res.json({ collections });
    } catch (parseError) {
      console.error('Failed to parse collections:', output);
      throw new Error('Failed to parse collections data');
    }
  } catch (error) {
    console.error('Firestore collections error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections';
    res.status(500).json({ error: errorMessage });
  }
}));

app.post('/api/firebase/firestore/delete', errorHandler(async (req, res) => {
  try {
    const { path } = req.body;
    const projectId = req.query.projectId as string;

    if (!projectId) {
      throw new Error('No project ID provided');
    }

    const serviceAccount = serviceAccounts.get(projectId);
    if (!serviceAccount) {
      throw new Error('No service account configured for this project. Please add it in the settings.');
    }

    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId
    }, projectId);

    const db = getFirestore(app);
    await db.doc(path).delete();

    // Clean up app instance
    await deleteApp(app);

    res.json({ success: true });
  } catch (error) {
    console.error('Firestore delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
    res.status(500).json({ error: errorMessage });
  }
}));

server.listen(port, () => {
  console.log(`Firebase Manager API running on port ${port}`);
}); 