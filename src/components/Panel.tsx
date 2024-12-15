import { Box, Heading, HStack, useColorModeValue } from "@chakra-ui/react";
import { DragHandleIcon } from "@chakra-ui/icons";

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Box
      height="100%"
      width="100%"
      display="flex"
      flexDirection="column"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      color={textColor}
    >
      <HStack 
        p={2} 
        bg={headerBgColor}
        className="dragHandle"
        userSelect="none"
      >
        <DragHandleIcon 
          cursor="move"
          color={useColorModeValue('gray.500', 'gray.400')}
        />
        <Heading size="sm" flex="1">
          {title}
        </Heading>
      </HStack>
      <Box 
        flex="1" 
        p={4} 
        overflowY="auto"
      >
        {children}
      </Box>
    </Box>
  );
} 