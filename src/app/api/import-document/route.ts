import { NextResponse } from 'next/server';

const MAX_IMPORTED_CHARS = 250_000;

function googleDocExportUrl(url: string) {
  const match = url.match(/docs\.google\.com\/document\/d\/([^/]+)/);
  if (!match?.[1]) return null;
  return `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
}

function googleDocPublishedUrl(url: string) {
  const match = url.match(/docs\.google\.com\/document\/d\/e\/([^/]+)/);
  if (!match?.[1]) return null;
  return `https://docs.google.com/document/d/e/${match[1]}/pub?output=txt`;
}

function importUrl(rawUrl: string) {
  const published = googleDocPublishedUrl(rawUrl);
  if (published) return published;
  const google = googleDocExportUrl(rawUrl);
  if (google) return google;
  return rawUrl;
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A document URL is required.' }, { status: 400 });
    }

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http and https document URLs can be imported.' }, { status: 400 });
    }

    const response = await fetch(importUrl(url), {
      headers: {
        accept: 'text/plain,text/markdown,text/html;q=0.8,*/*;q=0.1',
        'user-agent': 'Noesis document importer',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Document could not be read (${response.status}). Make sure it is public or published.` }, { status: 422 });
    }

    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    const text = contentType.includes('html') ? stripHtml(raw) : raw.trim();

    if (!text) {
      return NextResponse.json({ error: 'No readable text was found in that document.' }, { status: 422 });
    }

    return NextResponse.json({
      text: text.slice(0, MAX_IMPORTED_CHARS),
      truncated: text.length > MAX_IMPORTED_CHARS,
      importedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to import that document URL.' }, { status: 500 });
  }
}
