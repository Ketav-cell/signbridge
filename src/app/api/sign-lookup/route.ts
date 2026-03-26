import { NextRequest, NextResponse } from 'next/server';
import { processText } from '@/lib/signMapper';

export async function POST(request: NextRequest) {
  try {
    const { text, signLanguage = 'ASL' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const signSequence = processText(text, signLanguage);
    return NextResponse.json({ sequence: signSequence });
  } catch (error) {
    console.error('Sign lookup error:', error);
    return NextResponse.json({ error: 'Sign lookup failed' }, { status: 500 });
  }
}
