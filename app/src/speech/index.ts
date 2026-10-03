// Picks the recogniser. With a proxy configured (EXPO_PUBLIC_SPEECH_PROXY_URL and EXPO_PUBLIC_SPEECH_PROXY_KEY,
// see proxy/README.md), the child's voice goes to the pt-PT speech service. Without one, the developer stub is used.
import { CloudRecognizer } from './cloud';
import { deviceMic } from './mic';
import { ProxySmartReplies, replyUrl, type SmartReplies } from './smartReply';
import { StubRecognizer } from './stub';
import type { SpeechRecognizer } from './types';

export function createRecognizer(): SpeechRecognizer {
  const url = process.env.EXPO_PUBLIC_SPEECH_PROXY_URL;
  const appKey = process.env.EXPO_PUBLIC_SPEECH_PROXY_KEY ?? '';
  return url ? new CloudRecognizer({ url, appKey }, deviceMic) : new StubRecognizer();
}

/** Gui's smart replies go through the same proxy, so they need one configured (and Dad's switch, see App). */
export function createSmartReplies(): SmartReplies | null {
  const url = process.env.EXPO_PUBLIC_SPEECH_PROXY_URL;
  return url ? new ProxySmartReplies(replyUrl(url), process.env.EXPO_PUBLIC_SPEECH_PROXY_KEY ?? '') : null;
}
