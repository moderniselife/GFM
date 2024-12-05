import { Box, Heading } from '@chakra-ui/react';
import { Button } from '@chakra-ui/button';
import { Select } from '@chakra-ui/select';
import { Wrap, WrapItem } from '@chakra-ui/layout';
import { Checkbox } from '@chakra-ui/checkbox';
import { useToast } from "@chakra-ui/toast";
import { useState, useMemo } from 'react';
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";

type Environment = 'development' | 'staging' | 'production';

export function SecretsPanel() {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    const handleFetchSecrets = async () => {
        if (!projectDir) {
            toast({
                title: "No directory selected",
                description: "Please select a project directory first",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        if (environments.length === 0) {
            toast({
                title: "No environments selected",
                description: "Please select at least one environment",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        setLoading(true);

        try {
            for (const env of environments) {
                addLog(`Fetching secrets for ${env} environment...`, 'info');
                
                const response = await fetch(`http://localhost:3001/api/secrets/fetch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectDir,
                        environment: env,
                        projectId: await manager.getCurrentProjectId()
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `Failed to fetch secrets for ${env}`);
                }

                const { filePath } = await response.json();
                addLog(`Created ${filePath}`, 'success');
            }

            toast({
                title: 'Secrets fetched successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Failed to fetch secrets',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: "error",
                duration: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" display="flex" flexDirection="column">
            <Heading size="md">Environment Secrets</Heading>
            <Wrap spacing={4} mt={4}>
                <WrapItem>
                    <Checkbox
                        isChecked={environments.includes('development')}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setEnvironments([...environments, 'development']);
                            } else {
                                setEnvironments(environments.filter(env => env !== 'development'));
                            }
                        }}
                    >
                        Development
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={environments.includes('staging')}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setEnvironments([...environments, 'staging']);
                            } else {
                                setEnvironments(environments.filter(env => env !== 'staging'));
                            }
                        }}
                    >
                        Staging
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={environments.includes('production')}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setEnvironments([...environments, 'production']);
                            } else {
                                setEnvironments(environments.filter(env => env !== 'production'));
                            }
                        }}
                    >
                        Production
                    </Checkbox>
                </WrapItem>
            </Wrap>
            <Button
                mt="auto"
                colorScheme="blue"
                onClick={handleFetchSecrets}
                isLoading={loading}
                isDisabled={environments.length === 0}
            >
                Fetch Secrets
            </Button>
        </Box>
    );
} 