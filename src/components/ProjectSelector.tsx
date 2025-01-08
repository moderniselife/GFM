import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { Select } from '@chakra-ui/select';
import { useToast } from '@chakra-ui/toast';
import { useState, useMemo, useEffect } from 'react';
import FirebaseManager from '../lib/FirebaseManager';
import { useProject } from '../contexts/ProjectContext';
import { useLogs } from '../contexts/LogsContext';
import { Panel } from './Panel';

export function ProjectSelector() {
  const [currentProject, setCurrentProject] = useState<string>('');
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { projectDir, syncTrigger } = useProject();
  const { addLog } = useLogs();

  const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

  const syncProjects = async () => {
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
    try {
      const currentProj = await manager.getCurrentProject();
      setCurrentProject(currentProj);

      const projectsList = await manager.getAllProjects();
      setProjects(Array.isArray(projectsList) ? projectsList : []);

      toast({
        title: 'Projects synced successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Failed to fetch projects',
        status: 'error',
        duration: 3000,
      });
    }
    setLoading(false);
  };

  // Auto sync when directory changes or sync is triggered
  useEffect(() => {
    if (projectDir) {
      syncProjects();
    }
  }, [projectDir, syncTrigger]);

  const handleProjectSwitch = async (projectId: string) => {
    setLoading(true);
    try {
      await manager.switchProject(projectId);
      setCurrentProject(projectId);
      toast({
        title: 'Project switched',
        status: 'success',
      });
    } catch (error) {
      toast({
        title: 'Failed to switch project',
        status: 'error',
      });
    }
    setLoading(false);
  };

  return (
    <Panel title="Project">
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="md">Project Selection</Heading>
          <Button onClick={syncProjects} isLoading={loading} size="sm" colorScheme="blue">
            Sync Projects
          </Button>
        </Box>
        <Text mt={2}>Current Project: {currentProject || 'None'}</Text>
        <Select
          mt={4}
          placeholder="Select project"
          onChange={e => handleProjectSwitch(e.target.value)}
          isDisabled={loading || projects.length === 0}
          value={currentProject}
        >
          {projects.map(project => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </Select>
      </Box>
    </Panel>
  );
}
