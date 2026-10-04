#!/usr/bin/env node
// Writes Gui's background tune (NFR-10) to app/assets/music/gui-theme.mp3: a calm 16-bar waltz on a plucked
// string, a little like a Portuguese guitar, with a soft bass and chords. It's generated here rather than downloaded,
// so there's no licence to worry about, and it loops cleanly: the last bar's echo is folded back onto the first.
//
// Usage: node tools/build-music.mjs (needs ffmpeg on the PATH to turn the WAV into an MP3).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 22050;
const BEAT = 60 / 92;
const BARS = 16;
const total = Math.round(BARS * 3 * BEAT * RATE);
const out = new Float32Array(total);

// Seeded, so running the script again writes the same tune.
let seed = 7;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => 12 * (Number(n.slice(-1)) + 1) + NOTE[n[0]];

/** A plucked string (Karplus-Strong), added at `start` seconds; anything past the end wraps round to the start. */
function pluck(note, start, seconds, gain, bright = 0.5) {
  const f = freq(midi(note));
  const period = Math.round(RATE / f);
  const buf = Float32Array.from({ length: period }, () => random() * 2 - 1);
  // Soften the attack so it's gentle rather than twangy.
  for (let k = 0; k < 2; k++) for (let i = 1; i < period; i++) buf[i] = (buf[i] + buf[i - 1]) / 2;
  const n = Math.round(seconds * RATE);
  const at = Math.round(start * RATE);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = (idx + 1) % period;
    const v = buf[idx];
    buf[idx] = (bright * v + (1 - bright) * buf[next]) * 0.996;
    const fadeIn = Math.min(1, i / (0.004 * RATE));
    out[(at + i) % total] += v * gain * fadeIn;
    idx = next;
  }
}

// The tune, in 3/4: one bar per line, [note, beats].
const MELODY = [
  [['E4', 1], ['G4', 1], ['C5', 1]],
  [['B4', 1], ['A4', 1], ['G4', 1]],
  [['A4', 1], ['F4', 1], ['A4', 1]],
  [['G4', 3]],
  [['E4', 1], ['G4', 1], ['C5', 1]],
  [['D5', 1], ['C5', 1], ['B4', 1]],
  [['A4', 1], ['B4', 1], ['D5', 1]],
  [['C5', 3]],
  [['E5', 1], ['D5', 1], ['C5', 1]],
  [['D5', 1], ['C5', 1], ['A4', 1]],
  [['G4', 1], ['A4', 1], ['C5', 1]],
  [['G4', 3]],
  [['F4', 1], ['A4', 1], ['C5', 1]],
  [['E4', 1], ['G4', 1], ['C5', 1]],
  [['D4', 1], ['F4', 1], ['B4', 1]],
  [['C4', 3]],
];
const CHORDS = { C: ['C2', 'E3', 'G3'], G: ['G2', 'D3', 'B3'], F: ['F2', 'A3', 'C4'], Dm: ['D2', 'F3', 'A3'], Am: ['A2', 'E3', 'C4'] };
const HARMONY = ['C', 'G', 'F', 'C', 'C', 'G', 'Dm', 'C', 'Am', 'F', 'C', 'G', 'F', 'C', 'G', 'C'];

MELODY.forEach((bar, b) => {
  let t = b * 3 * BEAT;
  for (const [note, beats] of bar) {
    pluck(note, t, Math.max(1.5, beats * BEAT * 1.6), 0.5, 0.55);
    t += beats * BEAT;
  }
  // Oom-pah-pah: the bass on the first beat, a quiet chord on the other two.
  const [bass, ...chord] = CHORDS[HARMONY[b]];
  pluck(bass, b * 3 * BEAT, 3 * BEAT, 0.45, 0.4);
  for (const beat of [1, 2]) for (const note of chord) pluck(note, (b * 3 + beat) * BEAT, BEAT * 1.2, 0.12, 0.45);
});

// A short, soft echo, then normalise to a quiet level: it sits under the voices.
const echo = Math.round(0.23 * RATE);
for (let i = 0; i < total; i++) out[i] += out[(i - echo + total) % total] * 0.25;
const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const pcm = Buffer.alloc(44 + total * 2);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + total * 2, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(total * 2, 40);
for (let i = 0; i < total; i++) pcm.writeInt16LE(Math.round((out[i] / peak) * 0.6 * 32767), 44 + i * 2);

const wav = join(tmpdir(), 'gui-theme.wav');
writeFileSync(wav, pcm);
const dest = join(root, 'app', 'assets', 'music', 'gui-theme.mp3');
mkdirSync(dirname(dest), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', dest]);
rmSync(wav);
console.log(`Wrote ${dest} (${(total / RATE).toFixed(1)} s)`);
