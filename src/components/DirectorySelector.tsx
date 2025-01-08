import { Box, Heading, Input, Text, Button, HStack } from '@chakra-ui/react';
import { useProject } from '../contexts/ProjectContext';
import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/toast';
import FirebaseManager from '../lib/FirebaseManager';
import { Panel } from './Panel';

export function DirectorySelector() {
  const { projectDir, setProjectDir, triggerSync } = useProject();
  const [tempDir, setTempDir] = useState(projectDir);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  // Check for dir query parameter on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dirParam = params.get('dir');
    if (dirParam) {
      setTempDir(dirParam);
      handleSync(dirParam);
    }
  }, []);

  const handleSync = async (directory: string = tempDir) => {
    setSyncing(true);
    const manager = new FirebaseManager(directory);

    try {
      // Try to get the current project to verify the directory is valid
      await manager.getCurrentProject();

      // If successful, update the project directory
      setProjectDir(directory);
      triggerSync();

      toast({
        title: 'Directory updated',
        description: `Project directory set to: ${directory}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Invalid directory',
        description: 'Could not find a valid Firebase project in this directory',
        status: 'error',
        duration: 3000,
      });
      // Reset temp directory to the current valid directory
      setTempDir(projectDir);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Panel title="Directory">
      <Box>
        <Heading size="md">Project Directory</Heading>
        <Text mt={2}>Specify the Firebase project directory</Text>
        <HStack mt={4} spacing={4}>
          <Input
            value={tempDir}
            onChange={e => setTempDir(e.target.value)}
            placeholder="Enter project directory path"
          />
          <Button
            colorScheme="blue"
            onClick={() => handleSync()}
            isLoading={syncing}
            loadingText="Syncing"
          >
            Sync
          </Button>
        </HStack>
      </Box>
    </Panel>
  );
}
