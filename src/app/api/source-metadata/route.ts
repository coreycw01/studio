import { NextResponse } from 'next/server';
import { metadataFromUrl } from '@/lib/server/source-providers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
    }

    const result = await metadataFromUrl(url);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to read source metadata.' },
      { status: 500 },
    );
  }
}
