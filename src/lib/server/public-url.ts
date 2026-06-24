
import { Buffer } from 'node:buffer';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const DEFAULT_MAX_RESPONSE_BYTES = 10_000_000; // Increased to 10MB to handle bloated modern pages and scholarly records
const DEFAULT_TIMEOUT_MS = 12_000; // Increased to 12s for slower global providers
const MAX_REDIRECTS = 4;

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

export async function assertPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs can be imported.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Local or internal URLs cannot be imported.');
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Private network URLs cannot be imported.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.some((address) => isPrivateIp(address.address))) {
    throw new Error('Private network URLs cannot be imported.');
  }
}

export async function fetchPublicUrl(
  url: URL,
  options: RequestInit = {},
  redirects = 0,
): Promise<Response> {
  await assertPublicUrl(url);
  const response = await fetch(url.toString(), {
    ...options,
    cache: 'no-store',
    redirect: 'manual',
    signal: options.signal || AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) throw new Error('Too many redirects.');
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect response is missing a location.');
    return fetchPublicUrl(new URL(location, url), options, redirects + 1);
  }

  return response;
}

export async function readLimitedText(response: Response, maxBytes = DEFAULT_MAX_RESPONSE_BYTES) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error('Response is too large to import safely. Some scholarly pages are heavily bloated with scripts.');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}
