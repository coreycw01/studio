import type { MediaType, SourceProvider } from './types';

export interface NormalizedSourceResult {
  provider: SourceProvider;
  externalId: string;
  type: MediaType;
  title: string;
  creators: string[];
  year?: string;
  description?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  publisher?: string;
  platform?: string;
  isbn?: string;
  doi?: string;
  tags?: string[];
  externalIds?: {
    googleBooksId?: string;
    openLibraryId?: string;
    openAlexId?: string;
    isbn?: string;
    doi?: string;
    url?: string;
  };
}

export function sourceResultToMediaPatch(result: NormalizedSourceResult) {
  return {
    title: result.title,
    creator: result.creators.join(', '),
    creators: result.creators,
    type: result.type,
    year: result.year || '',
    genre: (result.tags || []).slice(0, 2).join(', '),
    description: result.description || '',
    url: result.sourceUrl || result.externalIds?.url || '',
    thumbnailUrl: result.thumbnailUrl || '',
    publisher: result.publisher || '',
    platform: result.platform || '',
    isbn: result.isbn || result.externalIds?.isbn || '',
    doi: result.doi || result.externalIds?.doi || '',
    tags: result.tags || [],
    sourceProvider: result.provider,
    externalIds: result.externalIds || {},
  };
}
