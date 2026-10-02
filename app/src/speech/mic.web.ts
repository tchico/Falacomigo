// The microphone in a browser, for testing on a computer. expo-audio's live audio stream has no web version,
// so this uses the browser's own audio APIs and hands back 16-bit chunks like the tablet version (mic.ts).
// Nothing is recorded to disk (NFR-05).
import type { MicSource } from './cloud';

/** Samples per chunk: about 85 ms at 48 kHz, close to what the tablet's stream delivers. */
const CHUNK = 4096;

export const deviceMic: MicSource = {
  async start(onChunk) {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const ctx = new AudioContext();
    await ctx.resume();
    const source = ctx.createMediaStreamSource(media);
    // ScriptProcessorNode is old but works everywhere without loading a separate worklet file.
    const processor = ctx.createScriptProcessor(CHUNK, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const out = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        out[i] = s < 0 ? s * 32768 : s * 32767;
      }
      onChunk(out, ctx.sampleRate);
    };
    source.connect(processor);
    // The processor only runs while connected to the output; it writes silence, so nothing is heard.
    processor.connect(ctx.destination);

    return {
      async stop() {
        processor.onaudioprocess = null;
        source.disconnect();
        processor.disconnect();
        media.getTracks().forEach((t) => t.stop());
        await ctx.close();
      },
    };
  },
};
