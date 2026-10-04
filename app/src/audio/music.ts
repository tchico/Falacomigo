// Gui's background tune (NFR-10), at the volume Dad chose for the child playing. It plays on the quiet screens (the
// map, the album, the end of a session) and stops wherever a child speaks, so it never gets in the way of the
// microphone. It dips while a voice is talking.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let volume = 0;
let playing = false;
let ducked = false;

function apply() {
  if (player) player.volume = volume * (ducked ? 0.35 : 1);
}

/** 0 is off, 1 is as loud as it goes. */
export function setMusicVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (playing && volume === 0) pauseMusic();
  apply();
}

export function playMusic(): void {
  if (volume === 0 || playing) return;
  try {
    player ??= createAudioPlayer(require('../../assets/music/gui-theme.mp3'));
    player.loop = true;
    apply();
    player.play();
    playing = true;
  } catch (e) {
    console.warn('Could not play the music', e);
  }
}

export function pauseMusic(): void {
  if (!playing) return;
  playing = false;
  player?.pause();
}

/** Quieter while Gui or Dad is talking, so the words are clear. */
export function duckMusic(on: boolean): void {
  if (ducked === on) return;
  ducked = on;
  apply();
}

