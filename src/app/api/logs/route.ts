import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), '.logs', 'app.log');

export async function GET() {
  try {
    if (!fs.existsSync(logFile)) {
      return NextResponse.json([]);
    }

    const logData = fs.readFileSync(logFile, 'utf-8');
    const logEntries = logData
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line));

    return NextResponse.json(logEntries.reverse()); // Show newest logs first

  } catch (error) {
    console.error('Error reading log file:', error);
    return NextResponse.json({ error: 'Failed to read log file' }, { status: 500 });
  }
}
