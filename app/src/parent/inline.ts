// Splits guide text into plain runs, **bold** runs and [n] source references, for the Guide screen (FR-33, FR-35).

export type Segment = { kind: 'text'; text: string; bold?: boolean } | { kind: 'ref'; id: number };

export function parseInline(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*\*(.+?)\*\*|\[(\d+)\]/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'text', text: m[1], bold: true });
    else out.push({ kind: 'ref', id: Number(m[2]) });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Rough reading time, for the card header. */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));
