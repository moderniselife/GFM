import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextType {
  projectDir: string;
  setProjectDir: (dir: string) => void;
  syncTrigger: number;
  triggerSync: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectDir, setProjectDir] = useState('');
  const [syncTrigger, setSyncTrigger] = useState(0);

  const triggerSync = () => {
    setSyncTrigger(prev => prev + 1);
  };

  return (
    <ProjectContext.Provider value={{ projectDir, setProjectDir, syncTrigger, triggerSync }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}; 