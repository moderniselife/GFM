import { Box, Button, Text, VStack, HStack, useToast, Link } from "@chakra-ui/react";
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useState, useEffect } from "react";
import { Panel } from "./Panel";

export function GoogleAuthStatus() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isADCConfigured, setIsADCConfigured] = useState<boolean>(false);
    const [checking, setChecking] = useState(true);
    const toast = useToast();

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/gcloud/auth-status');
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated);
            setIsADCConfigured(data.isADCConfigured);
        } catch (error) {
            console.error('Failed to check auth status:', error);
            setIsAuthenticated(false);
            setIsADCConfigured(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const handleLogin = async () => {
        try {
            toast({
                title: "Opening Google login...",
                description: "Please complete the login in your browser",
                status: "info",
                duration: null,
                isClosable: true,
            });

            const response = await fetch('http://localhost:3001/api/gcloud/login', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            // Wait a moment before checking status to allow for browser auth
            setTimeout(async () => {
                await checkAuthStatus();
                toast({
                    title: "Authentication successful",
                    status: "success",
                    duration: 3000,
                });
            }, 1000);

        } catch (error) {
            toast({
                title: "Authentication failed",
                description: error instanceof Error ? error.message : "Unknown error occurred",
                status: "error",
                duration: 3000,
            });
        }
    };

    const handleSetupADC = async () => {
        try {
            toast({
                title: "Setting up ADC...",
                description: "Please complete the setup in your browser",
                status: "info",
                duration: null,
                isClosable: true,
            });

            const response = await fetch('http://localhost:3001/api/gcloud/setup-adc', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('ADC setup failed');
            }

            // Wait a moment before checking status to allow for browser auth
            setTimeout(async () => {
                await checkAuthStatus();
                toast({
                    title: "ADC configured successfully",
                    status: "success",
                    duration: 3000,
                });
            }, 1000);

        } catch (error) {
            toast({
                title: "ADC setup failed",
                description: error instanceof Error ? error.message : "Unknown error occurred",
                status: "error",
                duration: 3000,
            });
        }
    };

    if (checking) {
        return (
            <Box p={4} borderRadius="lg" boxShadow="sm" bg="white">
                <Text display="flex" alignItems="center" gap={2}>
                    <span className="loading loading-spinner loading-sm"></span>
                    Checking authentication status...
                </Text>
            </Box>
        );
    }

    return (
        <Panel title="Authentication Status" noShadow noBorder>
            <VStack spacing={4} align="stretch">
                <Box>
                    <VStack spacing={3} align="stretch">
                        <HStack
                            p={3}
                            bg={isAuthenticated ? 'green.50' : 'red.50'}
                            borderRadius="md"
                        >
                            <Box fontSize="xl">
                                {isAuthenticated ? '🔒' : '🔓'}
                            </Box>
                            <Box flex="1">
                                <Text fontWeight="medium">
                                    Google Cloud Status
                                </Text>
                                <Text fontSize="sm" color={isAuthenticated ? 'green.600' : 'red.600'}>
                                    {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                                </Text>
                            </Box>
                        </HStack>

                        <HStack
                            p={3}
                            bg={isADCConfigured ? 'green.50' : 'red.50'}
                            borderRadius="md"
                        >
                            <Box fontSize="xl">
                                {isADCConfigured ? '⚙️' : '⚠️'}
                            </Box>
                            <Box flex="1">
                                <Text fontWeight="medium">
                                    ADC Status
                                </Text>
                                <Text fontSize="sm" color={isADCConfigured ? 'green.600' : 'red.600'}>
                                    {isADCConfigured ? 'Configured' : 'Not configured'}
                                </Text>
                            </Box>
                        </HStack>
                    </VStack>
                </Box>

                <HStack spacing={2} justify="center">
                    {!isAuthenticated && (
                        <Button
                            colorScheme="blue"
                            onClick={handleLogin}
                            size="md"
                            leftIcon={<span>🔑</span>}
                            w="full"
                        >
                            Login to Google Cloud
                        </Button>
                    )}
                    {isAuthenticated && !isADCConfigured && (
                        <Button
                            colorScheme="green"
                            onClick={handleSetupADC}
                            size="md"
                            leftIcon={<span>⚙️</span>}
                            w="full"
                        >
                            Setup ADC
                        </Button>
                    )}
                </HStack>

                <VStack spacing={2} pt={2}>
                    <Text fontSize="sm" color="gray.500">
                        🌐 Authentication will open in your default browser
                    </Text>
                    <Link
                        href="https://cloud.google.com/docs/authentication/provide-credentials-adc"
                        isExternal
                        color="blue.500"
                        fontSize="sm"
                        display="flex"
                        alignItems="center"
                    >
                        📚 Learn more about Application Default Credentials
                        <ExternalLinkIcon ml={1} />
                    </Link>
                </VStack>
            </VStack>
        </Panel>
    );
} 