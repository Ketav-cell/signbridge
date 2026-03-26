import { NextRequest, NextResponse } from 'next/server';
import { searchSigns, getSignsByCategory, getAllSigns } from '@/lib/dictionaryManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const language = searchParams.get('language');

    let results;

    if (query) {
      results = searchSigns(query);
    } else if (category) {
      results = getSignsByCategory(category);
    } else {
      results = getAllSigns();
    }

    if (language) {
      results = results.filter(
        (sign) =>
          sign.signLanguage?.toUpperCase() === language.toUpperCase()
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Dictionary error:', error);
    return NextResponse.json({ error: 'Dictionary lookup failed' }, { status: 500 });
  }
}
