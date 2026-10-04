// Reads a scene's "setting" from the content pack: where it is, what's there, and whether it's evening.

export interface Place {
  kind: 'garden' | 'kitchen' | 'ferry' | 'beach' | 'porto';
  evening: boolean;
  /** Extra things named in the setting, e.g. "trampoline", "photo", "dining". */
  props: Set<string>;
}

export function placeFor(setting: string | undefined): Place {
  const words = (setting ?? 'garden').toLowerCase().split('-');
  const kind = words.includes('ferry') ? 'ferry' : words.includes('kitchen') ? 'kitchen' : words.includes('beach') ? 'beach' : words.includes('porto') ? 'porto' : 'garden';
  return { kind, evening: words.includes('evening') || words.includes('night'), props: new Set(words) };
}
