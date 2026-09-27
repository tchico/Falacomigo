import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { guide } from '../content';
import type { GuideCard } from '../content/types';
import { colors, radius, TOUCH } from '../ui/theme';
import { parseInline, readingMinutes } from './inline';
import { styles as ui } from './ui';

/** Guide text with **bold** and [n] references, as nested Text so it wraps as one paragraph. */
function Rich({ text, style }: { text: string; style?: object }) {
  return (
    <Text style={[ui.body, style]}>
      {parseInline(text).map((s, i) =>
        s.kind === 'ref' ? (
          <Text key={i} style={styles.ref}>
            {` ${s.id}`}
          </Text>
        ) : (
          <Text key={i} style={s.bold ? { fontWeight: '800' } : undefined}>
            {s.text}
          </Text>
        ),
      )}
    </Text>
  );
}

const wordCount = (c: GuideCard) =>
  [...c.paragraphs, ...c.bullets, ...c.steps, c.tryThisWeek].join(' ').split(/\s+/).filter(Boolean).length;

/**
 * FR-33, FR-35: eight short cards for Dad, bundled with the app so they work offline. Each card is labelled
 * Research or Practical advice and lists its numbered sources, which open in the browser. The whole parent
 * zone sits behind the parental gate, so a child can't follow the links.
 */
export function GuideSection() {
  const [index, setIndex] = useState(0);
  const card = guide.cards[index];
  const sources = guide.sources.filter((s) => card.refs.includes(s.id));

  return (
    <View style={styles.wrap}>
      <View style={{ gap: 4 }}>
        <Text style={ui.h1}>Guide for parents</Text>
        <Text style={ui.sub}>How to help them go from understanding to speaking · {guide.cards.length} short reads</Text>
      </View>
      <View style={styles.cols}>
        <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
          {guide.cards.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: i === index }}
              onPress={() => setIndex(i)}
              style={[styles.item, i === index && styles.itemActive]}
            >
              <View style={[styles.num, i === index && { backgroundColor: colors.sun }]}>
                <Text style={styles.numText}>{c.id}</Text>
              </View>
              <Text style={[styles.itemText, i === index && { color: colors.white }]}>{c.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView style={styles.card} contentContainerStyle={{ padding: 28, gap: 14 }}>
          <View style={styles.meta}>
            <Text style={[styles.badge, card.kind === 'practical' && styles.badgePractical]}>{card.kind === 'research' ? 'RESEARCH' : 'PRACTICAL ADVICE'}</Text>
            <Text style={ui.muted}>
              Card {index + 1} of {guide.cards.length} · {readingMinutes(wordCount(card))} min read
            </Text>
          </View>
          <Text style={styles.title}>{card.title}</Text>
          {card.paragraphs.map((p, i) => (
            <Rich key={`p${i}`} text={p} />
          ))}
          {card.bullets.map((b, i) => (
            <Rich key={`b${i}`} text={`• ${b}`} />
          ))}
          {card.steps.map((s, i) => (
            <Rich key={`s${i}`} text={`${i + 1}. ${s}`} />
          ))}
          {card.table ? (
            <View style={styles.table}>
              {[card.table.header, ...card.table.rows].map((row, r) => (
                <View key={r} style={[styles.tr, r === 0 && { backgroundColor: colors.blueTint }]}>
                  {row.map((cell, c) => (
                    <View key={c} style={styles.td}>
                      <Rich text={cell} style={r === 0 ? { fontWeight: '800' } : { fontSize: 14 }} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.try}>
            <Text style={styles.tryText}>✓ Try this week: {card.tryThisWeek}</Text>
          </View>
          {sources.length ? (
            <View style={styles.sources}>
              <Text style={{ fontWeight: '800', color: colors.ink }}>Sources</Text>
              {sources.map((s) => (
                <Pressable key={s.id} accessibilityRole="link" onPress={() => void Linking.openURL(s.url)} style={styles.source}>
                  <Text style={styles.sourceText}>
                    {s.id} · {s.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 16 },
  cols: { flex: 1, flexDirection: 'row', gap: 20 },
  list: { width: 290, flexGrow: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: '#E2D9C6', backgroundColor: colors.white },
  itemActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E9E2D3', alignItems: 'center', justifyContent: 'center' },
  numText: { fontWeight: '800', color: colors.ink },
  itemText: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: '#E2D9C6' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { fontSize: 13, fontWeight: '900', color: colors.blue, backgroundColor: colors.blueTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgePractical: { color: colors.teal, backgroundColor: '#DDF1EE' },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink },
  ref: { fontSize: 12, fontWeight: '800', color: colors.blue },
  table: { borderWidth: 1, borderColor: '#E2D9C6', borderRadius: 8, overflow: 'hidden' },
  tr: { flexDirection: 'row' },
  td: { flex: 1, padding: 8, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#E2D9C6' },
  try: { borderWidth: 2, borderColor: colors.terracotta, backgroundColor: '#FFF1E6', borderRadius: 12, padding: 16 },
  tryText: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sources: { gap: 4, borderTopWidth: 1, borderColor: '#E2D9C6', paddingTop: 12 },
  source: { minHeight: TOUCH, justifyContent: 'center' },
  sourceText: { fontSize: 14, color: colors.blue, textDecorationLine: 'underline' },
});
