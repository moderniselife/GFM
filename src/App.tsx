// import { Container } from "@chakra-ui/react";
// import { Grid, SimpleGrid } from "@chakra-ui/layout";
// import { Provider } from "./components/Provider";
// import { DirectorySelector } from "./components/DirectorySelector";
// import { ProjectSelector } from "./components/ProjectSelector";
// import { DeploymentPanel } from "./components/DeploymentPanel";
// import { EmulatorPanel } from "./components/EmulatorPanel";
// import { DependencyInstaller } from "./components/DependencyInstaller";
// import { LogsProvider } from "./contexts/LogsContext";
// import { LogsPanel } from "./components/LogsPanel";
// import { SecretsPanel } from "./components/SecretsPanel";
// import { FirestorePanel } from "./components/FirestorePanel";
// import { AuthPanel } from "./components/AuthPanel";
// import { SettingsPanel } from "./components/SettingsPanel";
// import { RulesPanel } from "./components/RulesPanel";
// import { StoragePanel } from "./components/StoragePanel";
// import { AnalyticsPanel } from "./components/AnalyticsPanel";
// import { GoogleAuthStatusPanel } from "./components/GoogleAuthStatusPanel";
// import { AdvancedDeploymentPanel } from "./components/AdvancedDeploymentPanel";

// export default function App() {
//   return (
//     <Provider>
//       <LogsProvider>
//         <Container maxW="container.lg" py={8}>
//           <Grid gap={8}>
//             <SimpleGrid columns={2} spacing={8}>
//               <DirectorySelector />
//               <ProjectSelector />
//             </SimpleGrid>

//             <SimpleGrid columns={3} spacing={8}>
//               <DependencyInstaller />
//               <DeploymentPanel />
//               <AdvancedDeploymentPanel />
//               <EmulatorPanel />
//             </SimpleGrid>

//             <SimpleGrid columns={1} spacing={8}>
//               <FirestorePanel />
//               <AuthPanel />
//             </SimpleGrid>

//             <SimpleGrid columns={1} spacing={8}>
//               <RulesPanel />
//               <StoragePanel />
//               <AnalyticsPanel />
//             </SimpleGrid>

//             <SimpleGrid columns={1} spacing={8}>
//               <GoogleAuthStatusPanel />
//               <SecretsPanel />
//               <LogsPanel />
//               <SettingsPanel />
//             </SimpleGrid>
//             {/* <SecretsPanel /> */}

//             {/* <LogsPanel /> */}
//           </Grid>
//         </Container>
//       </LogsProvider>
//     </Provider>
//   );
// }

import { Container } from "@chakra-ui/react";
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

import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function App() {
  // Define default layout (each item needs an `i` (id), `x`, `y`, `w`(width), `h`(height))
  // Positions are all relative. You can start them out in a single row or
  // spread them out however you'd like.
  const layout = [
    { i: "directorySelector", x: 0, y: 0, w: 2, h: 2 },
    { i: "projectSelector", x: 2, y: 0, w: 2, h: 2 },
    { i: "dependencyInstaller", x: 0, y: 1, w: 2, h: 2 },
    { i: "deploymentPanel", x: 2, y: 1, w: 2, h: 2 },
    { i: "advancedDeploymentPanel", x: 4, y: 1, w: 2, h: 2 },
    { i: "emulatorPanel", x: 6, y: 1, w: 2, h: 2 },
    // ... add all other panels similarly
    { i: "firestorePanel", x: 0, y: 2, w: 2, h: 2 },
    { i: "authPanel", x: 2, y: 2, w: 2, h: 2 },
    { i: "rulesPanel", x: 0, y: 3, w: 2, h: 2 },
    { i: "storagePanel", x: 2, y: 3, w: 2, h: 2 },
    { i: "analyticsPanel", x: 4, y: 3, w: 2, h: 2 },
    { i: "googleAuthStatusPanel", x: 0, y: 4, w: 2, h: 2 },
    { i: "secretsPanel", x: 2, y: 4, w: 2, h: 2 },
    { i: "logsPanel", x: 4, y: 4, w: 2, h: 2 },
    { i: "settingsPanel", x: 6, y: 4, w: 2, h: 2 },
  ];

  return (
    <Provider>
      <LogsProvider>
        <Container maxW="container.xl" py={8}>
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={50}
            isResizable={true}
            isDraggable={true}>
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
        </Container>
      </LogsProvider>
    </Provider>
  );
}
