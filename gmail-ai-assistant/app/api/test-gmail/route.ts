import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedClient } from '@/lib/google/auth';

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const tokensCookie = request.cookies.get('google_tokens');
    if (!tokensCookie) {
      return NextResponse.json({ error: 'No tokens found' }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    console.log('Testing Gmail API with tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length,
      tokenType: tokens.token_type,
      expiresIn: tokens.expiry_date
    });

    // Create authenticated client
    const auth = createAuthenticatedClient(tokens);
    console.log('Raw tokens from cookie:', JSON.stringify(tokens, null, 2));
    console.log('Auth client credentials after setCredentials:', JSON.stringify(auth.credentials, null, 2));
    
    // Let's also try manually setting credentials in the expected format
    console.log('Trying manual credential setting...');
    auth.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date
    });
    
    // Test with googleapis library
    console.log('Testing Gmail API with googleapis library...');
    const { google } = require('googleapis');
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Try the same call that's failing in our GmailService
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'label:INBOX',
      maxResults: 5,
    });

    console.log('Gmail API googleapis response:', {
      status: response.status,
      statusText: response.statusText,
      messageCount: response.data.messages?.length || 0
    });

    return NextResponse.json({
      success: true,
      messages: response.data.messages || [],
      messageCount: response.data.messages?.length || 0,
      tokenInfo: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        authClientHasToken: !!auth.credentials.access_token
      }
    });

  } catch (error) {
    console.error('Test Gmail API error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}