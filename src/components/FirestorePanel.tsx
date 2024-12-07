import { Box, Heading, VStack, HStack, Input, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useToast, IconButton, Flex, Select, ButtonGroup, Editable, EditableInput, EditablePreview } from "@chakra-ui/react";
import { ChevronRightIcon, DeleteIcon, EditIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { useState, useEffect, useMemo } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import FirebaseManager from "../lib/FirebaseManager";
import { JSONTree } from 'react-json-tree';
import { Panel } from "./Panel";

interface FirestoreDocument {
    id: string;
    data: any;
    path: string;
    subcollections: string[];
}

interface PaginationData {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

// Add this theme for the JSON tree
const jsonTreeTheme = {
    scheme: 'chakra',
    base00: '#f8f9fa', // background
    base0B: '#2a4365', // string/date
    base0C: '#319795', // number
    base0D: '#3182ce', // boolean
    base0E: '#805ad5', // null
    base09: '#dd6b20', // key
};

interface ExpandableRowProps {
    doc: FirestoreDocument;
    onNavigate: (docId: string, subcollection?: string) => void;
    onDelete: (docId: string) => void;
}

function ExpandableRow({ doc, onNavigate, onDelete }: ExpandableRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <Tr>
                <Td>
                    <HStack>
                        <IconButton
                            aria-label="Toggle expand"
                            icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={() => setIsExpanded(!isExpanded)}
                        />
                        <Text>{doc.id}</Text>
                    </HStack>
                </Td>
                <Td>
                    <Text noOfLines={isExpanded ? undefined : 2}>
                        {JSON.stringify(doc.data)}
                    </Text>
                </Td>
                <Td>
                    <HStack spacing={2}>
                        {doc.subcollections.length > 0 && (
                            <IconButton
                                aria-label="Navigate to subcollections"
                                icon={<ChevronRightIcon />}
                                size="xs"
                                onClick={() => onNavigate(doc.id, undefined)}
                            />
                        )}
                        <IconButton
                            aria-label="Delete document"
                            icon={<DeleteIcon />}
                            size="xs"
                            colorScheme="red"
                            onClick={() => onDelete(doc.id)}
                        />
                    </HStack>
                </Td>
            </Tr>
            {isExpanded && (
                <Tr>
                    <Td colSpan={3} backgroundColor="gray.50" p={4}>
                        <VStack align="stretch" spacing={4}>
                            <Box maxH="400px" overflowY="auto">
                                <JSONTree
                                    data={doc.data}
                                    theme={jsonTreeTheme}
                                    shouldExpandNode={() => true}
                                    hideRoot
                                />
                            </Box>
                            {doc.subcollections.length > 0 && (
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Subcollections:</Text>
                                    <HStack spacing={2}>
                                        {doc.subcollections.map((subcollection) => (
                                            <Button
                                                key={subcollection}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onNavigate(doc.id, subcollection)}
                                            >
                                                {subcollection}
                                            </Button>
                                        ))}
                                    </HStack>
                                </Box>
                            )}
                        </VStack>
                    </Td>
                </Tr>
            )}
        </>
    );
}

interface EditableJSONProps {
    data: any;
    path: string[];
    onUpdate: (newValue: any) => void;
}

