import { Box, Heading, IconButton, HStack, Collapse, useDisclosure } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { ReactNode } from "react";

interface PanelProps {
    title: string;
    children: ReactNode;
    buttons?: ReactNode;
    noShadow?: boolean;
    noBorder?: boolean;
    bg?: string;
    borderColor?: string;
    maxWidth?: string;
    width?: string;
    minWidth?: string;
    size?: "sm" | "md" | "lg";
    [key: string]: any;
}

export function Panel({ title, children, buttons, noShadow, noBorder, ...props }: PanelProps) {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

    return (
        <Box p={5} shadow={noShadow ? undefined : "md"} borderWidth={noBorder ? undefined : "1px"} borderRadius="md" height={isOpen ? "100%" : "auto"} {...props}>
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