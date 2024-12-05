import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface LogsContextType {
  logs: LogEntry[];
  addLog: (message: string, type?: 'info' | 'error' | 'success') => void;
  clearLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
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