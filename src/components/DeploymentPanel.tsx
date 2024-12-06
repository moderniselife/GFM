import { Box, Heading } from '@chakra-ui/react';
import { Button } from '@chakra-ui/button';
import { VStack, HStack, Wrap, WrapItem } from '@chakra-ui/layout';
import { Checkbox } from '@chakra-ui/checkbox';
import { useToast } from "@chakra-ui/toast";
import { useState, useEffect, useMemo, useRef } from 'react';
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";

export function DeploymentPanel() {
    const [options, setOptions] = useState({
        hosting: false,
        storage: false,
        functions: false,
        rules: false,
        all: false,
    });
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();
    const deploymentRef = useRef<AbortController | null>(null);

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    useEffect(() => {
        // Reset state when directory changes
        setLoading(false);
        setOptions({
            hosting: false,
            storage: false,
            functions: false,
            rules: false,
            all: false,
        });
    }, [projectDir]);

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

        setLoading(true);
        deploymentRef.current = new AbortController();

        try {
            await manager.deploy(options, deploymentRef.current.signal);
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

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" display="flex" flexDirection="column">
            <Heading size="md">Deployment</Heading>
            <Wrap spacing={4} mt={4}>
                <WrapItem>
                    <Checkbox
                        isChecked={options.all}
                        onChange={(e) => setOptions({ ...options, all: e.target.checked })}
                    >
                        Deploy All
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={options.hosting}
                        onChange={(e) => setOptions({ ...options, hosting: e.target.checked })}
                        isDisabled={options.all}
                    >
                        Hosting
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={options.functions}
                        onChange={(e) => setOptions({ ...options, functions: e.target.checked })}
                        isDisabled={options.all}
                    >
                        Functions
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={options.storage}
                        onChange={(e) => setOptions({ ...options, storage: e.target.checked })}
                        isDisabled={options.all}
                    >
                        Storage
                    </Checkbox>
                </WrapItem>
                <WrapItem>
                    <Checkbox
                        isChecked={options.rules}
                        onChange={(e) => setOptions({ ...options, rules: e.target.checked })}
                        isDisabled={options.all}
                    >
                        Rules
                    </Checkbox>
                </WrapItem>
            </Wrap>
            <HStack mt="auto" pt={4} spacing={2} width="100%">
                <Button
                    flex={1}
                    colorScheme="blue"
                    onClick={handleDeploy}
                    isLoading={loading}
                    isDisabled={!options.all && !Object.values(options).some((v) => v)}
                >
                    Deploy
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
    );
} 