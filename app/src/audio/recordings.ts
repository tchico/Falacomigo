// Dad's recordings on disk (FR-26). They stay on the tablet, in the app's documents folder.
// recordings.web.ts is the browser version, used when testing in a browser.
import { Directory, File, Paths } from 'expo-file-system';

const fileFor = (key: string) => new File(Paths.document, 'recordings', ...key.split('/'));

/** Nothing to load on the tablet: files are checked when they're needed. */
export async function initRecordings(): Promise<void> {}

/** Where Dad's recording for this clip is, or null if he hasn't recorded it. */
export function recordingUri(key: string): string | null {
  try {
    const f = fileFor(key);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

export const hasRecording = (key: string) => recordingUri(key) !== null;

/** Moves a finished recording into place, replacing any earlier take. */
export async function saveRecording(key: string, fromUri: string): Promise<void> {
  const dest = fileFor(key);
  new Directory(dest.parentDirectory.uri).create({ intermediates: true, idempotent: true });
  if (dest.exists) dest.delete();
  new File(fromUri).move(dest);
}

export async function deleteRecording(key: string): Promise<void> {
  const f = fileFor(key);
  if (f.exists) f.delete();
}
