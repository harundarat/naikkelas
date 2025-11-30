import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), '.logs');
const logFile = path.join(logDir, 'app.log');

const log = (level: string, message: string, details?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };

  // In a Vercel environment, just log to the console.
  if (process.env.VERCEL) {
    console.log(JSON.stringify(logEntry));
    return;
  }

  // For local development, write to a file.
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const logString = JSON.stringify(logEntry) + '\n';

  // Append to file
  fs.appendFileSync(logFile, logString);

  // Also log to console for immediate visibility during development
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(logEntry, null, 2));
  }
};

export const logger = {
  info: (message: string, details?: any) => log('INFO', message, details),
  warn: (message: string, details?: any) => log('WARN', message, details),
  error: (message: string, details?: any) => log('ERROR', message, details),
  debug: (message: string, details?: any) => log('DEBUG', message, details),
};
