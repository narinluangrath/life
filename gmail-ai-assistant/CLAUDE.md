# Gmail AI Assistant

## Setup

1. **Google Cloud Setup:**
   - Enable Gmail API in Google Cloud Console
   - Create OAuth2 credentials (Web Application)
   - Add redirect URI: http://localhost:3000/api/auth/google/callback
   - Save credentials as `credentials.json`

2. **Environment:**
   ```bash
   # Add to .env.local
   ANTHROPIC_API_KEY=your_api_key
   ```

3. **Run:**
   ```bash
   npm install
   npm run dev
   ```

## Features

- Gmail OAuth integration
- AI email analysis with Claude
- Execute actions: archive, create calendar events, save to Drive, create tasks
- Email grouping by sender/date

## Required Google APIs

Enable in Google Cloud Console:
- Gmail API
- Google Calendar API  
- Google Drive API
- Google Docs API
- Google Tasks API

## OAuth Scopes

- gmail.readonly
- gmail.modify
- calendar
- drive.file
- documents
- tasks