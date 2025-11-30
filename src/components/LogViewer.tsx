"use client";

import { useState, useEffect } from 'react';
import { Server, X, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  details?: any;
}

const levelColors = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-400',
};

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async (isFullFetch = false) => {
    if (!isFullFetch) setIsLoading(false); // Don't show loader for background fetches
    else setIsLoading(true);

    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        if (isFullFetch) {
          setLogs(data);
        }
        if (data.length > 0) {
          setRecentLogs(data.slice(0, 5)); // Get the first 5 (most recent) logs
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setIsLoading(false);
  };

  // Effect for fetching logs periodically
  useEffect(() => {
    fetchLogs(false); // Initial fetch
    const intervalId = setInterval(() => fetchLogs(false), 15000); // Fetch every 15s
    return () => clearInterval(intervalId);
  }, []);

  // Effect for cycling through the recent logs
  useEffect(() => {
    if (recentLogs.length === 0) return;
    const cycleTimer = setInterval(() => {
      setDisplayIndex(prevIndex => (prevIndex + 1) % recentLogs.length);
    }, 5000);
    return () => clearInterval(cycleTimer);
  }, [recentLogs]);

  // Effect for fetching all logs when the panel is opened
  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
    }
  }, [isOpen]);
  
  const currentLog = recentLogs[displayIndex];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 ease-in-out ${
        isOpen ? 'h-64' : 'h-6'
      }`}
    >
      {/* Collapsed View (Sequential Display) */}
      {!isOpen && (
        <div
          className="w-full h-full flex items-center font-mono text-[10px] px-2 cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          <Server className="w-3 h-3 text-gray-500 mr-2 flex-shrink-0" />
          <ChevronUp className="w-3 h-3 text-gray-500 mr-2 flex-shrink-0" />
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            {currentLog ? (
              <div key={displayIndex} className="flex items-center animate-fade-in">
                <span className="text-gray-400 mr-2">{new Date(currentLog.timestamp).toLocaleTimeString()}</span>
                <span className={`font-bold w-12 mr-2 ${levelColors[currentLog.level]}`}>{currentLog.level}</span>
                <span className="text-gray-600 dark:text-gray-300">{currentLog.message}</span>
              </div>
            ) : (
              <p className="text-gray-500">Initializing log stream...</p>
            )}
          </div>
        </div>
      )}

      {/* Expanded View (Detailed Log Panel) */}
      {isOpen && (
        <div className="h-full flex flex-col p-4 text-white">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h3 className="font-bold text-lg text-gray-600 dark:text-gray-300">Application Logs</h3>
            <div>
              <button onClick={() => fetchLogs(true)} disabled={isLoading} className="mr-2 h-8 w-8 text-gray-400 hover:text-white">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setIsOpen(false)} className="h-8 w-8 text-gray-400 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs pr-2">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="border-b border-gray-800 py-1.5 flex items-start">
                  <span className="text-gray-500 mr-3">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`font-bold w-14 ${levelColors[log.level]}`}>{log.level}</span>
                  <div className="flex-1 whitespace-pre-wrap text-gray-300">
                    <p>{log.message}</p>
                    {log.details && <p className="text-gray-400">{JSON.stringify(log.details)}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No logs yet. Interact with the app to generate logs.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
