import { NextRequest, NextResponse } from 'next/server';
import { translateText, detectLanguage } from '@/lib/translationService';

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang, targetLang = 'en' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const detectedLang = (!sourceLang || sourceLang === 'auto') ? await detectLanguage(text) : sourceLang;

    if (detectedLang === targetLang) {
      return NextResponse.json({
        originalText: text,
        translatedText: text,
        sourceLanguage: detectedLang,
        targetLanguage: targetLang,
      });
    }

    const result = await translateText(text, detectedLang, targetLang);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
