import { Box, Heading, VStack, HStack, Select, Text, Spinner, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, useToast, Alert, AlertIcon, AlertTitle, AlertDescription, Button, Link, ListItem, OrderedList } from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { useProject } from "../contexts/ProjectContext";
import { useLogs } from "../contexts/LogsContext";
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import FirebaseManager from "../lib/FirebaseManager";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Panel } from "./Panel";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface AnalyticsData {
    activeUsers: {
        date: string;
        count: number;
    }[];
    pageViews: {
        date: string;
        count: number;
    }[];
    topPages: {
        pagePath: string;
        views: number;
        averageTime: number;
    }[];
    totalUsers: number;
    newUsers: number;
    bounceRate: number;
    averageSessionDuration: number;
}

const getPermissionErrorDetails = (error: string) => {
    if (error.includes('PERMISSION_DENIED')) {
        return {
            title: 'Additional Permissions Required',
            message: 'The service account needs Google Analytics API access.',
            steps: [
                'Go to Google Cloud Console',
                'Select your project',
                'Search for "Google Analytics Data API"',
                'Click "Enable"',
                'Go to IAM & Admin',
                'Find your service account',
                'Edit (pencil icon)',
                'Add these roles:',
                '- Firebase Analytics Admin',
                '- Analytics Data Viewer',
                '- Analytics Admin'
            ]
        };
    }
    return null;
};

export function AnalyticsPanel() {
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<{ type: string; message: string; link?: string } | null>(null);
    const { projectDir, serviceKeyAdded } = useProject();
    const { addLog } = useLogs();
    const toast = useToast();
    const manager = useMemo(() => new FirebaseManager(projectDir, addLog), [projectDir, addLog]);
    const [projectId, setProjectId] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        if (!projectDir) return;

        setLoading(true);
        setError(null);
        try {
            const projectId = await manager.getCurrentProjectId();
            setProjectId(projectId);
            const response = await fetch(
                `http://localhost:3001/api/ga4/data?projectId=${encodeURIComponent(projectId)}&timeRange=${timeRange}&projectDir=${encodeURIComponent(projectDir)}`
            );

            const data = await response.json();

            if (!response.ok) {
                setError({
                    type: 'permission',
                    message: data.error || 'Failed to fetch analytics data'
                });
                throw new Error(data.error);
            }

            setAnalyticsData(data);
            addLog('Fetched analytics data successfully', 'success');
        } catch (error) {
            setError({
                type: 'permission',
                message: error instanceof Error ? error.message : 'Failed to fetch analytics data'
            });
            addLog(`Failed to fetch analytics: ${error}`, 'error');
            toast({
                title: 'Error fetching analytics',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'error',
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange, projectDir, serviceKeyAdded]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Spinner />
            </Box>
        );
    }

    if (error) {
        const permissionError = getPermissionErrorDetails(error.message);
        if (permissionError) {
            return (
                <Panel title="Analytics Dashboard">
                    <Alert
                        status="warning"
                        variant="subtle"
                        flexDirection="column"
                        alignItems="start"
                        gap={4}
                        mb={4}
                    >
                        <AlertIcon />
                        <Box>
                            <AlertTitle>{permissionError.title}</AlertTitle>
                            <AlertDescription>
                                <Text mb={4}>{permissionError.message}</Text>
                                <OrderedList spacing={2}>
                                    {permissionError.steps.map((step, index) => (
                                        <ListItem key={index}>{step}</ListItem>
                                    ))}
                                </OrderedList>
                            </AlertDescription>
                        </Box>
                    </Alert>
                    <Button
                        as="a"
                        href={`https://console.cloud.google.com/apis/api/analyticsdata.googleapis.com/overview?project=${projectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        colorScheme="blue"
                        leftIcon={<ExternalLinkIcon />}
                    >
                        Open Google Cloud Console
                    </Button>
                </Panel>
            );
        }
        return (
            <Panel title="Analytics Dashboard">
                <VStack spacing={4} align="stretch">
                    <Heading size="md">Analytics Dashboard</Heading>
                    <Alert
                        status={error.type === 'permission' ? 'warning' : 'error'}
                        variant="subtle"
                        flexDirection="column"
                        alignItems="start"
                        gap={2}
                    >
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Setup Required</AlertTitle>
                            <AlertDescription>
                                {error.message}
                                {error.link && (
                                    <Button
                                        as={Link}
                                        href={error.link}
                                        isExternal={!error.link.startsWith('/')}
                                        variant="link"
                                        colorScheme="blue"
                                        rightIcon={<ExternalLinkIcon />}
                                        ml={2}
                                    >
                                        {error.link.startsWith('/') ? 'Go to Settings' : 'Enable API'}
                                    </Button>
                                )}
                            </AlertDescription>
                        </Box>
                    </Alert>
                </VStack>
            </Panel>
        );
    }

    const chartData = {
        labels: analyticsData?.activeUsers.map(d => d.date) || [],
        datasets: [
            {
                label: 'Active Users',
                data: analyticsData?.activeUsers.map(d => d.count) || [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            },
            {
                label: 'Page Views',
                data: analyticsData?.pageViews.map(d => d.count) || [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
            },
        ],
    };

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height="100%" overflowY="auto">
            <HStack justify="space-between" mb={6}>
                <Heading size="md">Analytics Dashboard</Heading>
                <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    width="200px"
                >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </Select>
            </HStack>

            {analyticsData && (
                <>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
                        <Stat>
                            <StatLabel>Total Users</StatLabel>
                            <StatNumber>{analyticsData.totalUsers.toLocaleString()}</StatNumber>
                        </Stat>
                        <Stat>
                            <StatLabel>New Users</StatLabel>
                            <StatNumber>{analyticsData.newUsers.toLocaleString()}</StatNumber>
                        </Stat>
                        <Stat>
                            <StatLabel>Bounce Rate</StatLabel>
                            <StatNumber>{analyticsData.bounceRate.toFixed(1)}%</StatNumber>
                        </Stat>
                        <Stat>
                            <StatLabel>Avg. Session Duration</StatLabel>
                            <StatNumber>{(analyticsData.averageSessionDuration / 60).toFixed(1)}m</StatNumber>
                        </Stat>
                    </SimpleGrid>

                    <Box mb={8} p={4} borderWidth="1px" borderRadius="lg" height="300px">
                        <Line data={chartData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }} />
                    </Box>

                    <Box>
                        <Heading size="sm" mb={4}>Top Pages</Heading>
                        <VStack spacing={4} align="stretch">
                            {analyticsData.topPages.map((page, index) => (
                                <Box key={index} p={4} borderWidth="1px" borderRadius="md">
                                    <Text fontWeight="bold">{page.pagePath}</Text>
                                    <HStack spacing={8} mt={2}>
                                        <Text>Views: {page.views.toLocaleString()}</Text>
                                        <Text>Avg. Time: {(page.averageTime / 60).toFixed(1)} min</Text>
                                    </HStack>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                </>
            )}
        </Box>
    );
}