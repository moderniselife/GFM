import { Box, Button, Text, VStack, HStack, useToast, Link } from "@chakra-ui/react";
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useState, useEffect } from "react";

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
        return <Text>Checking authentication status...</Text>;
    }

    return (
        <VStack spacing={2} align="stretch">
            <Box>
                <Text>
                    Google Cloud Status: {isAuthenticated ? 
                        "✅ Authenticated" : 
                        "❌ Not authenticated"}
                </Text>
                <Text>
                    ADC Status: {isADCConfigured ? 
                        "✅ Configured" : 
                        "❌ Not configured"}
                </Text>
            </Box>
            <HStack spacing={2}>
                {!isAuthenticated && (
                    <Button 
                        colorScheme="blue" 
                        onClick={handleLogin}
                        size="sm"
                    >
                        Login to Google Cloud
                    </Button>
                )}
                {isAuthenticated && !isADCConfigured && (
                    <Button 
                        colorScheme="green" 
                        onClick={handleSetupADC}
                        size="sm"
                    >
                        Setup ADC
                    </Button>
                )}
            </HStack>
            <Text fontSize="sm" color="gray.500">
                Note: Authentication will open in your default browser
            </Text>
            <Link 
                href="https://cloud.google.com/docs/authentication/provide-credentials-adc" 
                isExternal
                color="blue.500"
                fontSize="sm"
            >
                Learn more about Application Default Credentials <ExternalLinkIcon mx="2px" />
            </Link>
        </VStack>
    );
} 