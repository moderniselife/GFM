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
import { FirestorePanel } from './components/FirestorePanel';
import { AuthPanel } from './components/AuthPanel';
import { SettingsPanel } from './components/SettingsPanel';

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

            <SimpleGrid columns={3} spacing={8}>
              <DependencyInstaller />
              <DeploymentPanel />
              <EmulatorPanel />
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={8}>
              <FirestorePanel />
              <AuthPanel />
            </SimpleGrid>

            <SimpleGrid columns={1} spacing={8}>
              <SecretsPanel />
              <LogsPanel />
              <SettingsPanel />
            </SimpleGrid>
            {/* <SecretsPanel /> */}

            {/* <LogsPanel /> */}
          </Grid>
        </Container>
      </LogsProvider>
    </Provider>
  );
} 