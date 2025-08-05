import { NextRequest, NextResponse } from 'next/server';
import { claudeService } from '@/lib/claude';
import { EmailGroup } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { emailGroup }: { emailGroup: EmailGroup } = await request.json();

    if (!emailGroup) {
      return NextResponse.json(
        { error: 'Email group is required' },
        { status: 400 }
      );
    }

    const analysis = await claudeService.analyzeEmailGroup(emailGroup);
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Claude analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze email group' },
      { status: 500 }
    );
  }
}