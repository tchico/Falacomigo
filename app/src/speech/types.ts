// The speech module's contract (FR-06, FR-07). The real implementation will record audio and send it
// through the cloud proxy to a pt-PT recogniser (see design doc §5). The stub lets us build and test
// the game loop before that exists.

export interface RecognitionRequest {
  locale: 'pt-PT';
  /** The phrase we expect, passed to the recogniser as a hint. */
  expectedText: string;
  /** Recording stops after this long, or on silence (FR-06). */
  maxDurationMs: number;
}

export interface RecognitionResult {
  transcript: string;
  durationMs: number;
}

export interface SpeechRecognizer {
  readonly name: string;
  recognize(request: RecognitionRequest): Promise<RecognitionResult>;
}
