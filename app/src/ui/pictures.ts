// Stand-in pictures for beats (FR-04) until there are illustrations: "food:bread-soup-fish" → 🍞 🍲 🐟.
// Family photos ("photo:dad") will come from the parent zone later; a simple figure stands in for now.

const EMOJI: Record<string, string> = {
  bread: '🍞', soup: '🍲', fish: '🐟', water: '💧', milk: '🥛', octopus: '🐙', biscuit: '🍪', plate: '🍽️',
  ball: '⚽', bucket: '🪣', icecream: '🍦',
  dad: '👨', mum: '👩', sibling: '🧒', child: '🙂',
};

export function pictureFor(image: string | undefined): string[] {
  if (!image) return [];
  const [, names = ''] = image.split(':');
  return names.split('-').map((n) => EMOJI[n]).filter((e): e is string => !!e);
}
