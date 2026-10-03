// "Listen back" (FR-29): the child hears their own turn. The audio goes to one temporary file in the cache,
// plays, and is deleted straight away, so nothing of the child's voice is kept (NFR-05).
// listenBack.web.ts is the browser version.
import { File, Paths } from 'expo-file-system';
import { play } from './voice';

export async function playChildAudio(wav: Uint8Array): Promise<void> {
  const f = new File(Paths.cache, 'listen-back.wav');
  try {
    if (f.exists) f.delete();
    f.write(wav);
    await play({ kind: 'recording', uri: f.uri });
  } finally {
    if (f.exists) f.delete();
  }
}
