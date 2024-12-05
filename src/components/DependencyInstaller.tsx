import { Box, Heading, Text } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/toast';
import { Button } from '@chakra-ui/button';
import { useState, useMemo } from 'react';
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from '../contexts/ProjectContext';
import { useLogs } from '../contexts/LogsContext';

export function DependencyInstaller() {
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    const handleInstall = async () => {
        if (!projectDir) {
            toast({
                title: "No directory selected",
                description: "Please select a project directory first",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        setLoading(true);
        try {
            await manager.installDependencies();
            toast({
                title: 'Dependencies installed successfully',
                status: 'success',
                duration: 5000,
            });
        } catch (error) {
            console.error('Installation error:', error);
            toast({
                title: 'Installation failed',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" display="flex" flexDirection="column">
            <Heading size="md">Dependencies</Heading>
            <Text mt={2}>Install dependencies for all project directories</Text>
            <Box mt="auto" pt={4} width="100%">
                <Button
                    width="100%"
                    colorScheme="green"
                    onClick={handleInstall}
                    isLoading={loading}
                    loadingText="Installing..."
                >
                    Install Dependencies
                </Button>
            </Box>
        </Box>
    );
} 