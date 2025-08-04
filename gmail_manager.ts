#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run
/**
 * Gmail API Manager - TypeScript/Deno implementation
 * Programmatically access Gmail to read, archive messages and create drafts
 */

import { OAuth2Client } from "npm:google-auth-library@^9.0.0";
import { gmail_v1, google } from "npm:googleapis@^128.0.0";
import * as path from "https://deno.land/std@0.220.1/path/mod.ts";

interface GmailMessage {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  labels: string[];
}

interface MessageContent {
  id: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
  labels: string[];
}

interface Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    redirect_uris: string[];
  };
}

interface Token {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class GmailManager {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  
  // Scopes required for read, modify, and compose operations
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
  ];

  constructor(
    private credentialsPath: string = './credentials.json',
    private tokenPath: string = './token.json'
  ) {}

  /**
   * Initialize Gmail API client with OAuth2
   */
  async initialize(): Promise<void> {
    try {
      // Read credentials
      const credentialsData = await Deno.readTextFile(this.credentialsPath);
      const credentials: Credentials = JSON.parse(credentialsData);
      
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      
      // Create OAuth2 client with localhost:8080 for local server callback
      this.oauth2Client = new OAuth2Client(
        client_id,
        client_secret,
        'http://localhost:8080'
      );

      // Try to load existing token
      let token: Token | null = null;
      try {
        const tokenData = await Deno.readTextFile(this.tokenPath);
        token = JSON.parse(tokenData);
      } catch {
        // Token doesn't exist, need to authorize
        console.log("No token found, need to authorize");
      }

      if (token) {
        this.oauth2Client.setCredentials(token);
        
        // Check if token is expired and refresh if needed
        if (token.expiry_date && token.expiry_date <= Date.now()) {
          console.log("Token expired, refreshing...");
          const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
          await this.saveToken(newCredentials as Token);
        }
      } else {
        // Get new token
        await this.getNewToken();
      }

      // Create Gmail service
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      console.log("✓ Successfully authenticated with Gmail API");
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Get and save new token through OAuth2 flow
   */
  private async getNewToken(): Promise<void> {
    if (!this.oauth2Client) throw new Error("OAuth2 client not initialized");

    console.log('\n=== Choose Authorization Method ===\n');
    console.log('1. Manual - Copy/paste authorization code (for SSH/remote)');
    console.log('2. Local server - Automatic (requires local browser access)');
    console.log('\nEnter choice (1 or 2): ');
    
    const buf = new Uint8Array(10);
    const n = await Deno.stdin.read(buf);
    if (n === null) throw new Error("Failed to read choice");
    const choice = new TextDecoder().decode(buf.subarray(0, n)).trim();

    if (choice === '2') {
      // Local server method
      await this.getNewTokenWithServer();
    } else {
      // Manual method for SSH
      await this.getNewTokenManual();
    }
  }

  /**
   * Manual token entry for SSH/remote access
   */
  private async getNewTokenManual(): Promise<void> {
    if (!this.oauth2Client) throw new Error("OAuth2 client not initialized");

    // Use the original redirect URI from credentials
    const credentialsData = await Deno.readTextFile(this.credentialsPath);
    const credentials: Credentials = JSON.parse(credentialsData);
    const { redirect_uris } = credentials.installed;
    
    // Update client to use original redirect URI
    this.oauth2Client.redirectUri = redirect_uris[0];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });

    console.log('\n=== Gmail Authorization (Manual Mode) ===\n');
    console.log('1. Open this URL in your browser:\n');
    console.log(authUrl);
    console.log('\n2. Sign in and authorize the app');
    console.log('3. You will be redirected to: http://localhost/?code=XXXXX&scope=...');
    console.log('4. Copy ONLY the code value (after "code=" and before "&")');
    console.log('\nEnter the authorization code: ');
    
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);
    if (n === null) throw new Error("Failed to read authorization code");
    
    const code = new TextDecoder().decode(buf.subarray(0, n)).trim();

