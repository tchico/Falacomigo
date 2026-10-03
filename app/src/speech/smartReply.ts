// Gui's smart replies (FR-31, scaled down to replies inside scenes; proxy/README.md). When the child says something
// real that the script doesn't cover, the proxy asks a language model whether it's sensible Portuguese that answers
// the question, and for Gui's next line. Only the words are sent, never audio, and the child's name is swapped for
// {nome} first (NFR-05). Off unless Dad turns it on in the parent zone.

export interface SmartReplyRequest {
  /** What Gui just asked. */
  question: string;
  /** The phrase the child is practising. */
  expected: string;
  /** What the recogniser heard. */
  heard: string;
  age: 6 | 8;
}

export interface SmartReplies {
  /** Gui's reply, or null when it wasn't understood, the service is off or slow, or anything failed. */
  ask(request: SmartReplyRequest, childName: string): Promise<string | null>;
}

/** Give up after this long so a turn still answers within 2 seconds (NFR-01). */
export const SMART_REPLY_TIMEOUT_MS = 1500;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The child's name never leaves the tablet: it's sent as {nome} and put back in the reply. */
export function withoutName(text: string, name: string): string {
  return name.trim() ? text.replace(new RegExp(`(?<!\\p{L})${escape(name.trim())}(?!\\p{L})`, 'giu'), '{nome}') : text;
}
export const withName = (text: string, name: string) => text.replace(/\{nome\}/g, name);

export class ProxySmartReplies implements SmartReplies {
  constructor(
    private readonly url: string,
    private readonly appKey: string,
    private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init),
    private readonly timeoutMs = SMART_REPLY_TIMEOUT_MS,
  ) {}

  async ask(request: SmartReplyRequest, childName: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Key': this.appKey },
        body: JSON.stringify({ ...request, heard: withoutName(request.heard, childName), question: withoutName(request.question, childName), expected: withoutName(request.expected, childName) }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { understood?: unknown; reply?: unknown };
      return body.understood === true && typeof body.reply === 'string' && body.reply ? withName(body.reply, childName) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** The proxy's /reply sits next to /recognize. */
export const replyUrl = (recognizeUrl: string) => recognizeUrl.replace(/\/recognize\/?$/, '') + '/reply';
