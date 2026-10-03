// What text-to-speech should say for a line (NFR-03). Speech bubbles keep the fun spellings ("Brrr…", "Hmm…"),
// but a voice reads those letter by letter or mangles them, so they're swapped for something it can say,
// or left out when they're only a sound effect. A content line can also give its own spoken version ("spoken").

// Sound effects and giggles no voice can do: left out of the spoken line.
const SILENT = /\b(?:b+r{2,}|r{3,}|g*r{3,}|z{3,}|(?:he){2,}|(?:hi){2,}|(?:ha){2,})\b/gi;

export function forSpeech(text: string): string {
  let s = text
    .replace(/\bh+m{2,}\b/gi, (m) => (m[0] === 'H' ? 'Hum' : 'hum')) // "Hmm…" → "Hum…", a real Portuguese interjection
    .replace(/\b(a)h{2,}\b/gi, '$1h') // "Ahh" → "Ah"
    .replace(SILENT, '');
  // Tidy what's left: spaces before punctuation, doubled punctuation, a stray comma or ellipsis at the start.
  s = s
    .replace(/\s+([,.!?…])/g, '$1')
    .replace(/([,.!?…])[,.]+/g, '$1')
    .replace(/^[\s,.!?…]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Capitalise where a removed word used to start the line or a sentence ("Hehe, parece" → "Parece").
  // Not after "…", which carries a sentence on in lower case ("Eu tenho… hum… cem anos").
  s = s.replace(/([.!?]\s+)(\p{Ll})/gu, (_, gap: string, c: string) => gap + c.toUpperCase());
  return s.charAt(0).toUpperCase() + s.slice(1);
}
