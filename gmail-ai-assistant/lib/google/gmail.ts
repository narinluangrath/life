import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParsedMessage } from '../types';

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async getMessages(query: string = '', maxResults: number = 50): Promise<ParsedMessage[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];
      const parsedMessages: ParsedMessage[] = [];

      // Get details for each message in parallel
      const messagePromises = messages
        .filter(msg => msg.id)
        .map(msg => this.getMessageDetails(msg.id!));

      const detailedMessages = await Promise.all(messagePromises);
      return detailedMessages.filter((msg): msg is ParsedMessage => msg !== null);
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  private async getMessageDetails(messageId: string): Promise<ParsedMessage | null> {
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

      // Extract sender email
      const fromHeader = headerMap['From'] || '';
      const emailMatch = fromHeader.match(/<(.+?)>/);
      const senderEmail = emailMatch ? emailMatch[1] : fromHeader;
      const senderName = fromHeader.replace(/<.*>/, '').trim() || senderEmail;

      // Extract body
      const body = this.extractMessageBody(message.data.payload);

      return {
        id: messageId,
        threadId: message.data.threadId || undefined,
        subject: headerMap['Subject'] || 'No Subject',
        sender: senderName,
        senderEmail: senderEmail,
        date: headerMap['Date'] || new Date().toISOString(),
        snippet: message.data.snippet || '',
        labels: message.data.labelIds || [],
        body,
      };
    } catch (error) {
      console.error(`Error getting message ${messageId}:`, error);
      return null;
    }
  }

  private extractMessageBody(payload: any): string {
    let body = '';

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = this.decodeBase64(part.body.data);
          break;
        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
          // Fallback to HTML if no plain text
          body = this.decodeBase64(part.body.data);
        }
      }
    } else if (payload.body?.data) {
      body = this.decodeBase64(payload.body.data);
    }

    return body;
  }

  private decodeBase64(data: string): string {
    try {
      // Convert base64url to base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      const paddedBase64 = base64 + '='.repeat(padding === 0 ? 0 : 4 - padding);
      
      return Buffer.from(paddedBase64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  }

  async archiveMessage(messageId: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });
      return true;
    } catch (error) {
      console.error(`Error archiving message ${messageId}:`, error);
      return false;
    }
  }

  async archiveMessages(messageIds: string[]): Promise<number> {
    const results = await Promise.all(
      messageIds.map(id => this.archiveMessage(id))
    );
    return results.filter(success => success).length;
  }

  async getLabels(): Promise<gmail_v1.Schema$Label[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });
      return response.data.labels || [];
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  }
}