# Gmail AI Assistant

A Next.js web application that provides AI-powered Gmail management using Claude for intelligent email processing and automation.

## Overview

This project combines Gmail API integration with Claude AI to create an intelligent email assistant that can:
- Analyze emails for actionable insights
- Suggest automated responses and actions
- Provide smart email organization and filtering
- Extract and process information from emails

## Setup

1. **Google Cloud Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Gmail API for your project
   - Create OAuth2 credentials (Web Application)
   - Add authorized redirect URIs for your Next.js app
   - Download credentials and place in `gmail-ai-assistant/credentials.json`

2. **Environment Variables:**
   ```bash
   cd gmail-ai-assistant
   cp .env.local.example .env.local
   # Add your API keys and configuration
   ```

3. **Install Dependencies:**
   ```bash
   cd gmail-ai-assistant
   npm install
   ```

4. **Development Server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
gmail-ai-assistant/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/          # Google OAuth handlers
│   │   ├── emails/        # Gmail API endpoints
│   │   └── claude/        # Claude AI integration
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── components/             # React components
├── lib/                   # Utility libraries
│   ├── google/           # Gmail API integration
│   ├── claude/           # Claude AI helpers
│   └── types.ts          # TypeScript definitions
└── credentials.json       # Google OAuth credentials
```

## Key Features

### Authentication
- Google OAuth2 integration for Gmail access
- Secure token management and refresh
- Logout functionality for secure session management
- Scoped permissions for email operations

### Gmail Integration  
- Read and search emails
- Archive and organize messages
- Extract email metadata and content
- Handle attachments and threading
- Email grouping by sender or date with collapsible sections

### AI Processing
- Claude integration for email analysis
- Smart action suggestions
- Content summarization
- Automated response generation

### User Interface
- Interactive email grouping (None/Sender/Date)
- Collapsible group headers with visual indicators
- Smart display optimization based on grouping mode
- Clean, responsive design optimized for mobile

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Debugging Workflow

For debugging OAuth and API issues, run the dev server in background with logging:

```bash
# Stop any existing dev server
pkill -f "next dev"

# Start dev server in background with logging
nohup npm run dev > dev-server.log 2>&1 &

# Monitor logs in real-time
tail -f dev-server.log

# View recent logs after testing
tail -50 dev-server.log

# View specific number of log lines
tail -N dev-server.log  # where N is number of lines
```

This allows you to:
- Run the dev server in background while using the terminal
- Capture all server logs including errors and OAuth flow
- Monitor API calls and responses for debugging
- Test on phone while collecting server-side logs

## Gmail API Scopes

The application uses these OAuth2 scopes:
- `gmail.readonly` - Read email messages
- `gmail.modify` - Archive/label messages
- `gmail.compose` - Create draft responses

## Security Notes

- Credentials are git-ignored and must be configured locally
- OAuth tokens are handled securely with automatic refresh
- All operations are scoped to authenticated user's Gmail only
- No destructive operations by default (archive-only)

## Known Issues

### Google APIs Library Authentication Bug

The official `googleapis` Node.js library has an authentication issue where it fails to include the `Authorization: Bearer` header in API requests, even when valid OAuth2 credentials are properly set on the client. This results in "Login Required" 401 errors despite having valid access tokens.

**Symptoms:**
- OAuth flow works perfectly and returns valid tokens
- Direct HTTP requests with Bearer token work fine
- `googleapis` library requests fail with "Login Required"
- Request logs show missing Authorization header

**Workaround:**
The application bypasses the `googleapis` library and uses direct HTTP requests to Gmail API endpoints with manually added Authorization headers. This approach works reliably and provides the same functionality.

**Example:**
```javascript
// Instead of googleapis library:
const gmail = google.gmail({ version: 'v1', auth });
const response = await gmail.users.messages.list({ userId: 'me' });

// Use direct fetch:
const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

This issue has been observed with `googleapis@131.0.0` and `google-auth-library@9.4.1`.

## Next Steps

- Implement email action suggestions UI
- Add batch processing capabilities  
- Integrate with calendar for meeting extraction
- Add email templating and smart responses
- Implement learning from user feedback