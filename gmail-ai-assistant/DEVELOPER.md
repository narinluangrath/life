# Gmail AI Assistant - Developer Documentation

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Core Components](#core-components)
- [API Routes](#api-routes)
- [Authentication Flow](#authentication-flow)
- [AI Integration](#ai-integration)
- [Google Services](#google-services)
- [Frontend Components](#frontend-components)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

This application is built with:
- **Next.js 14** with App Router
- **React 18** for UI components
- **TypeScript** for type safety
- **Claude AI** (Anthropic SDK) for intelligent email analysis
- **Google OAuth2** for authentication
- **Gmail API** for email operations
- **Google Workspace APIs** for productivity features

### Directory Structure
```
gmail-ai-assistant/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── page.tsx           # Main UI
│   └── layout.tsx         # Root layout
├── components/            # React components
├── lib/                   # Core libraries
│   ├── google/           # Google services
│   ├── claude/           # AI integration
│   └── types.ts          # TypeScript types
└── scripts/              # Utility scripts
```

## Getting Started

### Prerequisites
1. Node.js 18+ and npm
2. Google Cloud Project with Gmail API enabled
3. Anthropic API key for Claude
4. OAuth2 credentials from Google Cloud Console

### Quick Setup
```bash
# Clone and navigate to project
cd gmail-ai-assistant

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY

# Ensure credentials.json exists with Google OAuth credentials

# Start development server
npm run dev
```

## Core Components

### Main Application Page
**File:** [`app/page.tsx`](app/page.tsx)

The main interface that orchestrates:
- Authentication checking
- Email fetching and grouping
- AI analysis triggers
- Action execution
- Debug panel display

Key features:
- Email grouping by None/Sender/Date
- Collapsible group headers
- AI action suggestions per group
- Real-time debug logging

### Type Definitions
**File:** [`lib/types.ts`](lib/types.ts)

Central type definitions for:
- `Email` - Gmail message structure
- `EmailGroup` - Grouped emails
- `AIAction` - Action suggestions
- `GoogleServiceAction` - Workspace integrations
- Authentication types

## API Routes

### Authentication Routes

#### OAuth Initiation
**File:** [`app/api/auth/google/route.ts`](app/api/auth/google/route.ts)
- Redirects to Google OAuth consent screen
- Requests Gmail and Google Workspace scopes

#### OAuth Callback
**File:** [`app/api/auth/google/callback/route.ts`](app/api/auth/google/callback/route.ts)
- Exchanges authorization code for tokens
- Stores tokens in HTTP-only cookies
- Redirects to main application

#### Authentication Check
**File:** [`app/api/auth/check/route.ts`](app/api/auth/check/route.ts)
- Verifies current authentication status
- Returns user email and granted scopes

#### Logout
**File:** [`app/api/auth/logout/route.ts`](app/api/auth/logout/route.ts)
- Clears authentication cookies
- Redirects to login page

### Email Operations

#### Fetch Emails
**File:** [`app/api/emails/route.ts`](app/api/emails/route.ts)

Direct Gmail API implementation (bypasses googleapis library):
```javascript
// Fetches messages with pagination
const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20`;

// Gets full message details
const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`;
```

Returns formatted email data with sender, subject, date, and snippet.

### AI Integration

#### Email Analysis
**File:** [`app/api/claude/analyze/route.ts`](app/api/claude/analyze/route.ts)

Analyzes email groups and suggests actions:
- Summarizes email content
- Identifies actionable items
- Suggests appropriate Google Workspace actions
- Returns structured action data

#### Action Execution
**File:** [`app/api/actions/execute/route.ts`](app/api/actions/execute/route.ts)

Executes AI-suggested actions:
- Archive emails
- Create calendar events
- Save to Google Drive
- Create Google Docs
- Add Google Tasks

## Authentication Flow

### OAuth2 Implementation
**File:** [`lib/google/auth.ts`](lib/google/auth.ts)

```javascript
// OAuth2 client creation
const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Token management
oauth2Client.setCredentials({
  access_token,
  refresh_token,
  scope,
  token_type
});
```

### Cookie-based Session
Tokens stored in HTTP-only cookies:
- `google_access_token` - API access
- `google_refresh_token` - Token refresh
- `google_scope` - Granted permissions

## AI Integration

### Claude Service
**File:** [`lib/claude/index.ts`](lib/claude/index.ts)

Intelligent email analysis using Claude 3.5 Sonnet:
```javascript
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Analyzes emails and suggests actions
async function analyzeEmails(emails: Email[]): Promise<AIAction[]>
```

### Custom React Hook
**File:** [`lib/hooks/useAIActions.ts`](lib/hooks/useAIActions.ts)

Manages AI analysis state:
```javascript
const { 
  aiActions,        // Action suggestions
  isAnalyzing,      // Loading state
  analyzeGroup,     // Trigger analysis
  executeAction     // Execute suggested action
} = useAIActions();
```

## Google Services

### Gmail Service
**File:** [`lib/google/gmail.ts`](lib/google/gmail.ts)
- Message fetching
- Email archiving
- Label management

### Calendar Integration
**File:** [`lib/google/calendar.ts`](lib/google/calendar.ts)
- Event creation from emails
- Meeting extraction
- Smart scheduling

### Drive Operations
**File:** [`lib/google/drive.ts`](lib/google/drive.ts)
- File saving
- Email attachment handling
- Content organization

### Docs Creation
**File:** [`lib/google/docs.ts`](lib/google/docs.ts)
- Document generation
- Email summaries
- Meeting notes

### Tasks Management
**File:** [`lib/google/tasks.ts`](lib/google/tasks.ts)
- Task creation
- Action item tracking
- Due date management

### Configuration
**File:** [`lib/google/config.ts`](lib/google/config.ts)
- Credentials loading
- Environment validation
- Service initialization

## Frontend Components

### Action Suggestions UI
**File:** [`components/ActionSuggestions.tsx`](components/ActionSuggestions.tsx)

Displays AI-generated actions with:
- Icon-based action types
- One-click execution
- Loading states
- Success/error feedback

### Email Group Component
**File:** [`components/EmailGroupWithActions.tsx`](components/EmailGroupWithActions.tsx)

Groups emails with:
- Collapsible headers
- Email count badges
- Integrated AI actions
- Visual grouping indicators

## Development Workflow

### Running Tests
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Development with logging
npm run dev > dev-server.log 2>&1 &
tail -f dev-server.log
```

### Debug Endpoints

#### Authentication Debug
**File:** [`app/api/auth/debug/route.ts`](app/api/auth/debug/route.ts)
- Check current auth status
- Verify token validity
- Inspect granted scopes

#### Gmail Test
**File:** [`app/api/test-gmail/route.ts`](app/api/test-gmail/route.ts)
- Test Gmail API connectivity
- Verify message fetching
- Debug API responses

#### AI Test
**File:** [`app/api/test-ai/route.ts`](app/api/test-ai/route.ts)
- Test Claude integration
- Verify prompt processing
- Debug AI responses

## Troubleshooting

### Common Issues

#### Google APIs Library Bug
The `googleapis` npm package has an authentication bug. We use direct HTTP requests instead:

```javascript
// Don't use this (broken):
const gmail = google.gmail({ version: 'v1', auth });

// Use this instead:
fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### OAuth Scope Issues
Ensure all required scopes are requested in [`app/api/auth/google/route.ts`](app/api/auth/google/route.ts):
- `gmail.readonly` - Read emails
- `gmail.modify` - Archive/label
- `calendar` - Calendar events
- `drive.file` - Save files
- `documents` - Create docs
- `tasks` - Manage tasks

#### Token Refresh
Tokens auto-refresh via the OAuth2Client. Check [`lib/google/auth.ts`](lib/google/auth.ts) for implementation.

### Debug Panel
The main page includes a debug panel showing:
- API call logs
- Authentication status
- Error messages
- Permission checks

Enable with the "Show Debug Info" button in the UI.

## Key Implementation Details

### Email Grouping Logic
**Location:** [`app/page.tsx`](app/page.tsx)

Groups emails by:
- **None**: All emails in one list
- **Sender**: Group by email address
- **Date**: Group by day

### AI Prompt Engineering
**Location:** [`lib/claude/index.ts`](lib/claude/index.ts)

Structured prompts for:
- Email summarization
- Action identification
- Context extraction
- Priority assessment

### State Management
Uses React hooks and local state:
- No external state library
- Server-side data fetching
- Client-side caching
- Optimistic UI updates

## Contributing

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

### Adding New Features

1. **New API Route**: Add to `app/api/`
2. **New Google Service**: Add to `lib/google/`
3. **New Component**: Add to `components/`
4. **Update Types**: Modify `lib/types.ts`

### Testing Checklist
- [ ] OAuth flow works
- [ ] Emails fetch correctly
- [ ] AI analysis returns actions
- [ ] Actions execute successfully
- [ ] Error states handled
- [ ] Loading states shown
- [ ] Mobile responsive

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [Google OAuth2 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions:
1. Check the debug panel for errors
2. Review server logs: `tail -f dev-server.log`
3. Verify environment variables
4. Check Google Cloud Console for API status
5. Review this documentation

---

*Last updated: Current state of codebase*