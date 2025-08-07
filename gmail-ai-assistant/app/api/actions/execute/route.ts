import { NextRequest, NextResponse } from 'next/server';
import { ActionSuggestion } from '@/lib/types';
import { createCalendarEvent, parseEmailForEventDetails } from '@/lib/google/calendar';
import { saveEmailToDrive, createDriveFolder } from '@/lib/google/drive';
import { createEmailTask, batchCreateTasks } from '@/lib/google/tasks';
import { createEmailSummaryDoc } from '@/lib/google/docs';

export async function POST(request: NextRequest) {
  try {
    const { action, emailIds }: { 
      action: ActionSuggestion; 
      emailIds: string[];
    } = await request.json();

    console.log('Action execute request:', {
      actionType: action?.type,
      actionParams: action?.params,
      emailCount: emailIds?.length
    });

    if (!action || !emailIds?.length) {
      return NextResponse.json(
        { error: 'Action and email IDs are required' },
        { status: 400 }
      );
    }

    const result = await executeAction(action, emailIds, request);
    
    return NextResponse.json({
      ...result,
      debug: result.debug || []
    });
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
      return await handleCalendarEvent(action.params, request);
    
    case 'drive':
      return await saveToDrive(action.params, emailIds, request);
    
    case 'docs':
      return await createDocument(action.params, emailIds, request);
    
    case 'task':
      return await createTask(action.params, request);
    
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
    details: { successful, failed },
    debug: []
  };
}

async function handleCalendarEvent(params: any, request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push(`Calendar event params: ${JSON.stringify(params)}`);
    
    // Get access token
    const accessToken = await getAccessToken(request);
    debugLog.push(`Got access token: ${!!accessToken ? 'YES' : 'NO'}`);
    
    // Parse the date and handle timezone properly
    let eventDate = params.eventDate || params.date;
    
    // If the date includes a time specification like "5:00-6:00pm", extract it
    const timeMatch = params.description?.match(/(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?\s*(?:am|pm))/i);
    if (timeMatch && eventDate) {
      const [timeStr] = timeMatch;
      const [startTime] = timeStr.split('-');
      
      // Parse the date and set the time
      const date = new Date(eventDate);
      const [hourStr, rest] = startTime.trim().split(':');
      const hour = parseInt(hourStr);
      const minute = parseInt(rest?.replace(/[^\d]/g, '') || '0');
      const isPM = /pm/i.test(timeStr);
      
      date.setHours(isPM && hour !== 12 ? hour + 12 : hour === 12 && !isPM ? 0 : hour, minute, 0, 0);
      eventDate = date.toISOString();
      
      debugLog.push(`Extracted time from description: ${timeStr}, Final date: ${eventDate}`);
    } else if (!eventDate) {
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      eventDate = tomorrow.toISOString();
    }
    
    // Prepare event data with smart defaults
    const eventData = {
      title: params.eventTitle || params.title || 'Event from Email',
      date: eventDate,
      description: params.description || 'Event created from Gmail emails',
      attendees: params.attendees || [],
      duration: params.duration || 60 // 60 minutes default
    };
    
    debugLog.push(`Event data: ${JSON.stringify(eventData)}`);
    
    // Create the actual calendar event
    const result = await createCalendarEvent(accessToken, eventData);
    debugLog.push(`Calendar API call successful: ${result.success}`);
    
    return {
      success: true,
      message: `✅ Calendar event created: "${eventData.title}"`,
      details: {
        ...result,
        eventUrl: result.htmlLink,
        eventId: result.eventId
      },
      debug: debugLog
    };
  } catch (error: any) {
    debugLog.push(`Calendar creation error: ${error.message}`);
    debugLog.push(`Error stack: ${error.stack?.substring(0, 200)}`);
    
    // Check if it's an auth error
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return {
        success: false,
        message: '⚠️ Calendar access not authorized. Please re-authenticate with Calendar permissions.',
        error: 'Missing calendar permissions. You may need to log out and log in again to grant calendar access.',
        debug: debugLog
      };
    }
    
    return {
      success: false,
      message: `Failed to create calendar event: ${error.message}`,
      error: error.message,
      debug: debugLog
    };
  }
}

