import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('OAuth callback received:', request.nextUrl.href);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    console.log('OAuth params:', { code: !!code, state, error });
    
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${error}`, process.env.NEXT_PUBLIC_APP_URL || request.url)
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=no_code', process.env.NEXT_PUBLIC_APP_URL || request.url)
      );
    }
    
    // Verify state (CSRF protection)
    const savedState = request.cookies.get('oauth_state')?.value;
    if (state !== savedState) {
      return NextResponse.redirect(
        new URL('/?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL || request.url)
      );
    }
    
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    console.log('Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope
    });
    
    // Store tokens in a secure cookie (in production, use a proper session store)
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || request.url));
    
    // Store tokens as a secure HTTP-only cookie
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      // Don't set domain for development - let it default to current host
    });
    
    // Clear the state cookie
    response.cookies.delete('oauth_state');
    
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL || request.url)
    );
  }
}