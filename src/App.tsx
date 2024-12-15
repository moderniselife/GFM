import { Box, Button, HStack, useToast, Heading, Text, useColorMode, IconButton } from "@chakra-ui/react";
import { useEffect } from 'react';
import { RepeatIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
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
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  useEffect(() => {
    document.documentElement.style.setProperty('color-scheme', colorMode === 'dark' ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

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
        <Box 
          bg="blue.500" 
          color="white" 
          p={4} 
          mb={4}
          borderBottom="4px solid"
          borderColor="blue.600"
          position="sticky"
          top={0}
          zIndex={100}
        >
          <HStack 
            justify="space-between" 
            align="center" 
            maxW="container.xl" 
            mx="auto" 
            px={4}
            height="40px"
            position="relative"
          >
            {/* Left side */}
            <HStack spacing={4} position="absolute" left={4}>
              <Button
                leftIcon={<RepeatIcon />}
                colorScheme="whiteAlpha"
                onClick={handleSaveLayout}
                size="sm"
              >
                Save Layout
              </Button>
              <Button
                leftIcon={<RepeatIcon />}
                colorScheme="whiteAlpha"
                variant="outline"
                onClick={handleResetLayout}
                size="sm"
              >
                Reset Layout
              </Button>
            </HStack>

            {/* Center */}
            <Heading 
              size="lg" 
              textAlign="center" 
              width="100%"
              position="absolute"
              left="50%"
              transform="translateX(-50%)"
              pointerEvents="none"
            >
              Golden Firebase Manager
            </Heading>

            {/* Right side */}
            <HStack spacing={4} position="absolute" right={4}>
              <IconButton
                aria-label="Toggle dark mode"
                icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                colorScheme="whiteAlpha"
                variant="outline"
                size="sm"
                onClick={toggleColorMode}
              />
            </HStack>
          </HStack>
        </Box>

        <Box p={4}>
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
