import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

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

const MAX_LOGS = 1000; // Maximum number of logs to keep
const BUFFER_INTERVAL = 100; // Buffer interval in milliseconds

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bufferRef = useRef<LogEntry[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length > 0) {
      setLogs(prev => {
        const newLogs = [...prev, ...bufferRef.current];
        // Keep only the last MAX_LOGS entries
        return newLogs.slice(-MAX_LOGS);
      });
      bufferRef.current = [];
    }
    timeoutRef.current = null;
  }, []);

  const addLog = useCallback((
    message: string,
    level: 'info' | 'error' | 'success' | 'warning' = 'info'
  ) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      message,
      level,
    };

    bufferRef.current.push(newLog);

    // Set up delayed flush if not already scheduled
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(flushBuffer, BUFFER_INTERVAL);
    }
  }, [flushBuffer]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    bufferRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs }}>{children}</LogsContext.Provider>
  );
}

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};
