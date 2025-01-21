import { Layout } from 'react-grid-layout';

export const DEFAULT_LAYOUT: Layout[] = [
  {
    w: 3,
    h: 4,
    x: 9,
    y: 4,
    i: "vitePanel",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 5,
    x: 0,
    y: 0,
    i: "directorySelector",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 5,
    x: 3,
    y: 0,
    i: "projectSelector",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 4,
    x: 9,
    y: 0,
    i: "dependencyInstaller",
    moved: false,
    static: false
  },
  {
    w: 4,
    h: 5,
    x: 0,
    y: 5,
    i: "deploymentPanel",
    moved: false,
    static: false
  },
  {
    w: 4,
    h: 8,
    x: 0,
    y: 10,
    i: "advancedDeploymentPanel",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 4,
    x: 6,
    y: 0,
    i: "emulatorPanel",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 7,
    x: 3,
    y: 30,
    i: "firestorePanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 16,
    x: 6,
    y: 15,
    i: "authPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 6,
    x: 0,
    y: 18,
    i: "rulesPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 8,
    x: 0,
    y: 37,
    i: "storagePanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 6,
    x: 0,
    y: 24,
    i: "analyticsPanel",
    moved: false,
    static: false
  },
  {
    w: 2,
    h: 13,
    x: 4,
    y: 5,
    i: "googleAuthStatusPanel",
    moved: false,
    static: false
  },
  {
    w: 3,
    h: 7,
    x: 0,
    y: 30,
    i: "secretsPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 11,
    x: 6,
    y: 4,
    i: "logsPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 14,
    x: 6,
    y: 31,
    i: "settingsPanel",
    moved: false,
    static: false
  }
];

// For medium screens, we'll adjust the widths and x positions to fit in 6 columns
export const MD_LAYOUT = DEFAULT_LAYOUT.map(item => ({
  ...item,
  w: Math.min(item.w, 6), // Ensure width doesn't exceed 6
  x: item.x >= 6 ? 0 : item.x, // If x >= 6, move to start of row
}));

// Small screen layout with specific dimensions for each panel
export const SM_LAYOUT: Layout[] = [
  {
    w: 6,
    h: 4,
    x: 0,
    y: 0,
    i: "vitePanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 5,
    x: 0,
    y: 0,
    i: "directorySelector",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 5,
    x: 0,
    y: 5,
    i: "projectSelector",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 4,
    x: 0,
    y: 10,
    i: "dependencyInstaller",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 6,
    x: 0,
    y: 14,
    i: "deploymentPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 8,
    x: 0,
    y: 20,
    i: "advancedDeploymentPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 5,
    x: 0,
    y: 28,
    i: "emulatorPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 7,
    x: 0,
    y: 33,
    i: "firestorePanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 18,
    x: 0,
    y: 40,
    i: "authPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 8,
    x: 0,
    y: 58,
    i: "rulesPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 7,
    x: 0,
    y: 66,
    i: "storagePanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 7,
    x: 0,
    y: 73,
    i: "analyticsPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 11,
    x: 0,
    y: 80,
    i: "googleAuthStatusPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 8,
    x: 0,
    y: 91,
    i: "secretsPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 11,
    x: 0,
    y: 99,
    i: "logsPanel",
    moved: false,
    static: false
  },
  {
    w: 6,
    h: 16,
    x: 0,
    y: 110,
    i: "settingsPanel",
    moved: false,
    static: false
  }
];

export const LAYOUTS = {
  lg: DEFAULT_LAYOUT,
  md: MD_LAYOUT,
  sm: SM_LAYOUT,
};
