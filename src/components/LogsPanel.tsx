import {
  Box,
  Button,
  Checkbox,
  Text,
  VStack,
  HStack,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useLogs } from '../contexts/LogsContext';
import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { parseANSIString, parseTimestamp } from '../utils/logFormatter';
import { Panel } from './Panel';
import { FixedSizeList as List } from 'react-window';

const ITEM_SIZE = 24; // Height of each log entry in pixels
const LIST_HEIGHT = 300; // Max height of the log container

const LogEntry = memo(({ message, level, style }: { 
  message: string; 
  level?: 'info' | 'error' | 'success' | 'warning';
  style: React.CSSProperties;
}) => {
  const { timestamp, remainingMessage } = parseTimestamp(message);
  const styledParts = parseANSIString(remainingMessage);

  const levelColor = level
    ? {
        info: 'blue.500',
        error: 'red.500',
        success: 'green.500',
        warning: 'yellow.500',
      }[level]
    : undefined;

  return (
    <Flex alignItems="flex-start" gap={2} style={style}>
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
});

LogEntry.displayName = 'LogEntry';

export function LogsPanel() {
  const { logs, clearLogs } = useLogs();
  const listRef = useRef<List>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLogsLengthRef = useRef(logs.length);

  useEffect(() => {
    if (autoScroll && logs.length !== prevLogsLengthRef.current) {
      listRef.current?.scrollToItem(logs.length - 1);
    }
    prevLogsLengthRef.current = logs.length;
  }, [logs, autoScroll]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = logs[index];
    return <LogEntry message={log.message} level={log.level} style={style} />;
  }, [logs]);

  return (
    <Panel title="Logs">
      <VStack align="stretch" spacing={4}>
        <HStack spacing={2} justifyContent="flex-end">
          <Checkbox
            isChecked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
            size="sm"
          >
            Auto-scroll
          </Checkbox>
          <IconButton
            aria-label="Scroll to top"
            icon={<ChevronUpIcon />}
            size="sm"
            onClick={() => listRef.current?.scrollToItem(0)}
          />
          <IconButton
            aria-label="Scroll to bottom"
            icon={<ChevronDownIcon />}
            size="sm"
            onClick={() => listRef.current?.scrollToItem(logs.length - 1)}
          />
          <Button size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </HStack>
        <Box
          bg="gray.50"
          borderRadius="md"
          fontFamily="mono"
          fontSize="sm"
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
          <List
            ref={listRef}
            height={LIST_HEIGHT}
            itemCount={logs.length}
            itemSize={ITEM_SIZE}
            width="100%"
            overscanCount={5}
          >
            {Row}
          </List>
        </Box>
      </VStack>
    </Panel>
  );
}
