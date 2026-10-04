// Stand-in pictures for beats (FR-04) until there are illustrations: "food:bread-soup-fish" → 🍞 🍲 🐟.
// Family photos ("photo:dad") will come from the parent zone later; a simple figure stands in for now.

const EMOJI: Record<string, string> = {
  bread: '🍞', soup: '🍲', fish: '🐟', water: '💧', milk: '🥛', octopus: '🐙', biscuit: '🍪', plate: '🍽️',
  ball: '⚽', bucket: '🪣', icecream: '🍦',
  map: '🗺️', chair: '🪑', boat: '⛵', basket: '🧺', door: '🚪', bridge: '🌉',
  left: '⬅️', right: '➡️', straight: '⬆️',
  dad: '👨', mum: '👩', sibling: '🧒', child: '🙂',
};

export type Where = 'under' | 'on' | 'in' | 'behind';

/**
 * A "where is it?" picture (Unit 4): "where:map-under-chair" is the map drawn under the chair. Null for other pictures.
 */
export function whereFor(image: string | undefined): { thing: string; where: Where; place: string } | null {
  const [kind, names = ''] = (image ?? '').split(':');
  if (kind !== 'where') return null;
  const [thing, where, place] = names.split('-');
  if (!EMOJI[thing] || !EMOJI[place] || !['under', 'on', 'in', 'behind'].includes(where)) return null;
  return { thing: EMOJI[thing], where: where as Where, place: EMOJI[place] };
}

export function pictureFor(image: string | undefined): string[] {
  if (!image) return [];
  const [, names = ''] = image.split(':');
  return names.split('-').map((n) => EMOJI[n]).filter((e): e is string => !!e);
}
