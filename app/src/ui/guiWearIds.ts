// Which shop items (FR-22) have a drawing on Gui, and where each one goes. A new item in content/shop.json needs a
// drawing in GuiWear.tsx too; ui/guiWear.test.ts checks they match.
export const DRAWN_WEAR = {
  bow: 'neck',
  scarf: 'neck',
  flower: 'head',
  cap: 'head',
  'top-hat': 'head',
  crown: 'head',
  sunglasses: 'eyes',
} as const;

export type DrawnWear = keyof typeof DRAWN_WEAR;
