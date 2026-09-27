import type { RecognitionRequest, RecognitionResult, SpeechRecognizer } from './types';

/**
 * A stand-in recogniser for development. Whoever is testing picks what the "child" said
 * from the developer panel, and the stub returns it as if the recogniser had heard it.
 */
export class StubRecognizer implements SpeechRecognizer {
  readonly name = 'stub';
  private next: RecognitionResult = { transcript: '', durationMs: 0 };

  /** Set what the next recognise() call returns. */
  willHear(transcript: string, durationMs = transcript ? 1500 : 300) {
    this.next = { transcript, durationMs };
  }

  async recognize(_request: RecognitionRequest): Promise<RecognitionResult> {
    await new Promise((r) => setTimeout(r, 250));
    return this.next;
  }
}
