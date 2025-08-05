import { GoogleCredentials } from '../types';
import { readFileSync } from 'fs';
import { join } from 'path';

let credentials: GoogleCredentials | null = null;

export function getGoogleCredentials(): GoogleCredentials {
  if (!credentials) {
    try {
      // In production, you might want to store this differently
      const credentialsPath = join(process.cwd(), 'credentials.json');
      const credentialsData = readFileSync(credentialsPath, 'utf-8');
      credentials = JSON.parse(credentialsData);
    } catch (error) {
      throw new Error('Failed to load Google credentials. Make sure credentials.json exists.');
    }
  }
  return credentials!;
}

export function getGoogleOAuthConfig() {
  const creds = getGoogleCredentials();
  return {
    clientId: creds.installed.client_id,
    clientSecret: creds.installed.client_secret,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  };
}