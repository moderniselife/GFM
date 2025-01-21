import { Button, VStack, Text, Box, useToast, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useLogs } from '../contexts/LogsContext';
import { Panel } from './Panel';

interface ViteServer {
  path: string;
  scripts: { [key: string]: string };
}

export function VitePanel() {
  const [servers, setServers] = useState<ViteServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServers, setLoadingServers] = useState(true);
  const toast = useToast();
  const { projectDir } = useProject();
  const { addLog } = useLogs();

  useEffect(() => {
    if (projectDir) {
      fetchViteServers();
    }
  }, [projectDir]);

  const fetchViteServers = async () => {
    try {
      setLoadingServers(true);
      const response = await fetch(`http://localhost:3001/api/scripts/vite-servers?dir=${encodeURIComponent(projectDir)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Vite servers');
      }
      const data = await response.json();
      setServers(data.servers);
    } catch (error) {
      console.error('Error fetching Vite servers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch Vite servers',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingServers(false);
    }
  };

  const handleRunScript = async (scriptPath: string, scriptName: string) => {
    if (!projectDir) {
      toast({
        title: 'No directory selected',
        description: 'Please select a project directory first',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:3001/api/gfm/logs');
    const clientId = Math.random().toString(36).substring(7);

    // Wait for WebSocket connection to be established
    await new Promise<void>(resolve => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'register', clientId }));
        resolve();
      };
    });

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'log':
            addLog(data.message, data.level);
            break;
          case 'complete':
            addLog(data.message, 'success');
            setLoading(false);
            break;
          case 'error':
            addLog(data.message, 'error');
            setLoading(false);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
      addLog('WebSocket connection error', 'error');
      setLoading(false);
    };

    try {
      const response = await fetch('http://localhost:3001/api/scripts/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptPath,
          scriptName,
          clientId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to run script ${scriptName}`);
      }
    } catch (error) {
      toast({
        title: 'Failed to run script',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
      ws.close();
      setLoading(false);
    }
  };

  return (
    <Panel title="Vite Servers">
      <VStack spacing={4} align="stretch">
        {loadingServers ? (
          <Box textAlign="center" py={4}>
            <Spinner />
            <Text mt={2}>Loading Vite servers...</Text>
          </Box>
        ) : servers.length === 0 ? (
          <Text>No Vite servers found in the project</Text>
        ) : (
          servers.map((server, index) => (
            <Box
              key={index}
              p={4}
              borderWidth={1}
              borderRadius="md"
              backgroundColor="whiteAlpha.100"
            >
              <Text fontWeight="bold" mb={2}>
                {server.path}
              </Text>
              <VStack align="stretch" spacing={2}>
                {Object.entries(server.scripts).map(([name, command]) => (
                  <Button
                    key={name}
                    onClick={() => handleRunScript(server.path, name)}
                    isLoading={loading}
                    colorScheme="blue"
                    size="sm"
                    title={command}
                  >
                    Run {name}
                  </Button>
                ))}
              </VStack>
            </Box>
          ))
        )}
      </VStack>
    </Panel>
  );
}