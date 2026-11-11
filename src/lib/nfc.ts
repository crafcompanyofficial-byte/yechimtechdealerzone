/**
 * Web NFC: Chrome on Android only, over https. While scan() runs in the open page, the
 * browser hands the tag to the page instead of following its link, so the dealer gets the
 * token without the client's Mini App opening.
 */
interface NdefRecord {
  recordType: string;
  data?: DataView;
}

interface NdefReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null;
  onreadingerror: (() => void) | null;
}

declare global {
  interface Window {
    NDEFReader?: new () => NdefReader;
  }
}

export function nfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/**
 * The token of a link written on our tags, or null for anything else. Tags hold
 * t.me/<bot>?start=t_<token>; the first test tags held yechim.systems/t/<token>.
 */
export function tokenFromUrl(text: string): string | null {
  const raw = text.trim();
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.hostname === 't.me' || url.hostname === 'telegram.me') {
      return url.searchParams.get('start')?.match(/^t_([0-9a-f]{32})$/i)?.[1].toLowerCase() ?? null;
    }
    if (url.hostname !== 'yechim.systems' && url.hostname !== 'www.yechim.systems') return null;
    return url.pathname.match(/^\/t\/([0-9a-f]{32})\/?$/i)?.[1].toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function tokenFromRecords(records: NdefRecord[]): string | null {
  for (const record of records) {
    if (!record.data || !['url', 'absolute-url', 'text'].includes(record.recordType)) continue;
    const token = tokenFromUrl(new TextDecoder().decode(record.data));
    if (token) return token;
  }
  return null;
}

/**
 * Waits for one of our tags. A foreign tag only calls onForeign and the wait goes on: a stray
 * card near the phone should not end the scan. Rejects when the signal aborts or NFC refuses.
 */
export async function readToken(signal: AbortSignal, onForeign: () => void): Promise<string> {
  if (!window.NDEFReader) throw new DOMException('NFC is not available', 'NotSupportedError');
  const reader = new window.NDEFReader();

  return new Promise<string>((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    reader.onreading = (event) => {
      const token = tokenFromRecords(event.message.records);
      if (token) resolve(token);
      else onForeign();
    };
    reader.onreadingerror = onForeign;
    reader.scan({ signal }).catch(reject);
  });
}
