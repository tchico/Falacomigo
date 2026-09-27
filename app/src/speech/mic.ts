// The tablet's microphone as raw 16 kHz, 16-bit PCM (expo-audio's audio stream). Nothing is written to disk (NFR-05).
import { AudioModule, requestRecordingPermissionsAsync } from 'expo-audio';
import type { MicSource } from './cloud';
import { SAMPLE_RATE } from './pcm';

export const deviceMic: MicSource = {
  async start(onChunk) {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission was not given');
    const stream = new AudioModule.AudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'int16' });
    const sub = stream.addListener('audioStreamBuffer', (b) => onChunk(new Int16Array(b.data), b.sampleRate));
    await stream.start();
    return {
      async stop() {
        stream.stop();
        sub.remove();
        stream.release();
      },
    };
  },
};
