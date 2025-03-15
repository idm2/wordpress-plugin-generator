import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the connector plugin ZIP file
    const connectorPluginPath = path.join(process.cwd(), 'public', 'plugin-generator-connector.zip');
    
    // Check if the file exists
    if (!fs.existsSync(connectorPluginPath)) {
      console.error('Connector plugin file not found:', connectorPluginPath);
      return NextResponse.json(
        { error: 'Connector plugin file not found' },
        { status: 404 }
      );
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(connectorPluginPath);
    
    // Convert to base64
    const base64content = fileBuffer.toString('base64');
    
    // Return the base64 content
    return NextResponse.json({ base64content });
  } catch (error) {
    console.error('Error serving connector plugin:', error);
    return NextResponse.json(
      { error: 'Failed to serve connector plugin' },
      { status: 500 }
    );
  }
} 