async function saveToDrive(params: any, emailIds: string[], request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push(`Drive save params: ${JSON.stringify(params)}`);
    
    const accessToken = await getAccessToken(request);
    debugLog.push(`Got access token: ${!!accessToken ? 'YES' : 'NO'}`);
    
    // Fetch actual email content
    let emailContent = {
      subject: params.subject || params.emailSubject || 'Email',
      from: params.from || params.sender || 'Unknown',
      date: params.date || params.emailDate || new Date().toISOString(),
      body: params.body || params.emailBody || '',
      attachments: params.attachments || []
    };
    
    // If we have email IDs, fetch the actual email content
    if (emailIds.length > 0 && (!emailContent.body || emailContent.body === '')) {
      try {
        const emailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailIds[0]}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          const headers = emailData.payload?.headers || [];
          const subjectHeader = headers.find((h: any) => h.name === 'Subject');
          const fromHeader = headers.find((h: any) => h.name === 'From');
          const dateHeader = headers.find((h: any) => h.name === 'Date');
          
          if (subjectHeader) emailContent.subject = subjectHeader.value;
          if (fromHeader) emailContent.from = fromHeader.value;
          if (dateHeader) emailContent.date = dateHeader.value;
          
          // Extract body
          const extractBody = (part: any): string => {
            if (part.body?.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
              return part.parts.map(extractBody).join('\n');
            }
            return '';
          };
          
          emailContent.body = extractBody(emailData.payload);
          debugLog.push(`Fetched actual email content: Subject="${emailContent.subject}"`);
        }
      } catch (error: any) {
        debugLog.push(`Failed to fetch email content: ${error.message}`);
      }
    }
    
    // Use the specified filename if provided
    const customFileName = params.fileName;
    
    const result = await saveEmailToDrive(accessToken, emailContent, customFileName);
    debugLog.push(`Drive save successful: ${result.success}`);
    
    return {
      success: true,
      message: `✅ Saved to Google Drive: "${result.name}"`,
      details: {
        fileId: result.fileId,
        webViewLink: result.webViewLink,
        fileName: result.name
      },
      debug: debugLog
    };
  } catch (error: any) {
    debugLog.push(`Drive save error: ${error.message}`);
    return {
      success: false,
      message: `Failed to save to Drive: ${error.message}`,
      error: error.message,
      debug: debugLog
    };
  }
}

async function createTask(params: any, request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push(`Task params: ${JSON.stringify(params)}`);
    
    const accessToken = await getAccessToken(request);
    debugLog.push(`Got access token: ${!!accessToken ? 'YES' : 'NO'}`);
    
    // Handle batch task creation if multiple tasks provided
    if (params.tasks && Array.isArray(params.tasks)) {
      const result = await batchCreateTasks(accessToken, params.tasks);
      debugLog.push(`Batch task creation: ${result.message}`);
      
      return {
        ...result,
        message: `✅ ${result.message}`,
        debug: debugLog
      };
    }
    
    // Single task creation
    const emailData = {
      subject: params.title || params.subject || 'Task from Email',
      from: params.from || 'Email',
      snippet: params.description || params.notes || '',
      dueDate: params.dueDate || params.due
    };
    
    const result = await createEmailTask(accessToken, emailData);
    debugLog.push(`Task created: ${result.task.title}`);
    
    return {
      success: true,
      message: `✅ Task created: "${result.task.title}"`,
      details: {
        taskId: result.task.id,
        webViewLink: result.task.webViewLink,
        dueDate: result.task.due
      },
      debug: debugLog
    };
  } catch (error: any) {
    debugLog.push(`Task creation error: ${error.message}`);
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return {
        success: false,
        message: '⚠️ Tasks access not authorized. Please re-authenticate with Tasks permissions.',
        error: 'Missing tasks permissions',
        debug: debugLog
      };
    }
    
    return {
      success: false,
      message: `Failed to create task: ${error.message}`,
      error: error.message,
      debug: debugLog
    };
  }
}

async function createDocument(params: any, emailIds: string[], request: NextRequest) {
  const debugLog: string[] = [];
  
  try {
    debugLog.push(`Document params: ${JSON.stringify(params)}`);
    
    const accessToken = await getAccessToken(request);
    debugLog.push(`Got access token: ${!!accessToken ? 'YES' : 'NO'}`);
    
    // Prepare emails data for document
    const emails = params.emails || [];
    const title = params.title || `Email Summary - ${new Date().toLocaleDateString()}`;
    
    const result = await createEmailSummaryDoc(accessToken, emails, title);
    debugLog.push(`Document created: ${result.documentId}`);
    
    return {
      success: true,
      message: `✅ Google Doc created: "${result.title}"`,
      details: {
        documentId: result.documentId,
        documentUrl: result.documentUrl,
        revisionId: result.revisionId
      },
      debug: debugLog
    };
  } catch (error: any) {
    debugLog.push(`Document creation error: ${error.message}`);
    
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return {
        success: false,
        message: '⚠️ Docs access not authorized. Please re-authenticate with Docs permissions.',
        error: 'Missing docs permissions',
        debug: debugLog
      };
    }
    
    return {
      success: false,
      message: `Failed to create document: ${error.message}`,
      error: error.message,
      debug: debugLog
    };
  }
}

async function executeCustomAction(action: ActionSuggestion) {
  return {
    success: true,
    message: `Custom action: ${action.title}`,
    details: action.params,
    debug: []
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