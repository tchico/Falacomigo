// "Listen back" in the browser (FR-29): the child's turn plays from memory and is let go straight after (NFR-05).
import { play } from './voice';

export async function playChildAudio(wav: Uint8Array): Promise<void> {
  const url = URL.createObjectURL(new Blob([wav as BlobPart], { type: 'audio/wav' }));
  try {
    await play({ kind: 'recording', uri: url });
  } finally {
    URL.revokeObjectURL(url);
  }
}
