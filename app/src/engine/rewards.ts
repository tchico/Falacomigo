// Coins (FR-20, design doc §4). Every spoken turn earns coins. Dad's stars are worth the most.
// Nothing is ever taken away: no streaks, no penalties for missed days (FR-23).

export const COINS_PER_TURN = 10;
export const COINS_PER_STAR = 20;

export const coinsForStars = (stars: number) => Math.max(0, Math.min(3, Math.round(stars))) * COINS_PER_STAR;
