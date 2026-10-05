// The speech module's contract (FR-06, FR-07). The cloud recogniser records the child and sends the audio
// through the proxy to a pt-PT recogniser (design doc §5). The stub stands in for it during development.

export interface RecognitionRequest {
  /** pt-PT for everything the child says in Portuguese; en-GB only for the English word in "Como se diz?" (FR-11). */
  locale: 'pt-PT' | 'en-GB';
  /** The phrase we expect, passed to the recogniser as a hint. */
  expectedText: string;
  /** Listening stops after this long, or on silence (FR-06). */
  maxDurationMs: number;
  /** Hand back the audio too, for "listen back" (FR-29). It's never sent anywhere else or kept. */
  keepAudio?: boolean;
}

export interface RecognitionResult {
  transcript: string;
  /** How long voice was heard, in ms. Used for the third-try rule (FR-09) and the offline fallback. */
  voicedMs: number;
  /** True when the speech service couldn't be reached, so only the length of the voice is known (NFR-02). */
  offline?: boolean;
  /** The child's turn as a 16 kHz WAV, only when the request asked to keep it. */
  audio?: Uint8Array;
  /** How long the answer took to come back after the child stopped talking, in ms, when it was sent (NFR-01). */
  waitMs?: number;
}

export interface Listening {
  /** Resolves once listening ends: the child let go, paused, or the time ran out. */
  result: Promise<RecognitionResult>;
  /** The child let go of the button. */
  release(): void;
  /** Resolves the moment listening stops, before the answer is back, so the screen can show it's thinking (NFR-12). */
  ended: Promise<void>;
}

export interface SpeechRecognizer {
  readonly name: string;
  /** Starts listening straight away. `onLevel` gets the loudness (0..1) for the mic animation. */
  listen(request: RecognitionRequest, onLevel?: (level: number) => void): Listening;
}
