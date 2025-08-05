import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const tokensCookie = request.cookies.get('google_tokens');
  
  let tokenInfo = null;
  if (tokensCookie) {
    try {
      const tokens = JSON.parse(tokensCookie.value);
      tokenInfo = {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        expiresIn: tokens.expiry_date,
        scope: tokens.scope
      };
    } catch (e) {
      tokenInfo = { error: 'Failed to parse tokens' };
    }
  }

  return NextResponse.json({
    cookieCount: cookies.length,
    cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value })),
    tokenInfo,
    requestUrl: request.url,
    headers: {
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent')
    }
  });
}