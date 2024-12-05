import { ChakraProvider } from "@chakra-ui/react"
import { ProjectProvider } from "../contexts/ProjectContext"

export function Provider({ children }: { children: React.ReactNode }) {
    return (
        <ChakraProvider>
            <ProjectProvider>
                {children}
            </ProjectProvider>
        </ChakraProvider>
    )
} 