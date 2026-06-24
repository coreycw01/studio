
import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const MAX_IMPORTED_CHARS = 250_000;
const MAX_RESPONSE_BYTES = 10_000_000; // Increased to 10MB
const IMPORT_TIMEOUT_MS = 15_000; // Increased timeout for heavy docs
const MAX_REDIRECTS = 4;

export const runtime = 'nodejs';

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

function isPrivateIp(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return (
      parts[0] === 0 ||
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    );
  }

  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
}

async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https document URLs can be imported.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Local or internal document URLs cannot be imported.');
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Private network document URLs cannot be imported.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some((address) => isPrivateIp(address.address))) {
    throw new Error('Private network document URLs cannot be imported.');
  }
}

async function fetchPublicUrl(url: URL, redirects = 0): Promise<Response> {
  await assertPublicUrl(url);
  const response = await fetch(url.toString(), {
    headers: {
      accept: 'text/plain,text/markdown,text/html;q=0.8,*/*;q=0.1',
      'user-agent': 'Noesis document importer',
    },
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) throw new Error('Too many redirects.');
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect response is missing a location.');
    return fetchPublicUrl(new URL(location, url), redirects + 1);
  }

  return response;
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      throw new Error('Document is too large to import safely.');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
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

    const parsed = new URL(importUrl(url));
    const response = await fetchPublicUrl(parsed);

    if (!response.ok) {
      return NextResponse.json({ error: `Document could not be read (${response.status}). Make sure it is public or published.` }, { status: 422 });
    }

    const contentType = response.headers.get('content-type') || '';
    const raw = await readLimitedText(response);
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import that document URL.' }, { status: 500 });
  }
}
