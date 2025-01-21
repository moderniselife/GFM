import { useLogs } from '../contexts/LogsContext';

interface DeployOptions {
  hosting?: boolean;
  storage?: boolean;
  functions?: boolean;
  rules?: boolean;
  all?: boolean;
}

class FirebaseManager {
  private baseUrl: string;
  private projectDir: string;
  private addLog?: (message: string, type: 'info' | 'error' | 'success') => void;
  public currentProjectId?: string;

  constructor(
    projectDir: string,
    addLog?: (message: string, type: 'info' | 'error' | 'success') => void
  ) {
    this.baseUrl = 'http://localhost:3001/api';
    this.projectDir = projectDir;
    this.addLog = addLog;
  }

  private log(message: string, type: 'info' | 'error' | 'success' = 'info') {
    this.addLog?.(message, type);
  }

  public async getFirebaseConfig(): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/firebase/config?dir=${encodeURIComponent(this.projectDir)}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to read firebase configuration');
      }
      const { config } = await response.json();
      return config;
    } catch (error) {
      this.log(`Failed to read firebase configuration: ${error}`, 'error');
      throw error;
    }
  }

  public async getCurrentProject(): Promise<string> {
    this.log('Fetching current project...');
    try {
      const response = await fetch(
        `${this.baseUrl}/firebase/current-project?dir=${this.projectDir}`
      );
      if (!response.ok) throw new Error('Failed to get current project');
      const data = await response.json();
      this.currentProjectId = data.project;
      this.log(`Current project: ${data.project}`, 'success');
      return data.project;
    } catch (error) {
      this.log(`Error getting current project: ${error}`, 'error');
      throw error;
    }
  }

  public async switchProject(projectId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/firebase/switch-project?dir=${this.projectDir}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch project');
      }

      this.currentProjectId = projectId;
    } catch (error) {
      this.log(`Failed to switch project: ${error}`, 'error');
      throw error;
    }
  }

  public async installDependencies(): Promise<void> {
    if (!this.projectDir) {
      this.log('No project directory selected. Please select a project directory first.', 'error');
      throw new Error('No project directory selected. Please select a project directory first.');
    }

    if (!this.currentProjectId) {
      this.currentProjectId = await this.getCurrentProject();
      if (!this.currentProjectId) {
        throw new Error('No project selected. Please select a project first.');
      }
    }

    this.log('Installing dependencies...', 'info');
    let ws: WebSocket | null = null;

    try {
      const wsUrl = this.baseUrl.replace('http', 'ws');
      ws = new WebSocket(`${wsUrl}/gfm/logs`);
      const clientId = Math.random().toString(36).substring(7);

      // Set up WebSocket message handler
      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'log':
              this.log(data.message, data.level === 'error' ? 'error' : 'info');
              break;
            case 'complete':
              this.log(data.message, 'success');
              break;
            case 'error':
              this.log(data.message, 'error');
              break;
            default:
              console.log('Unknown message type:', data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      // Wait for WebSocket connection
      await new Promise<void>(resolve => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'register', clientId }));
          resolve();
        };
      });

      const response = await fetch(
        `${this.baseUrl}/firebase/install-dependencies?dir=${encodeURIComponent(this.projectDir)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, projectId: this.currentProjectId }),
        }
      );

      if (!response.ok) {
        ws.close();
        const error = await response.json();
        throw new Error(error.error || 'Failed to install dependencies');
      }

      // Wait for installation to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws?.close();
          reject(new Error('Installation timed out'));
        }, 300000); // 5 minute timeout

        ws.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch (error) {
      ws?.close();
      this.log(`Failed to install dependencies: ${error}`, 'error');
      throw error;
    }
  }

  // public async deploy(options: { [key: string]: boolean }, signal?: AbortSignal): Promise<void> {
  //   this.log('Starting deployment...');
  //   let ws: WebSocket | null = null;

  //   try {
  //     if (!this.currentProjectId) {
  //       this.currentProjectId = await this.getCurrentProject();
  //       if (!this.currentProjectId) {
  //         throw new Error('No project selected. Please select a project first.');
  //       }
  //     }

  //     const wsUrl = this.baseUrl.replace('http', 'ws');
  //     ws = new WebSocket(`${wsUrl}/gfm/logs`);
  //     const clientId = Math.random().toString(36).substring(7);

  //     // Set up abort handler
  //     if (signal) {
  //       signal.addEventListener('abort', () => {
  //         ws?.close();
  //         throw new DOMException('Deployment aborted by user', 'AbortError');
  //       });
  //     }

  //     ws.onmessage = (event) => {
  //       try {
  //         const data = JSON.parse(event.data);
  //         switch (data.type) {
  //           case 'log':
  //             this.log(data.message, data.level === 'error' ? 'error' : 'info');
  //             break;
  //           case 'complete':
  //             this.log(data.message, 'success');
  //             break;
  //           case 'error':
  //             this.log(data.message, 'error');
  //             break;
  //           default:
  //             console.log('Unknown message type:', data);
  //         }
  //       } catch (error) {
  //         console.error('Error processing WebSocket message:', error);
  //       }
  //     };

  //     await new Promise<void>((resolve) => {
  //       ws.onopen = () => {
  //         ws.send(JSON.stringify({ type: 'register', clientId }));
  //         resolve();
  //       };
  //     });

  //     const response = await fetch(`${this.baseUrl}/firebase/deploy?dir=${encodeURIComponent(this.projectDir)}`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         options,
  //         projectId: this.currentProjectId,
  //         clientId
  //       }),
  //       signal, // Add the abort signal here
  //     });

  //     if (!response.ok) {
  //       ws.close();
  //       const error = await response.json();
  //       throw new Error(error.error || 'Deployment failed');
  //     }

  //     await new Promise<void>((resolve, reject) => {
  //       const timeout = setTimeout(() => {
  //         ws.close();
  //         reject(new Error('Deployment timed out'));
  //       }, 300000);

  //       ws.onclose = () => {
  //         clearTimeout(timeout);
  //         resolve();
  //       };
  //     });

  //   } catch (error) {
  //     ws?.close();
  //     this.log(`Deployment failed: ${error}`, 'error');
  //     throw error;
  //   }
  // }

  public async deploy(
    options: { [key: string]: boolean },
    signal?: AbortSignal,
    targets?: { [key: string]: string[] }
  ): Promise<void> {
    this.log('Starting deployment...');
    let ws: WebSocket | null = null;

    try {
      if (!this.currentProjectId) {
        this.currentProjectId = await this.getCurrentProject();
        if (!this.currentProjectId) {
          throw new Error('No project selected. Please select a project first.');
        }
      }

      const wsUrl = this.baseUrl.replace('http', 'ws');
      ws = new WebSocket(`${wsUrl}/gfm/logs`);
      const clientId = Math.random().toString(36).substring(7);

      // Set up abort handler
      if (signal) {
        signal.addEventListener('abort', () => {
          ws?.close();
          throw new DOMException('Deployment aborted by user', 'AbortError');
        });
      }

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'log':
              this.log(data.message, data.level === 'error' ? 'error' : 'info');
              break;
            case 'complete':
              this.log(data.message, 'success');
              break;
            case 'error':
              this.log(data.message, 'error');
              break;
            default:
              console.log('Unknown message type:', data);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      await new Promise<void>(resolve => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'register', clientId }));
          resolve();
        };
      });

      const response = await fetch(
        `${this.baseUrl}/firebase/deploy?dir=${encodeURIComponent(this.projectDir)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            options,
            projectId: this.currentProjectId,
            clientId,
            targets,
          }),
          signal,
        }
      );

      if (!response.ok) {
        ws.close();
        const error = await response.json();
        throw new Error(error.error || 'Deployment failed');
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Deployment timed out'));
        }, 300000);

        ws.onclose = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    } catch (error) {
      ws?.close();
      this.log(`Deployment failed: ${error}`, 'error');
      throw error;
    }
  }

  public async manageEmulators(
    action: 'start' | 'stop' | 'restart',
    services?: string[]
  ): Promise<void> {
    if (!this.currentProjectId) {
      this.currentProjectId = await this.getCurrentProject();
      if (!this.currentProjectId) {
        throw new Error('No project selected. Please select a project first.');
      }
    }

    const response = await fetch(`${this.baseUrl}/firebase/emulators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        services,
        dir: this.projectDir,
        projectId: this.currentProjectId,
      }),
    });

    if (!response.ok) throw new Error(`Failed to ${action} emulators`);
  }

  async getAllProjects(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/firebase/projects?dir=${this.projectDir}`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    const data = await response.json();
    return data.projects.map((project: any) => project.projectId);
  }

  public async getCurrentProjectId(): Promise<string | undefined> {
    if (!this.currentProjectId) {
      let tmpProjectId = await this.getCurrentProject();
      if (tmpProjectId) {
        this.currentProjectId = tmpProjectId;
      }
    }
    return this.currentProjectId;
  }

  public async fetchSecrets(environment: string): Promise<string> {
    if (!this.projectDir) {
      throw new Error('No project directory selected');
    }

    if (!this.currentProjectId) {
      this.currentProjectId = await this.getCurrentProject();
      if (!this.currentProjectId) {
        throw new Error('No project selected. Please select a project first.');
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/secrets/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDir: this.projectDir,
          environment,
          projectId: this.currentProjectId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch secrets for ${environment}`);
      }

      const { filePath } = await response.json();
      return filePath;
    } catch (error) {
      this.log(`Failed to fetch secrets: ${error}`, 'error');
      throw error;
    }
  }

  public async checkRunningEmulators(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/firebase/running-emulators`);
    if (!response.ok) {
      throw new Error('Failed to check running emulators');
    }
    const { runningEmulators } = await response.json();
    return runningEmulators;
  }

  public async createSecret(secretKey: string, secretValue: string): Promise<void> {
    if (!this.currentProjectId) {
      this.currentProjectId = await this.getCurrentProject();
      if (!this.currentProjectId) {
        throw new Error('No project selected. Please select a project first.');
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.baseUrl}/secrets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: this.currentProjectId,
          secretKey,
          secretValue,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create secret');
      }

      this.log(`Secret '${secretKey}' created successfully`, 'success');
    } catch (error) {
      if (error.name === 'AbortError') {
        this.log('Request timed out. Please check your authentication and try again.', 'error');
        throw new Error('Request timed out. Please check your authentication and try again.');
      }
      this.log(`Failed to create secret: ${error}`, 'error');
      throw error;
    }
  }
}

export default FirebaseManager;
