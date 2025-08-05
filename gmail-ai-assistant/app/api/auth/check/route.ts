import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if user has Google tokens stored
    const tokens = request.cookies.get('google_tokens');
    
    return NextResponse.json({
      authenticated: !!tokens,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }
}