import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json({
    message:
      'Use Web Speech API for browser-based transcription. Server-side transcription via Whisper/Deepgram coming soon.',
    supported: false,
  });
}
