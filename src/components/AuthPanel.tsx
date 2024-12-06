import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, useToast, Text, Badge, HStack, Select, ButtonGroup, Flex } from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import FirebaseManager from "../lib/FirebaseManager";

interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  disabled: boolean;
  createdAt: string;
  lastSignedInAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function AuthPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const { projectDir } = useProject();
  const { addLog } = useLogs();
  const toast = useToast();

  const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);

  const fetchUsers = async (page: number = 1, limit: number = 10) => {
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
    try {
      const projectId = await manager.getCurrentProjectId();
      if (!projectId) {
        throw new Error('No active project found');
      }

      const response = await fetch(
        `http://localhost:3001/api/firebase/auth/users?dir=${encodeURIComponent(projectDir)}&projectId=${encodeURIComponent(projectId)}&page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      addLog(`Fetched ${data.users.length} users (page ${page} of ${data.pagination.totalPages})`, 'success');
    } catch (error) {
      toast({
        title: 'Error fetching users',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
      addLog(`Failed to fetch users: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableUser = async (uid: string, disable: boolean) => {
    if (!projectDir) return;

    try {
      const projectId = await manager.getCurrentProjectId();
      if (!projectId) {
        throw new Error('No active project found');
      }

      const response = await fetch(
        `http://localhost:3001/api/firebase/auth/update-user?dir=${encodeURIComponent(projectDir)}&projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, disabled: disable }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      await fetchUsers(); // Refresh the list
      toast({
        title: 'Success',
        description: `User ${disable ? 'disabled' : 'enabled'} successfully`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error updating user',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [projectDir]);

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" overflowX="auto">
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">
          Authentication
          {loading && <Text as="span" ml={2} color="gray.500" fontSize="sm">(Loading...)</Text>}
        </Heading>
        <Text color="gray.500" fontSize="sm">
          Total Users: {pagination.totalUsers}
        </Text>
      </Flex>

      {users.length === 0 ? (
        <Text>No users found</Text>
      ) : (
        <>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Email</Th>
                <Th>Display Name</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Last Sign In</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.uid}>
                  <Td>
                    {user.email}
                    {user.emailVerified && (
                      <Badge key={`${user.uid}-verified`} ml={2} colorScheme="green">
                        Verified
                      </Badge>
                    )}
                  </Td>
                  <Td>{user.displayName || '-'}</Td>
                  <Td>
                    <Badge key={`${user.uid}-status`} colorScheme={user.disabled ? 'red' : 'green'}>
                      {user.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </Td>
                  <Td>{new Date(parseInt(user.createdAt)).toLocaleDateString()}</Td>
                  <Td>{new Date(parseInt(user.lastSignedInAt)).toLocaleDateString()}</Td>
                  <Td>
                    <Button
                      size="xs"
                      colorScheme={user.disabled ? 'green' : 'red'}
                      onClick={() => handleDisableUser(user.uid, !user.disabled)}
                    >
                      {user.disabled ? 'Enable' : 'Disable'}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Flex justify="space-between" align="center" mt={4}>
            <HStack spacing={2}>
              <Text fontSize="sm">Rows per page:</Text>
              <Select
                size="sm"
                width="70px"
                value={pagination.limit}
                onChange={(e) => fetchUsers(1, parseInt(e.target.value))}
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
                  onClick={() => fetchUsers(pagination.page - 1, pagination.limit)}
                  isDisabled={!pagination.hasPreviousPage}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => fetchUsers(pagination.page + 1, pagination.limit)}
                  isDisabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </ButtonGroup>
            </HStack>
          </Flex>
        </>
      )}
    </Box>
  );
} 