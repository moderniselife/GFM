import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Layout } from 'react-grid-layout';
import { LAYOUTS, DEFAULT_LAYOUT } from '../config/layouts';

interface LayoutContextType {
  layouts: { [key: string]: Layout[] };
  setLayouts: (newLayouts: { [key: string]: Layout[] }) => void;
  saveLayout: () => void;
  resetLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layouts, setLayouts] = useState(() => {
    const savedLayouts = localStorage.getItem('gfm-layouts');
    return savedLayouts ? JSON.parse(savedLayouts) : LAYOUTS;
  });

  const saveLayout = () => {
    localStorage.setItem('gfm-layouts', JSON.stringify(layouts));
  };

  const resetLayout = () => {
    setLayouts(LAYOUTS);
    localStorage.removeItem('gfm-layouts');
  };

  return (
    <LayoutContext.Provider value={{ layouts, setLayouts, saveLayout, resetLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}; 