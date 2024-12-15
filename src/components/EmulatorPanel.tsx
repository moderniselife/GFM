import { Box, Heading } from "@chakra-ui/react";
import { Button } from "@chakra-ui/button";
import { CheckboxGroup, Checkbox, Wrap, WrapItem } from "@chakra-ui/react";
import { HStack } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import { useState, useMemo, useCallback, useEffect } from "react";
import FirebaseManager from "../lib/FirebaseManager";
import { useProject } from '../contexts/ProjectContext';
import { useLogs } from '../contexts/LogsContext';
import { Panel } from './Panel';

export function EmulatorPanel() {
    const [services, setServices] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const { projectDir } = useProject();
    const { addLog } = useLogs();

    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    const checkRunningEmulators = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:3001/api/firebase/running-emulators`);
            if (!response.ok) {
                throw new Error('Failed to check running emulators');
            }
            const { runningEmulators } = await response.json();
            setServices(runningEmulators);
        } catch (error) {
            console.error('Failed to check running emulators:', error);
        }
    }, []);

    useEffect(() => {
        if (projectDir) {
            checkRunningEmulators();
        }
    }, [projectDir, checkRunningEmulators]);

    const handleEmulatorAction = async (action: "start" | "stop" | "restart") => {
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

        // Create WebSocket connection
        const ws = new WebSocket('ws://localhost:3001/api/gfm/logs');
        const clientId = Math.random().toString(36).substring(7);

        // Wait for WebSocket connection to be established
        await new Promise<void>((resolve) => {
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'register', clientId }));
                resolve();
            };
        });

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'log':
                        addLog(data.message, data.level);
                        // Update the condition to check for emulator ready message
                        if (
                            data.message === 'No emulators were running' ||
                            data.message === 'Emulators are already running' ||
                            data.message === 'Emulators stopped successfully' ||
                            data.message.includes('All emulators ready!') ||
                            data.message.includes('Shutting down emulators.')
                        ) {
                            setLoading(false);
                        }
                        break;
                    case 'complete':
                        addLog(data.message, 'success');
                        setLoading(false);
                        checkRunningEmulators();
                        break;
                    case 'error':
                        addLog(data.message, 'error');
                        setLoading(false);
                        break;
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addLog('WebSocket connection error', 'error');
            setLoading(false);
        };

        try {
            const response = await fetch(`http://localhost:3001/api/firebase/emulators?dir=${encodeURIComponent(projectDir)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    services,
                    clientId,
                    projectId: await manager.getCurrentProjectId()
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Failed to ${action} emulators`);
            }
        } catch (error) {
            toast({
                title: `Failed to ${action} emulators`,
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: "error",
                duration: 3000,
            });
            ws.close();
            setLoading(false);
        }
    };

    return (
        <Panel title="Emulators">
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" display="flex" flexDirection="column">
                <Heading size="md">Emulators</Heading>
                <CheckboxGroup
                    colorScheme="green"
                    value={services}
                    onChange={(values) => setServices(values as string[])}
                >
                    <Wrap spacing={4} mt={4}>
                        <WrapItem>
                            <Checkbox value="hosting">Hosting</Checkbox>
                        </WrapItem>
                        <WrapItem>
                            <Checkbox value="functions">Functions</Checkbox>
                        </WrapItem>
                        <WrapItem>
                            <Checkbox value="firestore">Firestore</Checkbox>
                        </WrapItem>
                        <WrapItem>
                            <Checkbox value="storage">Storage</Checkbox>
                        </WrapItem>
                    </Wrap>
                </CheckboxGroup>
                <HStack mt="auto" pt={4} spacing={4} width="100%">
                    <Button
                        flex={1}
                        colorScheme="green"
                        onClick={() => handleEmulatorAction("start")}
                        isLoading={loading}>
                        Start
                    </Button>
                    <Button
                        flex={1}
                        colorScheme="red"
                        onClick={() => handleEmulatorAction("stop")}
                        isLoading={loading}>
                        Stop
                    </Button>
                    <Button
                        flex={1}
                        colorScheme="blue"
                        onClick={() => handleEmulatorAction("restart")}
                        isLoading={loading}>
                        Restart
                    </Button>
                </HStack>
            </Box>
        </Panel>
    );
}