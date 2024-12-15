import { Container, Box, Button, HStack, useToast, ChakraProvider } from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Layout } from 'react-grid-layout';
import { useLayout } from './contexts/LayoutContext';
import { Provider } from "./components/Provider";
import { DirectorySelector } from "./components/DirectorySelector";
import { ProjectSelector } from "./components/ProjectSelector";
import { DeploymentPanel } from "./components/DeploymentPanel";
import { EmulatorPanel } from "./components/EmulatorPanel";
import { DependencyInstaller } from "./components/DependencyInstaller";
import { LogsProvider } from "./contexts/LogsContext";
import { LogsPanel } from "./components/LogsPanel";
import { SecretsPanel } from "./components/SecretsPanel";
import { FirestorePanel } from "./components/FirestorePanel";
import { AuthPanel } from "./components/AuthPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { RulesPanel } from "./components/RulesPanel";
import { StoragePanel } from "./components/StoragePanel";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { GoogleAuthStatusPanel } from "./components/GoogleAuthStatusPanel";
import { AdvancedDeploymentPanel } from "./components/AdvancedDeploymentPanel";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function App() {
  const { layouts, setLayouts, saveLayout, resetLayout } = useLayout();
  const toast = useToast();

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
  };

  const handleSaveLayout = () => {
    saveLayout();
    toast({
      title: "Layout saved",
      status: "success",
      duration: 2000,
    });
  };

  const handleResetLayout = () => {
    resetLayout();
    toast({
      title: "Layout reset to default",
      status: "success",
      duration: 2000,
    });
  };

  return (
    <Provider>
      <LogsProvider>
        <Box p={4}>
          <HStack spacing={4} mb={4}>
            <Button
              leftIcon={<RepeatIcon />}
              colorScheme="blue"
              onClick={handleSaveLayout}
            >
              Save Layout
            </Button>
            <Button
              leftIcon={<RepeatIcon />}
              variant="outline"
              onClick={handleResetLayout}
            >
              Reset Layout
            </Button>
          </HStack>

          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 12, md: 6, sm: 6 }}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            isDraggable
            isResizable
            margin={[10, 10]}
            draggableHandle=".dragHandle"
          >
            <div key="directorySelector">
              <DirectorySelector />
            </div>
            <div key="projectSelector">
              <ProjectSelector />
            </div>
            <div key="dependencyInstaller">
              <DependencyInstaller />
            </div>
            <div key="deploymentPanel">
              <DeploymentPanel />
            </div>
            <div key="advancedDeploymentPanel">
              <AdvancedDeploymentPanel />
            </div>
            <div key="emulatorPanel">
              <EmulatorPanel />
            </div>
            <div key="firestorePanel">
              <FirestorePanel />
            </div>
            <div key="authPanel">
              <AuthPanel />
            </div>
            <div key="rulesPanel">
              <RulesPanel />
            </div>
            <div key="storagePanel">
              <StoragePanel />
            </div>
            <div key="analyticsPanel">
              <AnalyticsPanel />
            </div>
            <div key="googleAuthStatusPanel">
              <GoogleAuthStatusPanel />
            </div>
            <div key="secretsPanel">
              <SecretsPanel />
            </div>
            <div key="logsPanel">
              <LogsPanel />
            </div>
            <div key="settingsPanel">
              <SettingsPanel />
            </div>
          </ResponsiveGridLayout>
        </Box>
      </LogsProvider>
    </Provider>
  );
}
