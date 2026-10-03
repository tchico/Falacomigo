// Gui's shop rules (FR-22). Coins come from speaking (10 a turn, 20 per star from Dad); here they buy things for
// Gui to wear, and buying means saying the item in Portuguese. Never a loot box or random reward (NFR-09).
import type { ShopItem } from '../content/types';

export type Wear = { head?: string; eyes?: string; neck?: string };

/** What Gui is wearing, from the stored outfit (slot → item id), keeping only real items in their own slot. */
export function wearFor(outfit: Record<string, string>, items: ShopItem[]): Wear {
  const wear: Wear = {};
  for (const [slot, id] of Object.entries(outfit)) {
    const item = items.find((i) => i.id === id);
    if (item && item.slot === slot) wear[item.slot] = item.id;
  }
  return wear;
}

/** How many more coins the child needs for an item, or 0 if they can buy it now. */
export const coinsShort = (coins: number, item: ShopItem) => Math.max(0, item.price - coins);
