import type { ChildProfile } from '../content/types';

export type TemplateVars = Pick<ChildProfile, 'name' | 'ageWord' | 'sibling' | 'id'>;

/** Fills {name}, {age}, {sibling} and {childId} in content strings. Unknown placeholders are left as they are. */
export function fill(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{name\}/g, vars.name)
    .replace(/\{age\}/g, vars.ageWord)
    .replace(/\{sibling\}/g, vars.sibling)
    .replace(/\{childId\}/g, vars.id);
}

/** Portuguese word for an age, used for {age}. */
export function ageWord(age: number): string {
  const words: Record<number, string> = { 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez' };
  return words[age] ?? String(age);
}