    console.log('Exchanging code for tokens...');
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save token for future use
      await this.saveToken(tokens as Token);
      console.log('✓ Token stored to', this.tokenPath);
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      console.log('\nMake sure you copied only the code value, not the entire URL');
      throw error;
    }
  }

  /**
   * Local server method for automatic token retrieval
   */
  private async getNewTokenWithServer(): Promise<void> {
    if (!this.oauth2Client) throw new Error("OAuth2 client not initialized");

    // Start a local server to receive the callback
    const server = Deno.listen({ port: 8080 });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });

    console.log('\n=== Gmail Authorization (Local Server) ===\n');
    console.log('Opening authorization URL in your browser...');
    console.log('If the browser does not open, manually visit:');
    console.log(authUrl);
    
    // Try to open browser automatically
    try {
      const cmd = Deno.build.os === "darwin" ? "open" : 
                  Deno.build.os === "windows" ? "start" : "xdg-open";
      await new Deno.Command(cmd, { args: [authUrl] }).output();
    } catch {
      console.log('Please open the URL manually in your browser');
    }

    console.log('\nWaiting for authorization on http://localhost:8080...');

    // Wait for the authorization callback
    for await (const conn of server) {
      const httpConn = Deno.serveHttp(conn);
      for await (const requestEvent of httpConn) {
        const url = new URL(requestEvent.request.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          // Send success response to browser
          const html = `
            <html>
              <head><title>Authorization Successful</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: green;">✓ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>`;
          
          await requestEvent.respondWith(new Response(html, {
            status: 200,
            headers: { "content-type": "text/html" }
          }));
          
          // Exchange code for tokens
          console.log('Authorization received! Exchanging for tokens...');
          const { tokens } = await this.oauth2Client.getToken(code);
          this.oauth2Client.setCredentials(tokens);
          
          // Save token for future use
          await this.saveToken(tokens as Token);
          console.log('✓ Token stored to', this.tokenPath);
          
          // Close the server
          server.close();
          return;
        } else {
          // Handle other requests
          await requestEvent.respondWith(
            new Response("Waiting for authorization...", { status: 200 })
          );
        }
      }
    }
  }

  /**
   * Save token to file
   */
  private async saveToken(token: Token): Promise<void> {
    await Deno.writeTextFile(this.tokenPath, JSON.stringify(token, null, 2));
  }

  /**
   * Get messages from Gmail inbox
   */
  async getMessages(query: string = '', maxResults: number = 10): Promise<GmailMessage[]> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      // Get message IDs
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = listResponse.data.messages || [];
      const detailedMessages: GmailMessage[] = [];

      // Get details for each message
      for (const message of messages) {
        if (!message.id) continue;

        const msgDetail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = msgDetail.data.payload?.headers || [];
        const headerMap = headers.reduce((acc, header) => {
          if (header.name && header.value) {
            acc[header.name] = header.value;
          }
          return acc;
        }, {} as Record<string, string>);

        detailedMessages.push({
          id: message.id,
          subject: headerMap['Subject'] || 'No Subject',
          sender: headerMap['From'] || 'Unknown Sender',
          date: headerMap['Date'] || 'Unknown Date',
          snippet: msgDetail.data.snippet || '',
          labels: msgDetail.data.labelIds || [],
        });
      }

      return detailedMessages;
    } catch (error) {
      console.error(`Error getting messages: ${error}`);
      return [];
    }
  }

  /**
   * Get full content of a specific message
   */
  async getMessageContent(messageId: string): Promise<MessageContent | null> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const headers = message.data.payload?.headers || [];
      const headerMap = headers.reduce((acc, header) => {
        if (header.name && header.value) {
          acc[header.name] = header.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const body = this.extractMessageBody(message.data.payload);

      return {
        id: messageId,
        subject: headerMap['Subject'] || 'No Subject',
        sender: headerMap['From'] || 'Unknown Sender',
        date: headerMap['Date'] || 'Unknown Date',
        body,
        labels: message.data.labelIds || [],
      };
    } catch (error) {
      console.error(`Error getting message content: ${error}`);
      return null;
    }
  }

  /**
   * Extract text body from message payload
   */
  private extractMessageBody(payload: any): string {
    let body = "";

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = this.decodeBase64(part.body.data);
          break;
        }
      }
    } else if (payload.mimeType === 'text/plain' && payload.body?.data) {
      body = this.decodeBase64(payload.body.data);
    }

    return body;
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(data: string): string {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      const paddedBase64 = base64 + '='.repeat(padding === 0 ? 0 : 4 - padding);
      
      const decoder = new TextDecoder();
      const bytes = Uint8Array.from(atob(paddedBase64), c => c.charCodeAt(0));
      return decoder.decode(bytes);
    } catch (error) {
      console.error(`Error decoding base64: ${error}`);
      return "";
    }
  }

  /**
   * Archive a message (remove from inbox)
   */
  async archiveMessage(messageId: string): Promise<boolean> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });

      console.log(`✓ Message ${messageId} archived`);
      return true;
    } catch (error) {
      console.error(`Error archiving message: ${error}`);
      return false;
    }
  }

  /**
   * Archive multiple messages
   */
  async archiveMessages(messageIds: string[]): Promise<number> {
    let successCount = 0;
    for (const msgId of messageIds) {
      if (await this.archiveMessage(msgId)) {
        successCount++;
      }
    }
    return successCount;
  }

  /**
   * Create a draft message
   */
  async createDraft(to: string, subject: string, body: string, sender?: string): Promise<string | null> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      // Create email content
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        sender ? `From: ${sender}` : '',
        '',
        body,
      ].filter(line => line !== '').join('\n');

      // Encode in base64url
      const encodedEmail = btoa(email)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const draft = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      const draftId = draft.data.id;
      if (draftId) {
        console.log(`✓ Draft created with ID: ${draftId}`);
        return draftId;
      }
      return null;
    } catch (error) {
      console.error(`Error creating draft: ${error}`);
      return null;
    }
  }

  /**
   * Send an email message
   */
  async sendMessage(to: string, subject: string, body: string, sender?: string): Promise<string | null> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      // Create email content
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        sender ? `From: ${sender}` : '',
        '',
        body,
      ].filter(line => line !== '').join('\n');

      // Encode in base64url
      const encodedEmail = btoa(email)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const message = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      const messageId = message.data.id;
      if (messageId) {
        console.log(`✓ Message sent with ID: ${messageId}`);
        return messageId;
      }
      return null;
    } catch (error) {
      console.error(`Error sending message: ${error}`);
      return null;
    }
  }

  /**
   * Get all Gmail labels
   */
  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      return response.data.labels || [];
    } catch (error) {
      console.error(`Error listing labels: ${error}`);
      return [];
    }
  }

  /**
   * Search messages with specific query
   * 
   * Examples:
   * - 'is:unread' - Unread messages
   * - 'from:example@gmail.com' - Messages from specific sender
   * - 'subject:meeting' - Messages with 'meeting' in subject
   * - 'has:attachment' - Messages with attachments
   * - 'is:important' - Important messages
   */
  async searchMessages(query: string, maxResults: number = 50): Promise<GmailMessage[]> {
    return this.getMessages(query, maxResults);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      console.log(`✓ Message ${messageId} marked as read`);
      return true;
    } catch (error) {
      console.error(`Error marking message as read: ${error}`);
      return false;
    }
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId: string): Promise<boolean> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });

      console.log(`✓ Message ${messageId} marked as unread`);
      return true;
    } catch (error) {
      console.error(`Error marking message as unread: ${error}`);
      return false;
    }
  }

  /**
   * Delete a message permanently
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId,
      });

      console.log(`✓ Message ${messageId} deleted permanently`);
      return true;
    } catch (error) {
      console.error(`Error deleting message: ${error}`);
      return false;
    }
  }

  /**
   * Move message to trash
   */
  async trashMessage(messageId: string): Promise<boolean> {
    if (!this.gmail) throw new Error("Gmail API not initialized");

    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });

      console.log(`✓ Message ${messageId} moved to trash`);
      return true;
    } catch (error) {
      console.error(`Error moving message to trash: ${error}`);
      return false;
    }
  }
}

