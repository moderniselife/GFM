import { Box, Button, Checkbox, Heading, Text, VStack, HStack, IconButton, Flex } from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useLogs } from "../contexts/LogsContext";
import { useRef, useEffect, useState } from "react";
import { parseANSIString, parseTimestamp } from "../utils/logFormatter";

export function LogsPanel() {
  const { logs, clearLogs } = useLogs();
  const logsBoxRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logsBoxRef.current) {
      logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const renderStyledText = (message: string, level?: 'info' | 'error' | 'success' | 'warning') => {
    const { timestamp, remainingMessage } = parseTimestamp(message);
    const styledParts = parseANSIString(remainingMessage);

    const levelColor = level ? {
      info: 'blue.500',
      error: 'red.500',
      success: 'green.500',
      warning: 'yellow.500'
    }[level] : undefined;

    return (
      <Flex alignItems="flex-start" gap={2}>
        <Text color="gray.500" flexShrink={0}>
          {timestamp || new Date().toLocaleTimeString()}
        </Text>
        <Box>
          {styledParts.map((part, index) => (
            <Text
              key={index}
              as="span"
              color={part.style.color || levelColor}
              fontWeight={part.style.fontWeight}
              fontStyle={part.style.fontStyle}
            >
              {part.text}
            </Text>
          ))}
        </Box>
      </Flex>
    );
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
              onClick={() => {
                if (logsBoxRef.current) logsBoxRef.current.scrollTop = 0;
              }}
            />
            <IconButton
              aria-label="Scroll to bottom"
              icon={<ChevronDownIcon />}
              size="sm"
              onClick={() => {
                if (logsBoxRef.current) {
                  logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
                }
              }}
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
          fontSize="sm"
          whiteSpace="pre-wrap"
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}
        >
          {logs.map((log, index) => (
            <Box key={index} mb={1}>
              {renderStyledText(log.message, log.level)}
            </Box>
          ))}
        </Box>
      </VStack>
    </Box>
  );
} 