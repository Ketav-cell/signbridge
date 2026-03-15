import { NextRequest, NextResponse } from 'next/server';

/**
 * Transcription API Route (Placeholder)
 *
 * In production, this endpoint would integrate with:
 * - OpenAI Whisper API for server-side audio transcription
 * - Deepgram API for real-time streaming transcription
 *
 * For now, client-side transcription is handled via the browser
 * Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json({
    message:
      'Use Web Speech API for browser-based transcription. Server-side transcription via Whisper/Deepgram coming soon.',
    supported: false,
  });
}