/**
 * Example usage and CLI interface
 */
async function main() {
  try {
    // Initialize Gmail manager
    const gmail = new GmailManager('./credentials.json', './token.json');
    await gmail.initialize();

    // Parse command line arguments
    const args = Deno.args;
    
    if (args.length === 0) {
      // Default demo mode
      console.log("\n=== Gmail Manager Demo ===");
      
      // List available labels
      console.log("\n=== Available Labels ===");
      const labels = await gmail.listLabels();
      labels.slice(0, 10).forEach(label => {
        console.log(`- ${label.name}`);
      });

      // Get recent messages
      console.log("\n=== Recent Messages ===");
      const messages = await gmail.getMessages('', 5);
      for (const msg of messages) {
        console.log(`From: ${msg.sender}`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Snippet: ${msg.snippet.substring(0, 100)}...`);
        console.log("-".repeat(50));
      }

      // Search for unread messages
      console.log("\n=== Unread Messages ===");
      const unread = await gmail.searchMessages('is:unread', 3);
      for (const msg of unread) {
        console.log(`From: ${msg.sender}`);
        console.log(`Subject: ${msg.subject}`);
      }
    } else {
      // CLI mode
      const command = args[0];
      
      switch (command) {
        case 'list':
          const query = args[1] || '';
          const limit = parseInt(args[2] || '10');
          const messages = await gmail.getMessages(query, limit);
          console.log(JSON.stringify(messages, null, 2));
          break;
          
        case 'read':
          if (!args[1]) {
            console.error("Message ID required");
            Deno.exit(1);
          }
          const content = await gmail.getMessageContent(args[1]);
          console.log(JSON.stringify(content, null, 2));
          break;
          
        case 'archive':
          if (!args[1]) {
            console.error("Message ID required");
            Deno.exit(1);
          }
          await gmail.archiveMessage(args[1]);
          break;
          
        case 'draft':
          if (args.length < 4) {
            console.error("Usage: draft <to> <subject> <body>");
            Deno.exit(1);
          }
          await gmail.createDraft(args[1], args[2], args[3]);
          break;
          
        case 'send':
          if (args.length < 4) {
            console.error("Usage: send <to> <subject> <body>");
            Deno.exit(1);
          }
          await gmail.sendMessage(args[1], args[2], args[3]);
          break;
          
        case 'labels':
          const allLabels = await gmail.listLabels();
          console.log(JSON.stringify(allLabels, null, 2));
          break;
          
        case 'help':
        default:
          console.log(`
Gmail Manager CLI

Usage: deno run --allow-all gmail_manager.ts [command] [args]

Commands:
  list [query] [limit]     - List messages (default: 10 recent)
  read <messageId>         - Read full message content
  archive <messageId>      - Archive a message
  draft <to> <subject> <body> - Create a draft
  send <to> <subject> <body>  - Send an email
  labels                   - List all labels
  help                     - Show this help

Examples:
  deno run --allow-all gmail_manager.ts list "is:unread" 5
  deno run --allow-all gmail_manager.ts read "18abc123def"
  deno run --allow-all gmail_manager.ts send "user@example.com" "Hello" "This is a test"
          `);
          break;
      }
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('credentials')) {
      console.error("Setup required: credentials.json not found");
      console.log("\nTo get started:");
      console.log("1. Go to https://console.cloud.google.com/");
      console.log("2. Create a new project or select existing");
      console.log("3. Enable Gmail API");
      console.log("4. Create OAuth2 credentials (Desktop Application)");
      console.log("5. Download credentials.json to this directory");
    } else {
      console.error(`Error: ${error}`);
    }
  }
}

// Run main if this file is executed directly
if (import.meta.main) {
  main();
}