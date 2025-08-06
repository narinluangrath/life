import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the stored tokens
    const tokensCookie = request.cookies.get('google_tokens');
    
    if (!tokensCookie) {
      return NextResponse.json({
        authenticated: false,
        message: 'No authentication tokens found'
      });
    }
    
    const tokens = JSON.parse(tokensCookie.value);
    
    // Check what scopes we actually have
    const scopes = tokens.scope ? tokens.scope.split(' ') : [];
    
    // Test the access token
    let tokenValid = false;
    let userInfo = null;
    
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + tokens.access_token);
      if (response.ok) {
        const info = await response.json();
        tokenValid = true;
        userInfo = {
          email: info.email,
          expires_in: info.expires_in,
          scopes: info.scope ? info.scope.split(' ') : []
        };
      }
    } catch (e) {
      console.error('Token validation error:', e);
    }
    
    return NextResponse.json({
      authenticated: true,
      hasTokens: {
        access_token: !!tokens.access_token,
        refresh_token: !!tokens.refresh_token,
        expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      },
      scopesInCookie: scopes,
      tokenValid,
      tokenInfo: userInfo,
      requiredScopes: {
        gmail_read: scopes.includes('https://www.googleapis.com/auth/gmail.readonly'),
        gmail_modify: scopes.includes('https://www.googleapis.com/auth/gmail.modify'),
        calendar: scopes.includes('https://www.googleapis.com/auth/calendar'),
        calendar_events: scopes.includes('https://www.googleapis.com/auth/calendar.events'),
        drive: scopes.includes('https://www.googleapis.com/auth/drive.file')
      },
      debug: {
        allScopes: scopes,
        scopeString: tokens.scope,
        tokenExpired: tokens.expiry_date ? new Date(tokens.expiry_date) < new Date() : 'unknown'
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Failed to get auth debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}