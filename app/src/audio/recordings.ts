// Dad's recordings on disk (FR-26). They stay on the tablet, in the app's documents folder.
import { Directory, File } from 'expo-file-system';
import { recordingFile } from './voice';

export function hasRecording(key: string): boolean {
  try {
    return recordingFile(key).exists;
  } catch {
    return false;
  }
}

/** Moves a finished recording into place, replacing any earlier take. */
export function saveRecording(key: string, fromUri: string): void {
  const dest = recordingFile(key);
  new Directory(dest.parentDirectory.uri).create({ intermediates: true, idempotent: true });
  if (dest.exists) dest.delete();
  new File(fromUri).move(dest);
}

export function deleteRecording(key: string): void {
  const f = recordingFile(key);
  if (f.exists) f.delete();
}
