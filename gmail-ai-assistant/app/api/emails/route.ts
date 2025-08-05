import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/google/auth';
import { GmailService } from '@/lib/google/gmail';

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const tokensCookie = request.cookies.get('google_tokens');
    if (!tokensCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const tokens = JSON.parse(tokensCookie.value);
    
    // Create authenticated client
    const auth = createAuthenticatedClient(tokens);
    const gmailService = new GmailService(auth);
    
    // Fetch emails from inbox
    const emails = await gmailService.getMessages('label:INBOX', 20);
    
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}