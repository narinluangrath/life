import { NextResponse } from 'next/server';
import { claudeService } from '@/lib/claude';
import { EmailGroup } from '@/lib/types';

export async function GET() {
  try {
    // Test the Claude service with mock data
    const mockEmailGroup: EmailGroup = {
      senderKey: 'test@example.com',
      senderName: 'Test Sender',
      senderEmail: 'test@example.com', 
      relatedEmails: ['test@example.com'],
      messages: [
        {
          id: 'msg1',
          subject: 'Team meeting tomorrow at 2pm',
          sender: 'Test Sender',
          senderEmail: 'test@example.com',
          date: new Date().toISOString(),
          snippet: 'Hi everyone, we have our weekly team meeting tomorrow at 2pm. Please join us to discuss the project updates.',
          labels: []
        },
        {
          id: 'msg2', 
          subject: 'Document review needed',
          sender: 'Test Sender',
          senderEmail: 'test@example.com',
          date: new Date().toISOString(),
          snippet: 'Could you please review the attached document and provide feedback by Friday?',
          labels: []
        }
      ],
      totalCount: 2,
      unreadCount: 1,
      latestDate: new Date().toISOString()
    };

    console.log('Testing Claude analysis with mock data...');
    const analysis = await claudeService.analyzeEmailGroup(mockEmailGroup);
    
    return NextResponse.json({
      success: true,
      analysis,
      message: 'Claude AI integration is working!'
    });
  } catch (error) {
    console.error('Claude test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Claude AI integration failed'
    }, { status: 500 });
  }
}