import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear all auth-related cookies
  response.cookies.delete('oauth_state');
  response.cookies.delete('google_tokens');
  
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  // Clear all auth-related cookies with multiple approaches to ensure they're deleted
  response.cookies.set('oauth_state', '', { maxAge: 0 });
  response.cookies.set('google_tokens', '', { maxAge: 0 });
  response.cookies.delete('oauth_state');
  response.cookies.delete('google_tokens');
  
  console.log('Cleared all authentication cookies');
  
  return response;
}