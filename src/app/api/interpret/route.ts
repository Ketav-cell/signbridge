import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { letters } = await req.json();

    if (!letters || typeof letters !== 'string') {
      return NextResponse.json({ error: 'letters field required' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are helping interpret ASL finger-spelling. The user signed these letters one at a time: "${letters.toUpperCase()}"

Insert spaces to form the most natural English words/phrase. Return ONLY the spaced result — no explanation, no punctuation changes, just the words separated by spaces. Capitalise the first letter of each word.

Examples:
HELLOWORLD → Hello World
ILOVEYOU → I Love You
KETAVISCUTE → Ketav Is Cute`,
        },
      ],
    });

    const result =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ result });
  } catch (err) {
    console.error('Interpret API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
