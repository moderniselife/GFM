import { Box, Button, Checkbox, Heading, Text, VStack, HStack, IconButton } from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useLogs } from "../contexts/LogsContext";
import { useRef, useEffect, useState } from "react";

export function LogsPanel() {
  const { logs, clearLogs } = useLogs();
  const logsBoxRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logsBoxRef.current) {
      logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const scrollToTop = () => {
    if (logsBoxRef.current) {
      logsBoxRef.current.scrollTop = 0;
    }
  };

  const scrollToBottom = () => {
    if (logsBoxRef.current) {
      logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
    }
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
      <VStack align="stretch" spacing={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="md">Logs</Heading>
          <HStack spacing={2}>
            <Checkbox 
              isChecked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
              size="sm"
            >
              Auto-scroll
            </Checkbox>
            <IconButton
              aria-label="Scroll to top"
              icon={<ChevronUpIcon />}
              size="sm"
              onClick={scrollToTop}
            />
            <IconButton
              aria-label="Scroll to bottom"
              icon={<ChevronDownIcon />}
              size="sm"
              onClick={scrollToBottom}
            />
            <Button size="sm" onClick={clearLogs}>Clear</Button>
          </HStack>
        </Box>
        <Box 
          ref={logsBoxRef}
          maxH="300px" 
          overflowY="auto" 
          bg="gray.50" 
          p={4} 
          borderRadius="md"
          fontFamily="mono"
        >
          {logs.map((log, index) => (
            <Text 
              key={index} 
              color={log.type === 'error' ? 'red.500' : log.type === 'success' ? 'green.500' : 'gray.700'}
              fontSize="sm"
            >
              [{log.timestamp.toLocaleTimeString()}] {log.message}
            </Text>
          ))}
        </Box>
      </VStack>
    </Box>
  );
} 