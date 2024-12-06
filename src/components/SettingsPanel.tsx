import {
    Box, VStack, Heading, FormControl, FormLabel, Input, Button, useToast, Text,
    Alert, AlertIcon, Divider, List, ListItem, HStack, IconButton, Radio, RadioGroup,
    useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
    ModalCloseButton, Badge
} from "@chakra-ui/react";
import { DeleteIcon, AddIcon, CheckIcon, WarningIcon, RepeatIcon } from '@chakra-ui/icons';
import { useState, useEffect } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";

interface ServiceAccount {
    projectId: string;
    clientEmail: string;
    active: boolean;
}

interface ProjectSettings {
    measurementId?: string;
    serviceAccounts?: ServiceAccount[];
}

export function SettingsPanel() {
    const [serviceKey, setServiceKey] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [measurementId, setMeasurementId] = useState('');
    const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
    const { projectDir, triggerServiceKeyRefresh } = useProject();
    const { addLog } = useLogs();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Load saved settings
    useEffect(() => {
        loadSettings();
    }, [projectDir]);

    const loadSettings = async () => {
        if (!projectDir) return;
        try {
            const response = await fetch(
                `http://localhost:3001/api/project/settings?projectDir=${encodeURIComponent(projectDir)}`
            );
            if (response.ok) {
                const settings: ProjectSettings = await response.json();
                if (settings.measurementId) {
                    setMeasurementId(settings.measurementId);
                }
                if (settings.serviceAccounts) {
                    setServiceAccounts(settings.serviceAccounts);
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleServiceKeyUpload = async () => {
        if (!serviceKey || !projectDir) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('serviceKey', serviceKey);
            formData.append('projectDir', projectDir);

            const response = await fetch('http://localhost:3001/api/firebase/service-account/add', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload service account key');
            }

            await loadSettings();
            triggerServiceKeyRefresh();
            setServiceKey(null);
            onClose();

            addLog('Service account key added successfully', 'success');
            toast({
                title: 'Success',
                description: 'Service account key added successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            addLog(`Failed to add service account key: ${error}`, 'error');
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to add service account key',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSetActiveAccount = async (projectId: string) => {
        try {
            const response = await fetch('http://localhost:3001/api/firebase/service-account/set-active', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectDir,
                    projectId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to set active service account');
            }

            await loadSettings();
            triggerServiceKeyRefresh();

            toast({
                title: 'Success',
                description: 'Active service account updated',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to set active service account',
                status: 'error',
                duration: 5000,
            });
        }
    };

    const handleDeleteAccount = async (projectId: string) => {
        try {
            const response = await fetch('http://localhost:3001/api/firebase/service-account/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectDir,
                    projectId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete service account');
            }

            await loadSettings();
            triggerServiceKeyRefresh();

            toast({
                title: 'Success',
                description: 'Service account deleted',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete service account',
                status: 'error',
                duration: 5000,
            });
        }
    };

    const saveSettings = async () => {
        if (!projectDir) return;

        try {
            const response = await fetch('http://localhost:3001/api/project/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectDir,
                    settings: {
                        measurementId,
                        serviceAccounts // Include existing service accounts in settings
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            toast({
                title: 'Success',
                description: 'Settings saved successfully',
                status: 'success',
                duration: 3000,
            });
            addLog('Project settings saved successfully', 'success');
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save settings',
                status: 'error',
                duration: 5000,
            });
            addLog(`Failed to save settings: ${error}`, 'error');
        }
    };

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
            <VStack spacing={6} align="stretch">
                <Box>
                    <HStack justify="space-between" mb={4}>
                        <Heading size="sm">Firebase Service Accounts</Heading>
                        <Button leftIcon={<AddIcon />} size="sm" onClick={onOpen}>
                            Add Account
                        </Button>
                    </HStack>

                    {serviceAccounts.length === 0 ? (
                        <Alert status="info">
                            <AlertIcon />
                            No service accounts configured. Add one to get started.
                        </Alert>
                    ) : (
                        <List spacing={3}>
                            {serviceAccounts.map((account) => (
                                <ListItem
                                    key={account.projectId}
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    bg={account.active ? 'green.50' : undefined}
                                >
                                    <HStack justify="space-between">
                                        <VStack align="start" spacing={1}>
                                            <HStack>
                                                <Text fontWeight="bold">{account.projectId}</Text>
                                                {account.active && (
                                                    <Badge colorScheme="green">Active</Badge>
                                                )}
                                            </HStack>
                                            <Text fontSize="sm" color="gray.600">
                                                {account.clientEmail}
                                            </Text>
                                        </VStack>
                                        <HStack>
                                            {account.active ? (
                                                <Button
                                                    size="sm"
                                                    colorScheme="blue"
                                                    leftIcon={<RepeatIcon />}
                                                    onClick={() => handleSetActiveAccount(account.projectId)}
                                                    title="Reactivate service account"
                                                >
                                                    Reactivate
                                                </Button>
                                            ) : (
                                                <IconButton
                                                    aria-label="Set as active"
                                                    icon={<CheckIcon />}
                                                    size="sm"
                                                    colorScheme="green"
                                                    onClick={() => handleSetActiveAccount(account.projectId)}
                                                />
                                            )}
                                            <IconButton
                                                aria-label="Delete account"
                                                icon={<DeleteIcon />}
                                                size="sm"
                                                colorScheme="red"
                                                onClick={() => handleDeleteAccount(account.projectId)}
                                            />
                                        </HStack>
                                    </HStack>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                <Modal isOpen={isOpen} onClose={onClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Add Service Account</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={6}>
                            <FormControl>
                                <FormLabel>Service Account Key (JSON)</FormLabel>
                                <Input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setServiceKey(e.target.files?.[0] || null)}
                                />
                                <Button
                                    mt={4}
                                    colorScheme="blue"
                                    onClick={handleServiceKeyUpload}
                                    isLoading={uploading}
                                    isDisabled={!serviceKey}
                                    width="100%"
                                >
                                    Upload Service Account Key
                                </Button>
                            </FormControl>
                        </ModalBody>
                    </ModalContent>
                </Modal>

                <Divider />

                <Box>
                    <Heading size="sm" mb={4}>Google Analytics Settings</Heading>
                    <FormControl>
                        <FormLabel>GA4 Property ID</FormLabel>
                        <Input
                            placeholder="G-XXXXXXXXXX"
                            value={measurementId}
                            onChange={(e) => setMeasurementId(e.target.value)}
                        />
                        <Text fontSize="sm" color="gray.500" mt={1}>
                            Your GA4 Measurement ID starts with 'G-' and can be found in your Google Analytics property settings
                        </Text>
                    </FormControl>
                </Box>

                <Button colorScheme="blue" onClick={saveSettings}>
                    Save Settings
                </Button>
            </VStack>
        </Box>
    );
} 