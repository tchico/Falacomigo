// Hold-to-talk for screens other than the scene (the shop): press to listen, release (or pause, or 6 s) to stop.
import { useRef, useState } from 'react';
import { stop } from '../audio/voice';
import type { Listening, RecognitionRequest, RecognitionResult, SpeechRecognizer } from './types';

export type MicState = 'idle' | 'listening' | 'thinking';

export function useHoldToTalk(
  recognizer: SpeechRecognizer,
  /** Gets what was heard, or null if the microphone couldn't start. */
  onHeard: (heard: RecognitionResult | null) => void,
  /** A quick tap instead of a hold. */
  onTap: () => void,
) {
  const [mic, setMic] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const listening = useRef<Listening | null>(null);
  const holding = useRef(false);

  const press = async (request: RecognitionRequest) => {
    holding.current = true;
    if (listening.current) return;
    await stop();
    if (!holding.current) return onTap();
    const l = recognizer.listen(request, setLevel);
    listening.current = l;
    setMic('listening');
    // Thinking from the moment listening stops, whether the child let go or paused (NFR-12).
    void l.ended.then(() => setMic((m) => (m === 'listening' ? 'thinking' : m)));
    let heard: RecognitionResult | null;
    try {
      heard = await l.result;
    } catch (e) {
      console.warn('Microphone unavailable', e);
      heard = null;
    }
    listening.current = null;
    setMic('idle');
    setLevel(0);
    onHeard(heard);
  };

  const release = () => {
    holding.current = false;
    if (listening.current) {
      setMic('thinking');
      listening.current.release();
    }
  };

  return { mic, level, press, release };
}
