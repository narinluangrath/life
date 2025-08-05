import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/google/auth';
import { GmailService } from '@/lib/google/gmail';

export async function GET(request: NextRequest) {
  console.log('=== EMAILS API CALLED ===');
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
    console.log('Tokens from cookie:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date,
      tokenType: tokens.token_type
    });
    
    // Create authenticated client
    const auth = createAuthenticatedClient(tokens);
    console.log('Auth client credentials set:', {
      hasAccessToken: !!auth.credentials.access_token,
      hasRefreshToken: !!auth.credentials.refresh_token,
      tokenType: auth.credentials.token_type
    });
    
    // Skip refresh logic for now to test direct API call
    console.log('Skipping token refresh, testing direct Gmail API call');
    
    // Use direct HTTP request since googleapis library has auth issues
    console.log('Making direct Gmail API request...');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:INBOX&maxResults=20', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gmail API direct request failed:', response.status, errorText);
      throw new Error(`Gmail API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Gmail API success:', { messageCount: data.messages?.length || 0 });
    
    // Fetch detailed information for each email
    const emailDetails = await Promise.all(
      (data.messages || []).slice(0, 10).map(async (msg: any) => {
        try {
          const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Accept': 'application/json'
            }
          });

          if (!detailResponse.ok) {
            console.error(`Failed to fetch email ${msg.id}:`, detailResponse.status);
            return null;
          }

          const detail = await detailResponse.json();
          const headers = detail.payload?.headers || [];
          
          // Extract email information from headers
          const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
          
          const fromHeader = getHeader('From');
          const emailMatch = fromHeader.match(/<(.+?)>/);
          const senderEmail = emailMatch ? emailMatch[1] : fromHeader;
          const senderName = fromHeader.replace(/<.*>/, '').trim() || senderEmail;

          return {
            id: msg.id,
            subject: getHeader('Subject') || 'No Subject',
            sender: senderName,
            senderEmail: senderEmail,
            date: getHeader('Date') || new Date().toISOString(),
            snippet: detail.snippet || 'No preview available'
          };
        } catch (error) {
          console.error(`Error fetching email ${msg.id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests
    const emails = emailDetails.filter(email => email !== null);
    
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Check if it's an auth error
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      return NextResponse.json(
        { error: 'Authentication failed. Please log in again.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}