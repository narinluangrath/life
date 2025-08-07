import { EmailGroup, ActionSuggestion, EmailAnalysis } from '../types';

export class ClaudeService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
  }

  async analyzeEmailGroup(emailGroup: EmailGroup): Promise<EmailAnalysis> {
    const prompt = this.buildAnalysisPrompt(emailGroup);
    
    console.log('Claude API key configured:', !!this.apiKey, 'Length:', this.apiKey?.length);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const suggestions = this.parseActionSuggestions(data.content[0].text);
      
      return {
        emailGroup,
        suggestions,
        reasoning: data.content[0].text
      };
    } catch (error) {
      console.error('Claude analysis error:', error);
      return {
        emailGroup,
        suggestions: [],
        reasoning: 'Analysis failed'
      };
    }
  }

  private buildAnalysisPrompt(emailGroup: EmailGroup): string {
    const messages = emailGroup.messages.slice(0, 5); // Limit for token efficiency
    
    return `Analyze these emails and suggest actionable AI-powered suggestions:

SENDER: ${emailGroup.senderName} (${emailGroup.senderEmail})
TOTAL MESSAGES: ${emailGroup.totalCount}
UNREAD: ${emailGroup.unreadCount}

RECENT MESSAGES:
${messages.map(msg => `
Subject: ${msg.subject}
Date: ${msg.date}
Content: ${msg.snippet}
${msg.body ? `Body: ${msg.body.substring(0, 500)}...` : ''}
`).join('\n---\n')}

Please suggest 1-4 specific actions from these categories:
1. ARCHIVE - If emails are outdated/promotional/already handled
2. CALENDAR - If mentions meetings/events/deadlines/payment due dates
3. DRIVE - If contains important documents/receipts/attachments to save
4. DOCS - If emails should be summarized in a document
5. TASK - If mentions todos/action items/follow-ups needed
6. CUSTOM - For other automation opportunities

IMPORTANT guidelines:
- CALENDAR: Extract ACTUAL dates from email content (due dates, payment due, meetings)
  Format dates as ISO strings. Set reminders 1-2 days before.
- DRIVE: Save important emails, receipts, statements, contracts
- DOCS: Create summary documents for email threads or reports
- TASKS: Create actionable tasks with due dates when mentioned
- Be specific and actionable in titles and descriptions

For each suggestion, provide:
- Type (archive/calendar/drive/task/custom)
- Title (short, actionable)
- Description (why this action makes sense)
- Confidence (0-100)
- Parameters (action-specific data)

Respond in valid JSON format:
{
  "suggestions": [
    {
      "type": "calendar",
      "title": "Add credit card payment due date",
      "description": "Credit card statement due date should be tracked to avoid late fees",
      "confidence": 95,
      "params": {
        "eventTitle": "Chase Credit Card Payment Due",
        "eventDate": "2024-01-25T09:00:00.000Z",
        "description": "Pay Chase credit card bill - Statement balance: $1,234.56",
        "duration": 30
      }
    }
  ]
}

Today's date for reference: ${new Date().toISOString()}`;
  }

  private parseActionSuggestions(response: string): ActionSuggestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions?.map((s: any, index: number) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: s.type,
        title: s.title,
        description: s.description,
        confidence: s.confidence || 50,
        params: s.params || {}
      })) || [];
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return [];
    }
  }
}

export const claudeService = new ClaudeService();