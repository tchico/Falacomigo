// Picks the recogniser. With a proxy configured (EXPO_PUBLIC_SPEECH_PROXY_URL and EXPO_PUBLIC_SPEECH_PROXY_KEY,
// see proxy/README.md), the child's voice goes to the pt-PT speech service. Without one, the developer stub is used.
import { CloudRecognizer } from './cloud';
import { deviceMic } from './mic';
import { StubRecognizer } from './stub';
import type { SpeechRecognizer } from './types';

export function createRecognizer(): SpeechRecognizer {
  const url = process.env.EXPO_PUBLIC_SPEECH_PROXY_URL;
  const appKey = process.env.EXPO_PUBLIC_SPEECH_PROXY_KEY ?? '';
  return url ? new CloudRecognizer({ url, appKey }, deviceMic) : new StubRecognizer();
}
