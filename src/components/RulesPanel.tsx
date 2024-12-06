import { Box, Heading, HStack, Select, Button, useToast, Text, Spinner, VStack, Alert, AlertIcon, AlertTitle, AlertDescription, useColorMode } from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { xcodeLight, xcodeDark } from '@uiw/codemirror-theme-xcode';
import { ErrorBoundary } from "./ErrorBoundary";
import FirebaseManager from "../lib/FirebaseManager";
import { Panel } from "./Panel";
type RuleType = 'firestore' | 'storage';
type EditorTheme = 'system' | 'github' | 'vscode' | 'xcode' | 'dracula';

interface RulesFile {
    content: string;
    etag: string;
}

export function RulesPanel() {
    const [ruleType, setRuleType] = useState<RuleType>('firestore');
    const [rules, setRules] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [etag, setEtag] = useState<string>('');
    const [hasServiceAccount, setHasServiceAccount] = useState(false);
    const [editorTheme, setEditorTheme] = useState<EditorTheme>('system');
    const { projectDir, serviceKeyAdded } = useProject();
    const { addLog } = useLogs();
    const toast = useToast();
    const { colorMode } = useColorMode();
    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

    const getTheme = () => {
        switch (editorTheme) {
            case 'system':
                return colorMode === 'dark' ? githubDark : githubLight;
            case 'github':
                return colorMode === 'dark' ? githubDark : githubLight;
            case 'vscode':
                return vscodeDark;
            case 'xcode':
                return colorMode === 'dark' ? xcodeDark : xcodeLight;
            case 'dracula':
                return dracula;
            default:
                return colorMode === 'dark' ? githubDark : githubLight;
        }
    };

    const fetchRules = async () => {
        if (!projectDir) return;

        setLoading(true);
        try {
            const projectId = await manager.getCurrentProjectId();
            const response = await fetch(
                `http://localhost:3001/api/firebase/rules/get?projectId=${encodeURIComponent(projectId)}&type=${ruleType}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch rules');
            }

            const data: RulesFile = await response.json();
            setRules(data.content[0].content);
            setEtag(data.etag);
            addLog(`Fetched ${ruleType} rules successfully`, 'success');
        } catch (error) {
            toast({
                title: 'Error fetching rules',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'error',
                duration: 5000,
            });
            addLog(`Failed to fetch rules: ${error}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveRules = async () => {
        if (!projectDir) return;

        setSaving(true);
        try {
            const projectId = await manager.getCurrentProjectId();
            const response = await fetch('http://localhost:3001/api/firebase/rules/set', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId,
                    type: ruleType,
                    content: rules,
                    etag
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save rules');
            }

            const data: RulesFile = await response.json();
            setEtag(data.etag);

            toast({
                title: 'Success',
                description: 'Rules saved successfully',
                status: 'success',
                duration: 3000,
            });
            addLog(`Saved ${ruleType} rules successfully`, 'success');
        } catch (error) {
            toast({
                title: 'Error saving rules',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'error',
                duration: 5000,
            });
            addLog(`Failed to save rules: ${error}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const checkServiceAccount = async () => {
        if (!projectDir) return;
        try {
            const projectId = await manager.getCurrentProjectId();
            const response = await fetch(
                `http://localhost:3001/api/firebase/service-account/check?projectId=${encodeURIComponent(projectId)}`
            );
            const { hasServiceAccount } = await response.json();
            setHasServiceAccount(hasServiceAccount);
        } catch (error) {
            setHasServiceAccount(false);
        }
    };

    useEffect(() => {
        fetchRules();
        checkServiceAccount();
    }, [ruleType, projectDir, serviceKeyAdded]);

    if (!hasServiceAccount) {
        return (
            <Panel title="Security Rules Editor">
                <VStack spacing={4} align="stretch">
                    <Heading size="md">Security Rules Editor</Heading>
                    <Alert status="warning">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Service Account Required</AlertTitle>
                            <AlertDescription>
                                Please add a service account in the settings to access security rules.
                            </AlertDescription>
                        </Box>
                    </Alert>
                </VStack>
            </Panel>
        );
    }

    return (
        <Panel title="Security Rules Editor" buttons={
            <HStack spacing={4}>
                <Select
                    size="sm"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value as EditorTheme)}
                    width="150px"
                >
                    <option value="system">System Theme</option>
                    <option value="github">GitHub</option>
                    <option value="vscode">VS Code</option>
                    <option value="xcode">Xcode</option>
                    <option value="dracula">Dracula</option>
                </Select>
                <Select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as RuleType)}
                    width="200px"
                >
                    <option value="firestore">Firestore Rules</option>
                    <option value="storage">Storage Rules</option>
                </Select>
                <Button
                    colorScheme="blue"
                    onClick={saveRules}
                    isLoading={saving}
                >
                    Save Rules
                </Button>
            </HStack>
        }>

            <Box flex="1" position="relative" borderWidth="1px" borderRadius="md">
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Spinner />
                    </Box>
                ) : (
                    <ErrorBoundary>
                        <Box height="100%" overflow="hidden">
                            <CodeMirror
                                value={rules}
                                height="100%"
                                theme={getTheme()}
                                extensions={[javascript()]}
                                onChange={(value) => setRules(value)}
                                basicSetup={{
                                    lineNumbers: true,
                                    highlightActiveLineGutter: true,
                                    highlightSpecialChars: true,
                                    history: true,
                                    foldGutter: true,
                                    drawSelection: true,
                                    dropCursor: true,
                                    allowMultipleSelections: true,
                                    indentOnInput: true,
                                    syntaxHighlighting: true,
                                    bracketMatching: true,
                                    closeBrackets: true,
                                    autocompletion: true,
                                    rectangularSelection: true,
                                    crosshairCursor: true,
                                    highlightActiveLine: true,
                                    highlightSelectionMatches: true,
                                    closeBracketsKeymap: true,
                                    defaultKeymap: true,
                                    searchKeymap: true,
                                    historyKeymap: true,
                                    foldKeymap: true,
                                    completionKeymap: true,
                                    lintKeymap: true,
                                }}
                            />
                        </Box>
                    </ErrorBoundary>
                )}
            </Box>
        </Panel>
    );
} 