import { Box, Heading, VStack, Text, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { Button } from '@chakra-ui/button';
import { Wrap, WrapItem } from '@chakra-ui/layout';
import { Checkbox } from '@chakra-ui/checkbox';
import { useToast } from "@chakra-ui/toast";
import { useState, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";

interface SecretConfig {
  name: string;
  secretKey: string;
  targetPath: string;
  description?: string;
}

interface SecretsConfig {
  secrets: SecretConfig[];
}

type Environment = 'development' | 'staging' | 'production';

export function SecretsPanel() {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<SecretsConfig | null>(null);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const config = JSON.parse(reader.result as string);
                setConfig(config);
                addLog('Secrets configuration loaded successfully', 'success');
            } catch (error) {
                toast({
                    title: 'Invalid configuration file',
                    description: 'Please ensure the file is valid JSON',
                    status: 'error',
                    duration: 3000,
                });
            }
        };

        reader.readAsText(file);
    }, [toast, addLog]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json']
        },
        multiple: false
    });

    const handleFetchEnvironmentSecrets = async () => {
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

    const handleFetchConfigSecrets = async () => {
        if (!config || !projectDir) {
            return;
        }

        setLoading(true);

        try {
            for (const secret of config.secrets) {
                addLog(`Fetching secret: ${secret.name}...`, 'info');
                
                const response = await fetch(`http://localhost:3001/api/secrets/fetch-custom`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectDir,
                        secretKey: secret.secretKey,
                        targetPath: secret.targetPath,
                        projectId: await manager.getCurrentProjectId()
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || `Failed to fetch secret: ${secret.name}`);
                }

                addLog(`Created ${secret.targetPath}`, 'success');
            }

            toast({
                title: 'Custom secrets fetched successfully',
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
            <Heading size="md" mb={4}>Secrets Manager</Heading>
            
            <Tabs isFitted variant="enclosed">
                <TabList mb="1em">
                    <Tab>Environment Mode</Tab>
                    <Tab>Config Mode</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Wrap spacing={4}>
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
                                colorScheme="blue"
                                onClick={handleFetchEnvironmentSecrets}
                                isLoading={loading}
                                isDisabled={environments.length === 0}
                            >
                                Fetch Environment Secrets
                            </Button>
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <Box
                                {...getRootProps()}
                                p={6}
                                border="2px dashed"
                                borderColor={isDragActive ? "blue.400" : "gray.200"}
                                borderRadius="md"
                                textAlign="center"
                                cursor="pointer"
                                _hover={{ borderColor: "blue.400" }}
                            >
                                <input {...getInputProps()} />
                                {config ? (
                                    <Text color="green.500">
                                        Configuration loaded ({config.secrets.length} secrets)
                                    </Text>
                                ) : (
                                    <Text>
                                        {isDragActive
                                            ? "Drop the config file here"
                                            : "Drag and drop secrets.config.json here, or click to select"}
                                    </Text>
                                )}
                            </Box>

                            {config && (
                                <VStack spacing={2} align="stretch">
                                    {config.secrets.map((secret, index) => (
                                        <Box
                                            key={index}
                                            p={2}
                                            borderWidth="1px"
                                            borderRadius="md"
                                        >
                                            <Text fontWeight="bold">{secret.name}</Text>
                                            <Text fontSize="sm" color="gray.600">
                                                Path: {secret.targetPath}
                                            </Text>
                                            {secret.description && (
                                                <Text fontSize="sm" color="gray.500">
                                                    {secret.description}
                                                </Text>
                                            )}
                                        </Box>
                                    ))}
                                </VStack>
                            )}

                            <Button
                                colorScheme="blue"
                                onClick={handleFetchConfigSecrets}
                                isLoading={loading}
                                isDisabled={!config}
                            >
                                Fetch Custom Secrets
                            </Button>
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
} 