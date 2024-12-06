import { Box, Heading, IconButton, HStack, Collapse, useDisclosure } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { ReactNode } from "react";

interface PanelProps {
    title: string;
    children: ReactNode;
    buttons?: ReactNode;
}

export function Panel({ title, children, buttons }: PanelProps) {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

    return (
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md" height={isOpen ? "100%" : "auto"}>
            <HStack justify="space-between" mb={isOpen ? 4 : 0}>
                <Heading size="md">{title}</Heading>
                <HStack spacing={2}>
                    {buttons}
                    <IconButton
                        aria-label={isOpen ? "Collapse panel" : "Expand panel"}
                        icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        onClick={onToggle}
                        size="sm"
                        variant="ghost"
                    />
                </HStack>
            </HStack>
            <Collapse in={isOpen} animateOpacity>
                {children}
            </Collapse>
        </Box>
    );
} 