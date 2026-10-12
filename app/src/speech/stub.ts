import type { Listening, RecognitionResult, SpeechRecognizer } from './types';

/**
 * A stand-in recogniser for development. Whoever is testing picks what the "child" said
 * from the developer panel, and the stub returns it as if the recogniser had heard it.
 */
export class StubRecognizer implements SpeechRecognizer {
  readonly name = 'stub';
  private next: RecognitionResult = { transcript: '', voicedMs: 0 };

  /** Set what the next listen() hears. */
  willHear(transcript: string, voicedMs = transcript ? 1500 : 300) {
    this.next = { transcript, voicedMs };
  }

  listen(): Listening {
    const heard = this.next;
    let release!: () => void;
    const released = new Promise<void>((r) => (release = r));
    return {
      release,
      ended: released,
      result: released.then(() => new Promise<RecognitionResult>((r) => setTimeout(() => r(heard), 250))),
    };
  }
}
