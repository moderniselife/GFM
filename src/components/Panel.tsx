import { Box, Heading, HStack } from "@chakra-ui/react";
import { DragHandleIcon } from "@chakra-ui/icons";

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <Box
      height="100%"
      width="100%"
      display="flex"
      flexDirection="column"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg="white"
      _dark={{ bg: "gray.800" }}
    >
      <HStack 
        p={2} 
        bg="gray.50" 
        _dark={{ bg: "gray.700" }}
        className="dragHandle"
        userSelect="none"
      >
        <DragHandleIcon 
          cursor="move"
          color="gray.500"
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