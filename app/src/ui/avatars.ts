// Profile avatars (FR-01, FR-02). Each is an animal on its own colour, so a child can find theirs without reading.
import { colors } from './theme';

export interface Avatar {
  key: string;
  emoji: string;
  color: string;
  /** Spoken or read name, for accessibility. */
  label: string;
}

export const AVATARS: Avatar[] = [
  { key: 'fox', emoji: '🦊', color: colors.sun, label: 'raposa' },
  { key: 'octopus', emoji: '🐙', color: '#7CC4B8', label: 'polvo' },
  { key: 'turtle', emoji: '🐢', color: colors.grass, label: 'tartaruga' },
  { key: 'owl', emoji: '🦉', color: '#E9B8A6', label: 'coruja' },
  { key: 'cat', emoji: '🐱', color: colors.sky, label: 'gato' },
  { key: 'dolphin', emoji: '🐬', color: '#C9B6E4', label: 'golfinho' },
];

export const avatarFor = (key: string): Avatar => AVATARS.find((a) => a.key === key) ?? AVATARS[0];
