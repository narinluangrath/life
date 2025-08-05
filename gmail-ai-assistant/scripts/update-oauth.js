#!/usr/bin/env node

/**
 * Script to update OAuth redirect URIs in Google Cloud Console
 * Run with: node scripts/update-oauth.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function updateOAuthConfig() {
  try {
    // Read credentials
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ credentials.json not found. Please add your Google OAuth credentials.');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const clientId = credentials.installed.client_id;
    const clientSecret = credentials.installed.client_secret;

    console.log('📋 Current OAuth Client ID:', clientId);
    console.log('🌐 New redirect URI to add: http://10.0.0.6.nip.io:3000/api/auth/google/callback');
    
    console.log('\n⚠️  MANUAL STEP REQUIRED:');
    console.log('Since we cannot programmatically update OAuth redirect URIs without additional OAuth scopes,');
    console.log('please manually add the following redirect URI to your Google Cloud Console:');
    console.log('\n1. Go to: https://console.developers.google.com/apis/credentials');
    console.log(`2. Find your OAuth 2.0 Client ID: ${clientId}`);
    console.log('3. Click on the OAuth client name to open details');
    console.log('4. Add this URI to "Authorized redirect URIs":');
    console.log('   http://10.0.0.6.nip.io:3000/api/auth/google/callback');
    console.log('5. Click "Save"');
    
    console.log('\n✅ Your .env.local has already been updated with the new URLs');
    console.log('🔄 Restart your dev server after updating Google Cloud Console');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateOAuthConfig();