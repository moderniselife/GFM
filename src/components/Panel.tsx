import { Box, Heading, HStack, useColorModeValue } from '@chakra-ui/react';
import { DragHandleIcon } from '@chakra-ui/icons';

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const dragHandleColor = useColorModeValue('gray.400', 'whiteAlpha.400');
  const dragHandleHoverColor = useColorModeValue('gray.500', 'whiteAlpha.600');

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
      transition="all 0.2s"
      _hover={{
        borderColor: useColorModeValue('gray.300', 'whiteAlpha.400'),
      }}
    >
      <HStack
        p={{ base: 1.5, md: 2 }}
        bg={headerBgColor}
        className="dragHandle"
        userSelect="none"
        transition="all 0.2s"
        spacing={{ base: 1, md: 2 }}
        _hover={{
          bg: useColorModeValue('gray.100', 'gray.600'),
        }}
      >
        <DragHandleIcon
          cursor="move"
          color={dragHandleColor}
          transition="color 0.2s"
          _hover={{ color: dragHandleHoverColor }}
        />
        <Heading size="sm" flex="1">
          {title}
        </Heading>
      </HStack>
      <Box
        flex="1"
        p={{ base: 2, md: 4 }}
        overflowY="auto"
        sx={{
          '&::-webkit-scrollbar': {
            width: '8px',
            borderRadius: '8px',
            backgroundColor: useColorModeValue('gray.50', 'whiteAlpha.100'),
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: '8px',
            backgroundColor: useColorModeValue('gray.300', 'whiteAlpha.300'),
            '&:hover': {
              backgroundColor: useColorModeValue('gray.400', 'whiteAlpha.400'),
            },
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
