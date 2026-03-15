import { NextRequest, NextResponse } from 'next/server';
import aslAlphabet from '@/data/aslAlphabet.json';

type AlphabetEntry = {
  letter: string;
  mediaUrl: string;
  description: string;
};

const alphabetMap = new Map<string, AlphabetEntry>(
  (aslAlphabet as AlphabetEntry[]).map((entry) => [entry.letter.toLowerCase(), entry])
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { word: string } }
) {
  try {
    const { word } = params;

    if (!word) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    const letters = word.toLowerCase().split('');
    const sequence = letters.map((char) => {
      const entry = alphabetMap.get(char);
      if (entry) {
        return {
          letter: char.toUpperCase(),
          mediaUrl: entry.mediaUrl,
          description: entry.description,
        };
      }
      // Non-alpha characters get a placeholder
      return {
        letter: char,
        mediaUrl: '',
        description: `Non-alphabetic character: "${char}"`,
      };
    });

    return NextResponse.json(sequence);
  } catch (error) {
    console.error('Fingerspell error:', error);
    return NextResponse.json({ error: 'Fingerspelling failed' }, { status: 500 });
  }
}
