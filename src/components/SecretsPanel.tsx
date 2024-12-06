import { Box, Heading, VStack, Text, Tabs, TabList, TabPanels, Tab, TabPanel, HStack, Link, Input, FormControl, FormLabel, Textarea, Select, Spinner } from '@chakra-ui/react';
import { Button } from '@chakra-ui/button';
import { Wrap, WrapItem } from '@chakra-ui/layout';
import { Checkbox } from '@chakra-ui/checkbox';
import { useToast } from "@chakra-ui/toast";
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import { GoogleAuthStatus } from './GoogleAuthStatus';
import { CheckIcon, SearchIcon, WarningIcon, RepeatIcon, ExternalLinkIcon } from '@chakra-ui/icons';

interface SecretConfig {
    name: string;
    secretKey: string;
    targetPath: string | string[];
    description?: string;
}

interface SecretsConfig {
    secrets: SecretConfig[];
}

type Environment = 'development' | 'staging' | 'production';

interface FileStatus {
    exists: boolean;
    error?: string;
    loading?: boolean;
}

interface NewSecretForm {
    name: string;
    secretKey: string;
    targetPath: string;
    description: string;
    value: string;
    environment: string;
}

export function SecretsPanel() {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<SecretsConfig | null>(null);
    const [fileStatuses, setFileStatuses] = useState<{ [key: string]: FileStatus }>({});
    const [newSecret, setNewSecret] = useState<NewSecretForm>({
        name: '',
        secretKey: '',
        targetPath: '',
        description: '',
        value: '',
        environment: 'development'
    });
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();
    const [defaultIndex, setDefaultIndex] = useState(0);
    const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
    const loadAttempted = useRef(false);

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

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Failed to fetch secrets for ${env}`);
                }

                addLog(`Created ${data.filePath}`, 'success');
            }

            toast({
                title: 'Secrets fetched successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addLog(`Error: ${errorMessage}`, 'error');
            toast({
                title: 'Failed to fetch secrets',
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFetchSingleSecret = async (secret: SecretConfig) => {
        if (!config || !projectDir) return;

        setFileStatuses(prev => ({
            ...prev,
            [secret.name]: { ...prev[secret.name], loading: true }
        }));

        try {
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

            const data = await response.json();

            if (!response.ok) {
                setFileStatuses(prev => ({
                    ...prev,
                    [secret.name]: { exists: false, error: data.error, loading: false }
                }));
                addLog(`Error: ${data.error}`, 'error');
                return;
            }

            setFileStatuses(prev => ({
                ...prev,
                [secret.name]: { exists: true, loading: false }
            }));

            addLog(`✅ Secret '${secret.name}' written to:`, 'success');
            data.results.forEach(({ targetPath, absolutePath }) => {
                addLog(`   ${absolutePath}`, 'info');
            });
        } catch (error) {
            setFileStatuses(prev => ({
                ...prev,
                [secret.name]: { exists: false, error: error.message, loading: false }
            }));
        }
    };

    const handleFetchConfigSecrets = async () => {
        if (!config || !projectDir) {
            return;
        }

        setLoading(true);

        try {
            for (const secret of config.secrets) {
                // Skip if file already exists
                if (fileStatuses[secret.name]?.exists) {
                    addLog(`Skipping ${secret.name} (already exists)`, 'info');
                    continue;
                }

                await handleFetchSingleSecret(secret);
            }

            toast({
                title: 'Completed fetching secrets',
                description: 'Check the logs for details',
                status: 'info',
                duration: 5000,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addLog(`Error: ${errorMessage}`, 'error');
            toast({
                title: 'Failed to fetch secrets',
                description: errorMessage,
                status: "error",
                duration: 10000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const checkExistingFiles = useCallback(async () => {
        if (!config || !projectDir) return;

        const statuses: { [key: string]: FileStatus } = {};

        for (const secret of config.secrets) {
            // Skip if we've already checked this secret
            if (checkedFiles.has(secret.name)) continue;

            const paths = Array.isArray(secret.targetPath) ? secret.targetPath : [secret.targetPath];

            const results = await Promise.all(paths.map(async (path) => {
                try {
                    const response = await fetch('http://localhost:3001/api/files/exists', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectDir,
                            filePath: path
                        })
                    });
                    const { exists, error } = await response.json();
                    return { exists, error };
                } catch (error) {
                    return { exists: false, error: error.message };
                }
            }));

            statuses[secret.name] = {
                exists: results.every(r => r.exists),
                error: results.find(r => r.error)?.error
            };

            // Mark this secret as checked
            setCheckedFiles(prev => new Set([...prev, secret.name]));
        }

        setFileStatuses(prev => ({ ...prev, ...statuses }));
    }, [config, projectDir, checkedFiles]);

    useEffect(() => {
        checkExistingFiles();
    }, [checkExistingFiles]);

    const formatErrorMessage = (error: string) => {
        // Handle the "secret does not exist" error
        if (error.includes('does not exist in project')) {
            const matches = error.match(/Secret '(.+)' does not exist in project '(.+)'\./);
            if (matches) {
                const [_, secretKey, projectId] = matches;
                const consoleUrl = `https://console.cloud.google.com/security/secret-manager?project=${projectId}`;
                return (
                    <VStack align="stretch" spacing={1}>
                        <Text>Secret not found: <strong>{secretKey}</strong></Text>
                        <Text fontSize="sm">
                            Please create this secret in project: <strong>{projectId}</strong>
                        </Text>
                        <Link
                            href={consoleUrl}
                            isExternal
                            color="blue.500"
                            fontSize="sm"
                        >
                            Open Secret Manager <ExternalLinkIcon mx="2px" />
                        </Link>
                    </VStack>
                );
            }
        }

        // Handle authentication errors
        if (error.includes('Authentication failed')) {
            return (
                <VStack align="stretch" spacing={1}>
                    <Text>Authentication Failed</Text>
                    <Text fontSize="sm">
                        Please ensure you have completed the Google Cloud login and ADC setup.
                    </Text>
                </VStack>
            );
        }

        // Handle permission denied errors
        if (error.includes('Permission denied')) {
            return (
                <VStack align="stretch" spacing={1}>
                    <Text>Permission Denied</Text>
                    <Text fontSize="sm">
                        Please ensure you have the 'Secret Manager Secret Accessor' role.
                    </Text>
                </VStack>
            );
        }

        // Handle timeout errors
        if (error.includes('Request timed out')) {
            return (
                <VStack align="stretch" spacing={1}>
                    <Text>Request Timeout</Text>
                    <Text fontSize="sm">
                        Please check your internet connection and try again.
                    </Text>
                </VStack>
            );
        }

        // Default error format
        return (
            <Text color="red.500">
                {error}
            </Text>
        );
    };

    const handleCreateSecret = async () => {
        if (!projectDir) return;

        setLoading(true);
        try {
            // Create secret in Google Secret Manager
            await manager.createSecret(
                `${newSecret.environment}_${newSecret.secretKey}`,
                newSecret.value
            );

            addLog(`Secret '${newSecret.name}' created successfully`, 'success');

            // Create the secret config object
            const newSecretConfig = {
                name: newSecret.name,
                secretKey: `${newSecret.environment}_${newSecret.secretKey}`,
                targetPath: newSecret.targetPath,
                description: newSecret.description || undefined
            };

            // Update config file with new secret
            const updatedConfig: SecretsConfig = config ? {
                secrets: [...config.secrets, newSecretConfig]
            } : {
                secrets: [newSecretConfig]
            };

            setConfig(updatedConfig);

            // Save updated config to file
            await fetch('http://localhost:3001/api/config/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectDir,
                    config: updatedConfig
                }),
            });

            // Automatically fetch the newly created secret
            try {
                addLog(`Fetching newly created secret...`, 'info');
                await handleFetchSingleSecret(newSecretConfig);

                toast({
                    title: 'Success!',
                    description: `Secret '${newSecret.name}' was created and fetched successfully`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    position: 'top-right',
                });
            } catch (fetchError) {
                toast({
                    title: 'Secret created but fetch failed',
                    description: `The secret was created successfully, but couldn't be fetched automatically. You can fetch it manually from the Config Mode tab.`,
                    status: 'warning',
                    duration: 8000,
                    isClosable: true,
                    position: 'top-right',
                });
            }

            // Reset form
            setNewSecret({
                name: '',
                secretKey: '',
                targetPath: '',
                description: '',
                value: '',
                environment: 'development'
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            addLog(`Error: ${errorMessage}`, 'error');
            toast({
                title: 'Failed to create secret',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
                position: 'top-right',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadConfigFile = useCallback(async () => {
        if (!projectDir || loadAttempted.current) return;
        
        loadAttempted.current = true;
        
        try {
            const response = await fetch('http://localhost:3001/api/config/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectDir })
            });

            if (response.ok) {
                const config = await response.json();
                if (config) {
                    setConfig(config);
                    setDefaultIndex(1);
                    addLog('Secrets configuration loaded successfully', 'success');
                }
            }
        } catch (error) {
            console.debug('No existing secrets.config.json found');
        }
    }, [projectDir, addLog]);

    useEffect(() => {
        loadConfigFile();
    }, [loadConfigFile]);

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" display="flex" flexDirection="column">
            <Heading size="md" mb={4}>Secrets Manager</Heading>

            <Box mb={4}>
                <GoogleAuthStatus />
            </Box>

            <Tabs isFitted variant="enclosed" defaultIndex={defaultIndex}>
                <TabList mb="1em">
                    <Tab>Environment Mode</Tab>
                    <Tab>Config Mode</Tab>
                    <Tab>Create Secret</Tab>
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
                                    {config.secrets.map((secret, index) => {
                                        const status = fileStatuses[secret.name] || { exists: false };
                                        const bgColor = status.error ? 'red.50'
                                            : status.exists ? 'green.50'
                                                : 'yellow.50';

                                        return (
                                            <Box
                                                key={index}
                                                p={2}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                bg={bgColor}
                                                position="relative"
                                            >
                                                <VStack align="stretch" spacing={2}>
                                                    <HStack justify="space-between" align="start">
                                                        <VStack align="stretch" flex={1}>
                                                            <Text fontWeight="bold">{secret.name}</Text>
                                                            <Text fontSize="sm" color="gray.600">
                                                                {Array.isArray(secret.targetPath)
                                                                    ? secret.targetPath.map((path, i) => (
                                                                        <span key={i}>
                                                                            {path}
                                                                            {i < secret.targetPath.length - 1 && <br />}
                                                                        </span>
                                                                    ))
                                                                    : secret.targetPath}
                                                            </Text>
                                                            {secret.description && (
                                                                <Text fontSize="sm" color="gray.500">
                                                                    {secret.description}
                                                                </Text>
                                                            )}
                                                        </VStack>
                                                        <HStack>
                                                            {status.exists && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    colorScheme="blue"
                                                                    leftIcon={<RepeatIcon />}
                                                                    onClick={() => handleFetchSingleSecret(secret)}
                                                                    title="Refetch secret"
                                                                >
                                                                    Refetch
                                                                </Button>
                                                            )}
                                                            {status.error && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    colorScheme="red"
                                                                    leftIcon={<RepeatIcon />}
                                                                    onClick={() => handleFetchSingleSecret(secret)}
                                                                    title="Try again"
                                                                >
                                                                    Try Again
                                                                </Button>
                                                            )}
                                                            <Box>
                                                                {status.error ? (
                                                                    <WarningIcon color="red.500" />
                                                                ) : status.exists ? (
                                                                    <CheckIcon color="green.500" />
                                                                ) : (
                                                                    <SearchIcon color="yellow.500" />
                                                                )}
                                                            </Box>
                                                            {status.loading && (
                                                                <Spinner size="sm" />
                                                            )}
                                                        </HStack>
                                                    </HStack>
                                                    {status.error && (
                                                        <Box>
                                                            {formatErrorMessage(status.error)}
                                                        </Box>
                                                    )}
                                                </VStack>
                                            </Box>
                                        );
                                    })}
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

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <FormControl isRequired>
                                <FormLabel>Secret Name</FormLabel>
                                <Input
                                    value={newSecret.name}
                                    onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                                    placeholder="e.g., API Key"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Secret Key</FormLabel>
                                <Input
                                    value={newSecret.secretKey}
                                    onChange={(e) => setNewSecret({ ...newSecret, secretKey: e.target.value })}
                                    placeholder="e.g., API_KEY"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Target Path</FormLabel>
                                <Input
                                    value={newSecret.targetPath}
                                    onChange={(e) => setNewSecret({ ...newSecret, targetPath: e.target.value })}
                                    placeholder="e.g., .env"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Description</FormLabel>
                                <Textarea
                                    value={newSecret.description}
                                    onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                                    placeholder="Optional description of this secret"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Secret Value</FormLabel>
                                <Textarea
                                    value={newSecret.value}
                                    onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                                    placeholder="Enter the secret value"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Environment</FormLabel>
                                <Select
                                    value={newSecret.environment}
                                    onChange={(e) => setNewSecret({ ...newSecret, environment: e.target.value })}
                                >
                                    <option value="development">Development</option>
                                    <option value="staging">Staging</option>
                                    <option value="production">Production</option>
                                </Select>
                            </FormControl>

                            <Button
                                colorScheme="blue"
                                onClick={handleCreateSecret}
                                isLoading={loading}
                            >
                                Create Secret
                            </Button>
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
} 