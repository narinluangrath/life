# Gmail API Manager (Deno + TypeScript)

Programmatically access Gmail to read, archive messages, and create drafts using Deno and TypeScript.

## Features

- ✅ **Read Messages**: Get inbox messages with filtering/search
- ✅ **Archive Messages**: Remove messages from inbox (single or batch)
- ✅ **Create Drafts**: Compose draft emails
- ✅ **Search**: Gmail-style search queries
- ✅ **TypeScript**: Full type safety
- ✅ **Deno Native**: No Node.js required

## Setup

### 1. Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Create OAuth2 credentials (Desktop Application)
5. Download `credentials.json` to this directory

### 2. Install Deno

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 3. Run the Manager

```bash
# Run once
deno task gmail

# Run with auto-reload during development
deno task gmail:dev

# Or run directly
deno run --allow-net --allow-read --allow-write gmail_manager.ts
```

## Usage

### Basic Example

```typescript
import { GmailManager } from "./gmail_manager.ts";

const gmail = new GmailManager('./credentials.json');
await gmail.initialize();

// Get recent messages
const messages = await gmail.getMessages('', 10);
console.log(messages);

// Search for unread messages
const unread = await gmail.searchMessages('is:unread');

// Archive a message
await gmail.archiveMessage(messageId);

// Create a draft
await gmail.createDraft(
  "recipient@example.com",
  "Subject",
  "Email body content"
);
```

### Search Queries

Use Gmail's search syntax:

```typescript
// Unread messages
await gmail.searchMessages('is:unread');

// From specific sender  
await gmail.searchMessages('from:example@gmail.com');

// Messages with attachments
await gmail.searchMessages('has:attachment');

// Important messages
await gmail.searchMessages('is:important');

// Subject contains word
await gmail.searchMessages('subject:meeting');

// Combine queries
await gmail.searchMessages('is:unread from:boss@company.com');
```

### Archive Messages

```typescript
// Archive single message
await gmail.archiveMessage(messageId);

// Archive multiple messages
const messageIds = ['msg1', 'msg2', 'msg3'];
const archivedCount = await gmail.archiveMessages(messageIds);
```

## API Reference

### `GmailManager`

#### Methods

- `initialize()`: Authenticate and initialize Gmail API client
- `getMessages(query?, maxResults?)`: Get messages with optional search
- `getMessageContent(messageId)`: Get full message content including body
- `archiveMessage(messageId)`: Archive a single message
- `archiveMessages(messageIds[])`: Archive multiple messages
- `createDraft(to, subject, body, sender?)`: Create a draft email
- `listLabels()`: Get all Gmail labels
- `searchMessages(query, maxResults?)`: Search messages

#### Types

```typescript
interface GmailMessage {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  labels: string[];
}

interface MessageContent extends GmailMessage {
  body: string;
}
```

## Authentication

The first run will open a browser to authenticate with Google OAuth2. Credentials are cached in `token.json` for subsequent runs.

Required scopes:
- `gmail.readonly` - Read messages and labels
- `gmail.modify` - Archive/modify messages  
- `gmail.compose` - Create drafts and send emails

## Permissions

Deno requires explicit permissions:

- `--allow-net`: Gmail API calls
- `--allow-read`: Read credentials files
- `--allow-write`: Write token cache

## Examples

See the `main()` function in `gmail_manager.ts` for complete usage examples.