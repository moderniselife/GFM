import {
  Box,
  Button,
  HStack,
  useToast,
  Heading,
  Text,
  useColorMode,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { RepeatIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Layout } from 'react-grid-layout';
import { useLayout } from './contexts/LayoutContext';
import { Provider } from './components/Provider';
import { DirectorySelector } from './components/DirectorySelector';
import { ProjectSelector } from './components/ProjectSelector';
import { DeploymentPanel } from './components/DeploymentPanel';
import { EmulatorPanel } from './components/EmulatorPanel';
import { DependencyInstaller } from './components/DependencyInstaller';
import { LogsProvider } from './contexts/LogsContext';
import { LogsPanel } from './components/LogsPanel';
import { SecretsPanel } from './components/SecretsPanel';
import { FirestorePanel } from './components/FirestorePanel';
import { AuthPanel } from './components/AuthPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { RulesPanel } from './components/RulesPanel';
import { StoragePanel } from './components/StoragePanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { GoogleAuthStatusPanel } from './components/GoogleAuthStatusPanel';
import { AdvancedDeploymentPanel } from './components/AdvancedDeploymentPanel';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function App() {
  const { layouts, setLayouts, saveLayout, resetLayout } = useLayout();
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  const headerBg = useColorModeValue('blue.500', 'gray.800');
  const headerBorderColor = useColorModeValue('blue.600', 'gray.700');
  const gridBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    document.documentElement.style.setProperty(
      'color-scheme',
      colorMode === 'dark' ? 'dark' : 'light'
    );
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
  };

  const handleSaveLayout = () => {
    saveLayout();
    toast({
      title: 'Layout saved',
      status: 'success',
      duration: 2000,
    });
  };

  const handleResetLayout = () => {
    resetLayout();
    toast({
      title: 'Layout reset to default',
      status: 'success',
      duration: 2000,
    });
  };

  return (
    <Provider>
      <LogsProvider>
        <Box
          bg={headerBg}
          color="white"
          p={{ base: 2, md: 4 }}
          mb={{ base: 2, md: 4 }}
          borderBottom={{ base: "2px", md: "4px" }}
          borderStyle="solid"
          borderColor={headerBorderColor}
          position="sticky"
          top={0}
          zIndex={100}
          transition="all 0.2s"
        >
          <HStack
            justify="space-between"
            align="center"
            maxW="container.xl"
            mx="auto"
            px={{ base: 2, md: 4 }}
            height={{ base: '50px', md: '40px' }}
            flexWrap="nowrap"
          >
            {/* Left side */}
            <HStack spacing={{ base: 2, md: 4 }} flex="1">
              <Box display={{ base: 'none', md: 'block' }}>
                <Button
                  leftIcon={<RepeatIcon />}
                  colorScheme="whiteAlpha"
                  onClick={handleSaveLayout}
                  size={{ base: 'xs', md: 'sm' }}
                >
                  Save Layout
                </Button>
              </Box>
              <Box display={{ base: 'none', md: 'block' }}>
                <Button
                  leftIcon={<RepeatIcon />}
                  colorScheme="whiteAlpha"
                  variant="outline"
                  onClick={handleResetLayout}
                  size={{ base: 'xs', md: 'sm' }}
                >
                  Reset Layout
                </Button>
              </Box>
            </HStack>

            {/* Center */}
            <Heading
              size={{ base: 'md', md: 'lg' }}
              textAlign="center"
              width="100%"
              flex="2"
              isTruncated
              pointerEvents="none"
            >
              Golden Firebase Manager
            </Heading>

            {/* Right side */}
            <HStack spacing={{ base: 2, md: 4 }} flex="1" justify="flex-end">
              <IconButton
                aria-label="Toggle dark mode"
                icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                colorScheme="whiteAlpha"
                variant="ghost"
                size="sm"
                onClick={toggleColorMode}
                _hover={{
                  bg: 'whiteAlpha.300',
                }}
              />
            </HStack>
          </HStack>
        </Box>

        <Box
          p={{ base: 2, md: 4 }}
          bg={gridBg}
          minHeight="calc(100vh - 76px)"
          transition="background-color 0.2s"
        >
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 8, sm: 6, xs: 4 }}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            isDraggable
            isResizable
            margin={[8, 8]}
            containerPadding={[5, 5]}
            draggableHandle=".dragHandle"
            compactType="vertical"
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
