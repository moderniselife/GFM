import { Box, Button, FormControl, FormLabel, Heading, Input, useToast, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { useProject } from "../contexts/ProjectContext";

export function SettingsPanel() {
    const [loading, setLoading] = useState(false);
    const { projectDir } = useProject();
    const toast = useToast();

    const handleServiceAccountUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileContent = await file.text();
            const serviceAccount = JSON.parse(fileContent);

            const response = await fetch('http://localhost:3001/api/firebase/set-service-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: serviceAccount.project_id,
                    serviceAccount
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to set service account');
            }

            toast({
                title: 'Success',
                description: 'Service account configured successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: 'Error setting service account',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={4}>Settings</Heading>
            <VStack spacing={4} align="stretch">
                <FormControl>
                    <FormLabel>Service Account Key</FormLabel>
                    <Input
                        type="file"
                        accept=".json"
                        onChange={handleServiceAccountUpload}
                        disabled={loading}
                    />
                </FormControl>
            </VStack>
        </Box>
    );
} 