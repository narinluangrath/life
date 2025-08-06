import { OAuth2Client } from 'google-auth-library';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export async function createCalendarEvent(
  accessToken: string,
  eventData: {
    title: string;
    date: string;
    description?: string;
    attendees?: string[];
    duration?: number; // in minutes, default 60
  }
) {
  console.log('createCalendarEvent called with:', { eventData, hasToken: !!accessToken });
  
  try {
    // Parse the date and create start/end times
    const startDate = new Date(eventData.date);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (eventData.duration || 60));
    
    console.log('Date parsing:', {
      originalDate: eventData.date,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const event: CalendarEvent = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: eventData.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    console.log('Making Calendar API request with event:', event);
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    console.log('Calendar API response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('Calendar API error response:', { status: response.status, error });
      throw new Error(`Failed to create calendar event: ${response.status} - ${error}`);
    }

    const createdEvent = await response.json();
    return {
      success: true,
      eventId: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
      summary: createdEvent.summary,
      start: createdEvent.start,
      end: createdEvent.end,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function parseEmailForEventDetails(
  emailContent: {
    subject: string;
    snippet: string;
    sender: string;
    date: string;
  }
) {
  // Extract date patterns from email
  const datePatterns = [
    /due\s+(?:date|on)?\s*:?\s*(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /payment\s+due\s*:?\s*(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /expires?\s+(?:on)?\s*:?\s*(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /by\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /on\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
  ];

  let extractedDate = null;
  const contentToSearch = `${emailContent.subject} ${emailContent.snippet}`;
  
  for (const pattern of datePatterns) {
    const match = contentToSearch.match(pattern);
    if (match && match[1]) {
      try {
        // Add current year if not specified
        let dateStr = match[1];
        if (!dateStr.match(/\d{4}/)) {
          dateStr += `, ${new Date().getFullYear()}`;
        }
        extractedDate = new Date(dateStr);
        if (!isNaN(extractedDate.getTime())) {
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  // If no date found, use a week from now as default
  if (!extractedDate || isNaN(extractedDate.getTime())) {
    extractedDate = new Date();
    extractedDate.setDate(extractedDate.getDate() + 7);
  }

  // Set time to 9 AM for payment reminders
  extractedDate.setHours(9, 0, 0, 0);

  return {
    date: extractedDate.toISOString(),
    title: generateEventTitle(emailContent),
    description: `Reminder from email: ${emailContent.subject}\nFrom: ${emailContent.sender}`,
  };
}

function generateEventTitle(emailContent: { subject: string; sender: string }) {
  // Extract key information for title
  if (emailContent.subject.toLowerCase().includes('credit card')) {
    const cardMatch = emailContent.subject.match(/(chase|amex|citi|capital one|discover|wells fargo)/i);
    const cardName = cardMatch ? cardMatch[1] : 'Credit Card';
    return `💳 ${cardName} Payment Due`;
  }
  
  if (emailContent.subject.toLowerCase().includes('bill')) {
    return `📄 Bill Payment Due - ${emailContent.sender.split('@')[0]}`;
  }
  
  if (emailContent.subject.toLowerCase().includes('payment')) {
    return `💰 Payment Due - ${emailContent.sender.split('@')[0]}`;
  }
  
  // Default
  return `📅 Reminder: ${emailContent.subject.substring(0, 50)}`;
}