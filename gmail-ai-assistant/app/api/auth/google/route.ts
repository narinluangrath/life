import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';

export async function GET() {
  try {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Store state in a cookie (in production, use a proper session store)
    const authUrl = getAuthUrl(state);
    
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      // Don't set domain for development - let it default to current host
    });
    
    return response;
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}