function EditableJSON({ data, path, onUpdate }: EditableJSONProps) {
    const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>(() => {
        const initialState: { [key: string]: boolean } = {};

        const initializeCollapsed = (obj: any, currentPath: string[] = []) => {
            if (typeof obj === 'object' && obj !== null) {
                // Don't collapse root level (empty path)
                const pathKey = currentPath.join('.');
                if (currentPath.length > 0) {
                    initialState[pathKey] = true;
                }

                // Recursively process nested objects
                Object.entries(obj).forEach(([key, value]) => {
                    initializeCollapsed(value, [...currentPath, key]);
                });
            }
        };

        initializeCollapsed(data);
        return initialState;
    });

    const handleValueChange = (newValue: string, currentPath: string[]) => {
        const updatedData = { ...data };
        let current = updatedData;

        // Navigate to the nested property
        for (let i = 0; i < currentPath.length - 1; i++) {
            current = current[currentPath[i]];
        }

        // Update the value, attempting to parse as JSON if possible
        try {
            current[currentPath[currentPath.length - 1]] = JSON.parse(newValue);
        } catch {
            current[currentPath[currentPath.length - 1]] = newValue;
        }

        onUpdate(updatedData);
    };

    const toggleCollapse = (pathKey: string) => {
        setCollapsed(prev => ({
            ...prev,
            [pathKey]: !prev[pathKey]
        }));
    };

    const renderValue = (value: any, currentPath: string[]) => {
        if (value === null) return "null";

        if (typeof value === "object") {
            const pathKey = currentPath.join('.');
            const isCollapsed = collapsed[pathKey];

            return (
                <Box>
                    <Box display="flex" alignItems="center">
                        <IconButton
                            aria-label="Toggle expand"
                            icon={isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={() => toggleCollapse(pathKey)}
                        />
                        <Text color="orange.500">
                            {Array.isArray(value) ? '[' : '{'}
                            {isCollapsed && (
                                <Text as="span" color="gray.500">
                                    {' '}
                                    {Array.isArray(value)
                                        ? `${value.length} items`
                                        : `${Object.keys(value).length} keys`
                                    }
                                </Text>
                            )}
                            {isCollapsed && (Array.isArray(value) ? ']' : '}')}
                        </Text>
                    </Box>

                    {!isCollapsed && (
                        <>
                            <VStack align="stretch" pl={4} spacing={0}>
                                {Object.entries(value).map(([key, val]) => (
                                    <Box key={key}>
                                        {!isCollapsed ? (
                                            <>
                                                <Text color="orange.500" display="inline">{key}: </Text>
                                                {renderValue(val, [...currentPath, key])}
                                            </>
                                        ) : (
                                            <>
                                                <Text color="orange.500">{key}: </Text>
                                                <Box pl={4}>
                                                    {renderValue(val, [...currentPath, key])}
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                ))}
                            </VStack>
                            <Text color="orange.500">
                                {Array.isArray(value) ? ']' : '}'}
                            </Text>
                        </>
                    )}
                </Box>
            );
        }

        return (
            <Editable
                defaultValue={String(value)}
                onSubmit={(newValue) => handleValueChange(newValue, currentPath)}
                display="inline-block"
            >
                <EditablePreview />
                <EditableInput />
            </Editable>
        );
    };

    return <Box>{renderValue(data, path)}</Box>;
}

export function FirestorePanel() {
    const [collection, setCollection] = useState("");
    const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: 10,
        totalDocs: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });
    const { projectDir } = useProject();
    const { addLog } = useLogs();
    const toast = useToast();
    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);
    const [isDocument, setIsDocument] = useState(false);
    const [documentData, setDocumentData] = useState<FirestoreDocument | null>(null);

    const fetchData = async (page = pagination.page, limit = pagination.limit) => {
        if (!projectDir || !collection) return;

        setLoading(true);
        try {
            const projectId = await manager.getCurrentProjectId();
            if (!projectId) {
                throw new Error('No active project found');
            }

            const path = [...currentPath, collection].join('/');
            const response = await fetch(
                `http://localhost:3001/api/firebase/firestore/get?path=${encodeURIComponent(path)}&projectId=${encodeURIComponent(projectId)}&page=${page}&limit=${limit}`
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch data');
            }

            const result = await response.json();
            if (result.isDocument) {
                setIsDocument(true);
                setDocumentData(result.data);
                setDocuments([]);
            } else {
                setIsDocument(false);
                setDocumentData(null);
                setDocuments(result.data);
                setPagination(result.pagination);
            }
            addLog(`Fetched ${result.isDocument ? 'document' : 'collection'} from ${path}`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            toast({
                title: 'Error fetching data',
                description: message.includes('service account')
                    ? 'Please configure your service account in Settings first'
                    : message,
                status: 'error',
                duration: 5000,
            });
            addLog(`Failed to fetch data: ${error}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            const projectId = await manager.getCurrentProjectId();
            if (!projectId) {
                throw new Error('No active project found');
            }

            const path = [...currentPath, collection, docId].join('/');
            const response = await fetch(`http://localhost:3001/api/firebase/firestore/delete?projectId=${encodeURIComponent(projectId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete document');
            }

            await fetchData(); // Refresh the list
            toast({
                title: 'Success',
                description: 'Document deleted successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            toast({
                title: 'Error deleting document',
                description: message.includes('service account')
                    ? 'Please configure your service account in Settings first'
                    : message,
                status: 'error',
                duration: 5000,
            });
        }
    };

    const navigateToSubcollection = (docId: string, subcollection?: string) => {
        if (!subcollection) {
            // If no subcollection specified, navigate to the document itself
            const newPath = [...currentPath];
            if (collection) {
                newPath.push(collection);
            }
            setCurrentPath(newPath);
            setCollection(docId);
        } else {
            // Modified subcollection navigation logic
            const newPath = [...currentPath];
            // Only add the current collection and docId if they're not already the last items in the path
            if (collection && newPath[newPath.length - 1] !== collection) {
                newPath.push(collection);
            }
            if (docId && newPath[newPath.length - 1] !== docId) {
                newPath.push(docId);
            }
            setCurrentPath(newPath);
            setCollection(subcollection);
        }

        // Reset pagination and clear documents
        setPagination({
            page: 1,
            limit: pagination.limit,
            totalDocs: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
        });

        setDocuments([]);
        setIsDocument(false);
        setDocumentData(null);
    };

    const navigateBack = () => {
        const newPath = currentPath.slice(0, -2);
        setCurrentPath(newPath);
        setCollection(currentPath[currentPath.length - 2] || "");
        // Reset pagination when navigating
        setPagination({
            page: 1,
            limit: pagination.limit,
            totalDocs: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
        });
        // Clear current documents
        setDocuments([]);
        setIsDocument(false);
        setDocumentData(null);
        // Fetch data for the previous collection
        if (currentPath[currentPath.length - 2]) {
            fetchData(1, pagination.limit);
        }
    };

    const handleDocumentUpdate = async (newData: any) => {
        try {
            const projectId = await manager.getCurrentProjectId();
            if (!projectId) {
                throw new Error('No active project found');
            }

            const path = [...currentPath, collection].join('/');
            const response = await fetch(`http://localhost:3001/api/firebase/firestore/update?projectId=${encodeURIComponent(projectId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, data: newData }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update document');
            }

            toast({
                title: 'Success',
                description: 'Document updated successfully',
                status: 'success',
                duration: 3000,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            toast({
                title: 'Error updating document',
                description: message,
                status: 'error',
                duration: 5000,
            });
        }
    };

    useEffect(() => {
        if (collection) {
            fetchData();
        }
    }, [collection, currentPath]);

    return (
        <Panel title="Firestore Browser">

            <VStack spacing={4} align="stretch">
                <HStack>
                    {currentPath.length > 0 && (
                        <Button size="sm" onClick={navigateBack}>
                            Back
                        </Button>
                    )}
                    <Text>/</Text>
                    {currentPath.map((path, index) => (
                        <Text key={index}>{path} /</Text>
                    ))}
                    <Input
                        placeholder="Enter collection or document ID"
                        value={collection}
                        onChange={(e) => setCollection(e.target.value)}
                        size="sm"
                    />
                    <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => fetchData()}
                        isLoading={loading}
                    >
                        Query
                    </Button>
                </HStack>

                {isDocument ? (
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Heading size="sm" mb={2}>Document: {documentData?.id}</Heading>
                        <VStack align="stretch" spacing={4}>
                            <Box
                                borderRadius="md"
                                overflowX="auto"
                                backgroundColor="gray.50"
                                p={4}
                            >
                                <EditableJSON
                                    data={documentData?.data || {}}
                                    path={[]}
                                    onUpdate={handleDocumentUpdate}
                                />
                            </Box>

                            {documentData?.subcollections && documentData.subcollections.length > 0 && (
                                <Box>
                                    <Text fontWeight="bold" mb={2}>Subcollections:</Text>
                                    <HStack spacing={2} wrap="wrap">
                                        {documentData.subcollections.map((subcollection) => (
                                            <Button
                                                key={subcollection}
                                                size="sm"
                                                variant="outline"
                                                leftIcon={<ChevronRightIcon />}
                                                onClick={() => navigateToSubcollection(documentData.id, subcollection)}
                                            >
                                                {subcollection}
                                            </Button>
                                        ))}
                                    </HStack>
                                </Box>
                            )}

                            <HStack mt={4} spacing={2}>
                                <Button
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleDelete(documentData?.id || '')}
                                >
                                    Delete Document
                                </Button>
                            </HStack>
                        </VStack>
                    </Box>
                ) : (
                    <>
                        {documents.length === 0 ? (
                            <Text>No documents found</Text>
                        ) : (
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Document ID</Th>
                                        <Th>Data</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {documents.map((doc) => (
                                        <ExpandableRow
                                            key={doc.id}
                                            doc={doc}
                                            onNavigate={(docId) => navigateToSubcollection(docId)}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </Tbody>
                            </Table>
                        )}

                        {!isDocument && documents.length > 0 && (
                            <Flex justify="space-between" align="center" mt={4}>
                                <HStack spacing={2}>
                                    <Text fontSize="sm">Rows per page:</Text>
                                    <Select
                                        size="sm"
                                        width="70px"
                                        value={pagination.limit}
                                        onChange={(e) => fetchData(1, parseInt(e.target.value))}
                                    >
                                        {[5, 10, 20, 50].map((value) => (
                                            <option key={`limit-${value}`} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </Select>
                                </HStack>

                                <HStack spacing={2}>
                                    <Text fontSize="sm">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </Text>
                                    <ButtonGroup size="sm" variant="outline">
                                        <Button
                                            onClick={() => fetchData(pagination.page - 1)}
                                            isDisabled={!pagination.hasPreviousPage}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            onClick={() => fetchData(pagination.page + 1)}
                                            isDisabled={!pagination.hasNextPage}
                                        >
                                            Next
                                        </Button>
                                    </ButtonGroup>
                                </HStack>
                            </Flex>
                        )}
                    </>
                )}
            </VStack>
        </Panel>
    );
} 