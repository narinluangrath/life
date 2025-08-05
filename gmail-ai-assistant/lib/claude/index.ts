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

Please suggest 1-3 specific actions from these categories:
1. ARCHIVE - If emails are outdated/promotional
2. CALENDAR - If mentions meetings/events/deadlines
3. DRIVE - If mentions documents/files to save
4. TASK - If mentions todos/action items
5. CUSTOM - For other automation opportunities

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
      "title": "Add meeting to calendar",
      "description": "Email mentions a meeting on Friday at 2pm",
      "confidence": 85,
      "params": {
        "title": "Team Meeting",
        "date": "2024-01-12",
        "time": "14:00"
      }
    }
  ]
}`;
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