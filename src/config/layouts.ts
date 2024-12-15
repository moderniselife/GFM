import { Layout } from 'react-grid-layout';

export const DEFAULT_LAYOUT: Layout[] = [
  // Top row - Essential controls
  { i: 'directorySelector', x: 0, y: 0, w: 6, h: 2 },
  { i: 'projectSelector', x: 6, y: 0, w: 6, h: 2 },
  
  // Second row - Main panels
  { i: 'deploymentPanel', x: 0, y: 2, w: 6, h: 4 },
  { i: 'emulatorPanel', x: 6, y: 2, w: 6, h: 4 },
  
  // Third row - Database & Auth
  { i: 'firestorePanel', x: 0, y: 6, w: 6, h: 6 },
  { i: 'authPanel', x: 6, y: 6, w: 6, h: 6 },
  
  // Fourth row - Rules & Storage
  { i: 'rulesPanel', x: 0, y: 12, w: 6, h: 6 },
  { i: 'storagePanel', x: 6, y: 12, w: 6, h: 6 },
  
  // Fifth row - Analytics & Settings
  { i: 'analyticsPanel', x: 0, y: 18, w: 6, h: 6 },
  { i: 'settingsPanel', x: 6, y: 18, w: 6, h: 6 },
  
  // Bottom row - Utilities
  { i: 'googleAuthStatusPanel', x: 0, y: 24, w: 4, h: 3 },
  { i: 'secretsPanel', x: 4, y: 24, w: 4, h: 3 },
  { i: 'logsPanel', x: 8, y: 24, w: 4, h: 3 }
];

export const LAYOUTS = {
  lg: DEFAULT_LAYOUT,
  md: DEFAULT_LAYOUT.map(item => ({
    ...item,
    w: item.w >= 6 ? 6 : item.w,
    x: item.x >= 6 ? 6 : item.x
  })),
  sm: DEFAULT_LAYOUT.map(item => ({
    ...item,
    w: 6,
    x: 0
  }))
}; 