import {
  Box,
  Button,
  Heading,
  VStack,
  HStack,
  Text,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  ButtonGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  useDisclosure,
  Collapse,
} from '@chakra-ui/react';
import {
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons';
import { useState, useEffect, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useLogs } from '../contexts/LogsContext';
import FirebaseManager from '../lib/FirebaseManager';
import { Panel } from './Panel';

interface StorageFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
  updated: string;
}

interface PaginationData {
  files: StorageFile[];
  totalFiles: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// interface PanelProps {
//     title: string;
//     children: React.ReactNode;
// }

// export function Panel({ title, children }: PanelProps) {
//     const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

//     return (
//         <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height={isOpen ? "100%" : "auto"}>
//             <HStack justify="space-between" mb={isOpen ? 4 : 0}>
//                 <Heading size="md">{title}</Heading>
//                 <IconButton
//                     aria-label={isOpen ? "Collapse panel" : "Expand panel"}
//                     icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
//                     onClick={onToggle}
//                     size="sm"
//                     variant="ghost"
//                 />
//             </HStack>
//             <Collapse in={isOpen} animateOpacity>
//                 {children}
//             </Collapse>
//         </Box>
//     );
// }

export function StoragePanel() {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    files: [],
    totalFiles: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [projectId, setProjectId] = useState<string | undefined | null>(undefined);
  const { projectDir, serviceKeyAdded } = useProject();
  const { addLog } = useLogs();
  const toast = useToast();
  const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [newPath, setNewPath] = useState('');
  const [keepSourceFile, setKeepSourceFile] = useState(false);

  const fetchFiles = async (page = 1) => {
    if (!projectDir) return;
    setLoading(true);
    try {
      const projectId = await manager.getCurrentProjectId();
      setProjectId(projectId);
      const path = currentPath.join('/');

      const response = await fetch(
        `http://localhost:3001/api/firebase/storage/list?` +
          `path=${encodeURIComponent(path)}&` +
          `projectId=${encodeURIComponent(projectId)}&` +
          `page=${page}&` +
          `limit=${rowsPerPage}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setPagination(data);
      addLog(`Fetched storage files from ${path || 'root'}`, 'success');
    } catch (error) {
      toast({
        title: 'Error fetching files',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
      addLog(`Failed to fetch files: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const projectId = await manager.getCurrentProjectId();
      const path = [...currentPath, file.name].join('/');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('projectId', projectId);

      const response = await fetch('http://localhost:3001/api/firebase/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
        status: 'success',
        duration: 3000,
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: 'Error uploading file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleMove = async (file: StorageFile, newPath: string, keepSource: boolean) => {
    try {
      const projectId = await manager.getCurrentProjectId();

      const response = await fetch('http://localhost:3001/api/firebase/storage/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourcePath: file.path,
          destinationPath: newPath,
          deleteSource: !keepSource,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move file');
      }

      toast({
        title: 'Success',
        description: keepSource ? 'File copied successfully' : 'File moved successfully',
        status: 'success',
        duration: 3000,
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: 'Error moving file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    } finally {
      onClose();
      setSelectedFile(null);
      setNewPath('');
      setKeepSourceFile(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      const projectId = await manager.getCurrentProjectId();

      const response = await fetch('http://localhost:3001/api/firebase/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, path }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      toast({
        title: 'Success',
        description: 'File deleted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: 'Error deleting file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    fetchFiles(1);
  }, [currentPath, projectDir, serviceKeyAdded, rowsPerPage]);

  const MoveFileModal = () => (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Move File</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <Input
              placeholder="Enter new path"
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              defaultValue={selectedFile?.path}
            />
            <Checkbox
              isChecked={keepSourceFile}
              onChange={e => setKeepSourceFile(e.target.checked)}
            >
              Keep original file as revision
            </Checkbox>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => {
              if (selectedFile && newPath) {
                handleMove(selectedFile, newPath, keepSourceFile);
              }
            }}
          >
            {keepSourceFile ? 'Copy File' : 'Move File'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return (
    <Panel
      title="Cloud Storage"
      buttons={
        <HStack justify="space-between">
          <Text fontSize="sm">Total Files: {pagination.totalFiles}</Text>
          <Select
            size="sm"
            width="120px"
            value={rowsPerPage}
            onChange={e => setRowsPerPage(Number(e.target.value))}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </Select>
        </HStack>
      }
    >
      <VStack spacing={4} align="stretch">
        <HStack>
          <Button
            size="sm"
            onClick={() => setCurrentPath(currentPath.slice(0, -1))}
            isDisabled={currentPath.length === 0}
          >
            Back
          </Button>
          <Text>/</Text>
          {currentPath.map((path, index) => (
            <Text key={index}>{path} /</Text>
          ))}
          <Input type="file" onChange={handleFileUpload} hidden id="file-upload" />
          <Button
            as="label"
            htmlFor="file-upload"
            size="sm"
            colorScheme="blue"
            isLoading={uploadingFile}
          >
            Upload File
          </Button>
        </HStack>

        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Size</Th>
              <Th>Type</Th>
              <Th>Updated</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagination.files.map(file => (
              <Tr key={file.path}>
                <Td>{file.name}</Td>
                <Td>{formatBytes(file.size)}</Td>
                <Td>{file.contentType}</Td>
                <Td>{new Date(file.updated).toLocaleString()}</Td>
                <Td>
                  <HStack spacing={2}>
                    <Menu>
                      <MenuButton as={IconButton} icon={<EditIcon />} size="xs" />
                      <MenuList>
                        <MenuItem
                          onClick={() => {
                            setSelectedFile(file);
                            setNewPath(file.path);
                            onOpen();
                          }}
                        >
                          Move/Copy
                        </MenuItem>
                      </MenuList>
                    </Menu>
                    <IconButton
                      aria-label="Download file"
                      icon={<DownloadIcon />}
                      size="xs"
                      onClick={() =>
                        window.open(
                          `http://localhost:3001/api/firebase/storage/download?path=${encodeURIComponent(file.path)}&projectId=${projectId}`
                        )
                      }
                    />
                    <IconButton
                      aria-label="Delete file"
                      icon={<DeleteIcon />}
                      size="xs"
                      colorScheme="red"
                      onClick={() => handleDelete(file.path)}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <HStack justify="space-between" pt={4}>
          <Text fontSize="sm">
            Showing {(pagination.currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(pagination.currentPage * rowsPerPage, pagination.totalFiles)} of{' '}
            {pagination.totalFiles} files
          </Text>
          <ButtonGroup size="sm" isAttached variant="outline">
            <IconButton
              aria-label="First page"
              icon={<ChevronLeftIcon />}
              onClick={() => fetchFiles(1)}
              isDisabled={!pagination.hasPreviousPage}
            />
            <IconButton
              aria-label="Previous page"
              icon={<ChevronLeftIcon />}
              onClick={() => fetchFiles(pagination.currentPage - 1)}
              isDisabled={!pagination.hasPreviousPage}
            />
            <Button isDisabled>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Button>
            <IconButton
              aria-label="Next page"
              icon={<ChevronRightIcon />}
              onClick={() => fetchFiles(pagination.currentPage + 1)}
              isDisabled={!pagination.hasNextPage}
            />
            <IconButton
              aria-label="Last page"
              icon={<ChevronRightIcon />}
              onClick={() => fetchFiles(pagination.totalPages)}
              isDisabled={!pagination.hasNextPage}
            />
          </ButtonGroup>
        </HStack>
      </VStack>
      <MoveFileModal />
    </Panel>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
