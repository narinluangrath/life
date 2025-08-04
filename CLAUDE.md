# Gmail CLI Tools

A collection of TypeScript/Deno tools for managing Gmail through the command line, built for use with Claude Code.

## Setup

1. **Google Cloud Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Gmail API for your project
   - Create OAuth2 credentials (Desktop Application)
   - Download as `credentials.json`

2. **First Run Authentication:**
   ```bash
   ./gmail ls
   ```
   Choose option 1 (manual) for SSH/remote access.

## Available Tools

### 🗂️ Main CLI (`./gmail`)
GitHub CLI-style interface for Gmail operations:

```bash
./gmail ls              # List recent messages
./gmail ls 20           # List 20 recent messages  
./gmail unread          # Show unread messages
./gmail read <id>       # Read specific message
./gmail archive <id>    # Archive message
./gmail search "query"  # Search messages
./gmail labels          # List Gmail labels
./gmail help            # Show help
```

**Search Examples:**
- `./gmail search "is:unread"` - Unread messages
- `./gmail search "from:github.com"` - From specific sender
- `./gmail search "has:attachment"` - With attachments

### 🧹 Inbox Cleanup (`./inbox-clean.ts`)
Interactive tool to clean inbox by grouping messages by sender:

```bash
./inbox-clean.ts
```

Features:
- Groups messages by sender with counts
- Shows preview of recent messages per sender
- Bulk archive all messages from selected senders
- Progress indicators for large operations
- Safe operations only (no delete/send)

### 🔧 Debug Tool (`./test-gmail.ts`)
Test Gmail API connectivity:

```bash
./test-gmail.ts
```

## Quick Start

```bash
# Initial setup and test
./gmail ls

# Clean up inbox interactively  
./inbox-clean.ts

# Search for specific emails
./gmail search "from:notifications"

# Check what's unread
./gmail unread
```

## Deno Task

```bash
deno task gmail        # Runs ./gmail with no args (help)
```

## Safety Features

- **No destructive operations** - Only archive (reversible)
- **No email sending** - Create drafts only
- **Credentials protected** - .gitignore prevents commits
- **Progress feedback** - Visual indicators for long operations

## File Structure

```
├── gmail                    # Main CLI executable
├── inbox-clean.ts          # Interactive inbox cleanup
├── test-gmail.ts          # Debug/test tool  
├── gmail_manager.ts       # Core Gmail API wrapper
├── credentials.json       # OAuth2 credentials (local only)
├── token.json            # Access token (local only)
└── deno.json            # Deno configuration
```

## Common Workflows

**Daily inbox cleanup:**
```bash
./inbox-clean.ts
# Review senders, archive in bulk
```

**Find specific emails:**
```bash
./gmail search "subject:invoice"
./gmail read <message-id>
```

**Check notifications:**
```bash
./gmail unread
```

## OAuth2 Flow

The tool uses OAuth2 with the following scopes:
- `gmail.readonly` - Read messages
- `gmail.modify` - Archive/label messages  
- `gmail.compose` - Create drafts

Authentication is handled automatically with token refresh.

## Development

**Test API connection:**
```bash
./test-gmail.ts
```

**Add new features:**
Edit `gmail_manager.ts` for new Gmail operations, then update CLI interfaces.

## Notes

- Designed for SSH/remote usage (manual OAuth flow)
- Built with Deno for modern TypeScript support
- GitHub CLI-inspired interface for familiarity
- Optimized for batch operations and large inboxes