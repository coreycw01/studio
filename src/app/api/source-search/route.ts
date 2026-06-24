import { NextResponse } from 'next/server';
import type { MediaType } from '@/lib/types';
import { MEDIA_TYPES } from '@/lib/readex';
import { searchSources } from '@/lib/server/source-providers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim();
    const requestedType = (searchParams.get('type') || 'book') as MediaType;
    const type = MEDIA_TYPES.includes(requestedType) ? requestedType : 'book';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchSources(query, type);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Source search failed.', results: [] },
      { status: 500 },
    );
  }
}
