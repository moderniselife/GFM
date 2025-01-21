import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { ProjectProvider } from '../contexts/ProjectContext';
import { theme } from '../theme';

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme} resetCSS>
        <ProjectProvider>{children}</ProjectProvider>
      </ChakraProvider>
    </>
  );
}
