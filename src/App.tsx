import { Container } from "@chakra-ui/react";
import { Grid, SimpleGrid } from "@chakra-ui/layout";
import { Provider } from "./components/Provider"
import { DirectorySelector } from "./components/DirectorySelector";
import { ProjectSelector } from "./components/ProjectSelector";
import { DeploymentPanel } from "./components/DeploymentPanel";
import { EmulatorPanel } from "./components/EmulatorPanel";
import { DependencyInstaller } from "./components/DependencyInstaller";
import { LogsProvider } from './contexts/LogsContext';
import { LogsPanel } from './components/LogsPanel';
import { SecretsPanel } from './components/SecretsPanel';

export default function App() {
  return (
    <Provider>
      <LogsProvider>
        <Container maxW="container.lg" py={8}>
          <Grid gap={8}>
            <SimpleGrid columns={2} spacing={8}>
              <DirectorySelector />
              <ProjectSelector />
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={8}>
              <DependencyInstaller />
              <DeploymentPanel />
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={8}>
              <EmulatorPanel />
              <SecretsPanel />
            </SimpleGrid>

            <LogsPanel />
          </Grid>
        </Container>
      </LogsProvider>
    </Provider>
  );
} 