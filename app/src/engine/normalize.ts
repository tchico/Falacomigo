// Turns a transcript (or a phrase) into the plain form used for matching:
// lower case, no accents, no punctuation, digits as Portuguese words, single spaces.

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro', '5': 'cinco',
  '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove', '10': 'dez', '11': 'onze', '12': 'doze',
  '100': 'cem',
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[-–—_/]/g, ' ')
    .replace(/[^\p{L}\p{N}\s{}]/gu, '') // strip punctuation, keep {placeholders}
    .replace(/\d+/g, (d) => NUMBER_WORDS[d] ?? d)
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}
