import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LogEntry {
  timestamp: Date;
  message: string;
  level?: 'info' | 'error' | 'success' | 'warning';
}

interface LogsContextType {
  logs: LogEntry[];
  addLog: (message: string, level?: 'info' | 'error' | 'success' | 'warning') => void;
  clearLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, level: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setLogs(prev => [...prev, { 
      timestamp: new Date(),
      message,
      level
    }]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogsContext.Provider>
  );
}

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
}; 