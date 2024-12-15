import { Box, Heading, Text, VStack, HStack, Checkbox, Button, useToast, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import FirebaseManager from "../lib/FirebaseManager";
import { readFileSync } from 'fs';
import { join } from 'path';
import { Panel } from './Panel';

interface FirebaseConfig {
    hosting?: {
        site?: string;
        target?: string;
        public?: string;
    }[] | {
        site?: string;
        target?: string;
        public?: string;
    };
    functions?: {
        source?: string;
        codebase?: string;
    }[] | {
        source?: string;
        codebase?: string;
    };
    storage?: {
        rules?: string;
    }[] | {
        rules?: string;
    };
    firestore?: {
        rules?: string;
        indexes?: string;
    };
}

interface DeploymentOption {
    type: string;
    name: string;
    path?: string;
    checked: boolean;
}

export function AdvancedDeploymentPanel() {
    const [config, setConfig] = useState<FirebaseConfig | null>(null);
    const [deploymentOptions, setDeploymentOptions] = useState<DeploymentOption[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();
    const deploymentRef = useRef<AbortController | null>(null);

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    useEffect(() => {
        loadFirebaseConfig();
    }, [projectDir]);

    const loadFirebaseConfig = async () => {
        if (!projectDir) return;

        try {
            const parsedConfig = await manager.getFirebaseConfig();
            setConfig(parsedConfig);

            // Convert config to deployment options
            const options: DeploymentOption[] = [];

            // Handle hosting
            if (parsedConfig.hosting) {
                const hostings = Array.isArray(parsedConfig.hosting)
                    ? parsedConfig.hosting
                    : [parsedConfig.hosting];

                hostings.forEach((hosting, index) => {
                    options.push({
                        type: 'hosting',
                        name: hosting.site || hosting.target || `hosting-${index}`,
                        path: hosting.public,
                        checked: false
                    });
                });
            }

            // Handle functions
            if (parsedConfig.functions) {
                const functions = Array.isArray(parsedConfig.functions)
                    ? parsedConfig.functions
                    : [parsedConfig.functions];

                functions.forEach((func, index) => {
                    options.push({
                        type: 'functions',
                        name: func.codebase || `functions-${index}`,
                        path: func.source,
                        checked: false
                    });
                });
            }

            // Handle storage rules
            if (parsedConfig.storage) {
                const storages = Array.isArray(parsedConfig.storage)
                    ? parsedConfig.storage
                    : [parsedConfig.storage];

                storages.forEach((storage, index) => {
                    if (storage.rules) {
                        options.push({
                            type: 'storage',
                            name: `storage-rules-${index}`,
                            path: storage.rules,
                            checked: false
                        });
                    }
                });
            }

            // Handle Firestore rules and indexes
            if (parsedConfig.firestore) {
                if (parsedConfig.firestore.rules) {
                    options.push({
                        type: 'firestore',
                        name: 'firestore-rules',
                        path: parsedConfig.firestore.rules,
                        checked: false
                    });
                }
                if (parsedConfig.firestore.indexes) {
                    options.push({
                        type: 'firestore',
                        name: 'firestore-indexes',
                        path: parsedConfig.firestore.indexes,
                        checked: false
                    });
                }
            }

            setDeploymentOptions(options);
        } catch (error) {
            console.error('Error loading firebase.json:', error);
            toast({
                title: "Error loading configuration",
                description: "Could not load firebase.json",
                status: "error",
                duration: 5000,
            });
        }
    };

    const handleToggleOption = (index: number) => {
        setDeploymentOptions(prev => prev.map((option, i) =>
            i === index ? { ...option, checked: !option.checked } : option
        ));
    };

    const handleToggleAll = (type: string, checked: boolean) => {
        setDeploymentOptions(prev => prev.map(option =>
            option.type === type ? { ...option, checked } : option
        ));
    };

    const handleDeploy = async () => {
        if (!projectDir) {
            toast({
                title: "No directory selected",
                description: "Please select a project directory first",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        const selectedOptions = deploymentOptions.filter(opt => opt.checked);
        if (selectedOptions.length === 0) {
            toast({
                title: "No options selected",
                description: "Please select at least one deployment option",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        setLoading(true);
        deploymentRef.current = new AbortController();

        try {
            // Convert selected options to deployment options format
            // const deployOptions: { [key: string]: boolean } = {
            //     hosting: selectedOptions.some(opt => opt.type === 'hosting'),
            //     functions: selectedOptions.some(opt => opt.type === 'functions'),
            //     storage: selectedOptions.some(opt => opt.type === 'storage'),
            //     firestore: selectedOptions.some(opt => opt.type === 'firestore'),
            // };

            // await manager.deploy(deployOptions, deploymentRef.current.signal);
            const selectedOptions = deploymentOptions.filter(opt => opt.checked);
            const deployTargets: { [key: string]: string[] } = {};
            const deployOptions: { [key: string]: boolean } = {};

            // Group selected options by type
            selectedOptions.forEach(option => {
                if (!deployTargets[option.type]) {
                    deployTargets[option.type] = [];
                }
                deployTargets[option.type].push(option.name);
                deployOptions[option.type] = true;
            });

            await manager.deploy(deployOptions, deploymentRef.current.signal, deployTargets);
            toast({
                title: 'Deployment successful',
                status: 'success',
            });
        } catch (error: any) {
            if (error.name === 'AbortError') {
                toast({
                    title: 'Deployment cancelled',
                    status: 'info',
                });
                addLog('Deployment cancelled by user', 'info');
            } else {
                toast({
                    title: 'Deployment failed',
                    description: error.message,
                    status: 'error',
                });
            }
        } finally {
            setLoading(false);
            deploymentRef.current = null;
        }
    };

    const handleCancel = () => {
        if (deploymentRef.current) {
            deploymentRef.current.abort();
        }
    };

    const groupedOptions = useMemo(() => {
        return deploymentOptions.reduce((acc, option) => {
            if (!acc[option.type]) {
                acc[option.type] = [];
            }
            acc[option.type].push(option);
            return acc;
        }, {} as { [key: string]: DeploymentOption[] });
    }, [deploymentOptions]);

    if (!config) {
        return (
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
                <Text>No firebase.json configuration found</Text>
            </Box>
        );
    }

    return (
        <Panel title="Advanced Deployment">
            <Box>
                <Accordion allowMultiple>
                    {Object.entries(groupedOptions).map(([type, options]) => (
                        <AccordionItem key={type}>
                            <AccordionButton>
                                <Box flex="1" textAlign="left">
                                    <Text textTransform="capitalize">{type}</Text>
                                </Box>
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel>
                                <VStack align="stretch" spacing={2}>
                                    <Checkbox
                                        isChecked={options.every(opt => opt.checked)}
                                        isIndeterminate={options.some(opt => opt.checked) && !options.every(opt => opt.checked)}
                                        onChange={(e) => handleToggleAll(type, e.target.checked)}
                                    >
                                        Select All {type}
                                    </Checkbox>
                                    {options.map((option, index) => (
                                        <Checkbox
                                            key={`${option.type}-${option.name}`}
                                            isChecked={option.checked}
                                            onChange={() => handleToggleOption(deploymentOptions.findIndex(opt =>
                                                opt.type === option.type && opt.name === option.name
                                            ))}
                                            ml={4}
                                        >
                                            {option.name}
                                            {option.path && (
                                                <Text fontSize="sm" color="gray.500" ml={2} as="span">
                                                    ({option.path})
                                                </Text>
                                            )}
                                        </Checkbox>
                                    ))}
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>

                <HStack mt="auto" pt={4} spacing={2} width="100%">
                    <Button
                        flex={1}
                        colorScheme="blue"
                        onClick={handleDeploy}
                        isLoading={loading}
                        isDisabled={!deploymentOptions.some(opt => opt.checked)}
                    >
                        Deploy Selected
                    </Button>
                    {loading && (
                        <Button
                            flex={1}
                            colorScheme="red"
                            onClick={handleCancel}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                    )}
                </HStack>
            </Box>
        </Panel>
    );
}