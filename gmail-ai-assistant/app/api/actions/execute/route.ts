import { NextRequest, NextResponse } from 'next/server';
import { ActionSuggestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { action, emailIds }: { 
      action: ActionSuggestion; 
      emailIds: string[];
    } = await request.json();

    if (!action || !emailIds?.length) {
      return NextResponse.json(
        { error: 'Action and email IDs are required' },
        { status: 400 }
      );
    }

    const result = await executeAction(action, emailIds, request);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Action execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}

async function executeAction(action: ActionSuggestion, emailIds: string[], request: NextRequest) {
  switch (action.type) {
    case 'archive':
      return await archiveEmails(emailIds, request);
    
    case 'calendar':
      return await createCalendarEvent(action.params);
    
    case 'drive':
      return await saveToDrive(action.params, emailIds);
    
    case 'task':
      return await createTask(action.params);
    
    case 'custom':
      return await executeCustomAction(action);
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function archiveEmails(emailIds: string[], request: NextRequest) {
  // Get access token from session/cookies
  const accessToken = await getAccessToken(request);
  
  const results = await Promise.allSettled(
    emailIds.map(async (emailId) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            removeLabelIds: ['INBOX']
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to archive email ${emailId}`);
      }
      
      return response.json();
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return {
    success: true,
    message: `Archived ${successful} emails${failed > 0 ? `, ${failed} failed` : ''}`,
    details: { successful, failed }
  };
}

async function createCalendarEvent(params: any) {
  // Placeholder for calendar integration
  return {
    success: true,
    message: `Calendar event suggestion: ${params.title}`,
    details: params
  };
}

async function saveToDrive(params: any, emailIds: string[]) {
  // Placeholder for Drive integration
  return {
    success: true,
    message: `Drive save suggestion for ${emailIds.length} emails`,
    details: params
  };
}

async function createTask(params: any) {
  // Placeholder for task management integration
  return {
    success: true,
    message: `Task created: ${params.title}`,
    details: params
  };
}

async function executeCustomAction(action: ActionSuggestion) {
  // Placeholder for custom actions
  return {
    success: true,
    message: `Custom action: ${action.title}`,
    details: action.params
  };
}

async function getAccessToken(request: NextRequest): Promise<string> {
  const tokensCookie = request.cookies.get('google_tokens');
  if (!tokensCookie) {
    throw new Error('Not authenticated - no tokens cookie');
  }

  const tokens = JSON.parse(tokensCookie.value);
  if (!tokens.access_token) {
    throw new Error('No access token available');
  }

  return tokens.access_token;
}