import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { guide } from '../content';
import { localDay } from '../engine/episode';
import { addDays } from '../engine/ladder';
import type { Store, StoredProfile } from '../store/store';
import { colors } from '../ui/theme';
import { Panel, SmallButton, pz, styles as ui } from './ui';
import { bump, daysOf, doneDays, emptyWeek, parseWeek, planRows, toggleTick, weekKey, weekOf, type WeekRecord } from './weeklyPlan';

/** Weeks of the counter shown, and how far back the plan can be looked at. */
const WEEKS = 8;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const card = guide.cards.find((c) => c.id === 5);
const rows = card?.table ? planRows(card.table.rows) : [];

const short = (monday: string) => new Date(`${monday}T00:00:00Z`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * FR-37: card 5's weekly plan, ticked off day by day, next to the unprompted-Portuguese counter from card 8. The app
 * ticks its own sessions and the Missions to Dad that got stars; Dad ticks the rest. Past weeks stay, to compare.
 */
export function WeeklyPlan({ store, profiles, version }: { store: Store; profiles: StoredProfile[]; version: number }) {
  const thisWeek = weekOf(localDay());
  const weeks = useMemo(() => Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -7 * (WEEKS - 1 - i))), [thisWeek]);
  const [shown, setShown] = useState(thisWeek);
  const [recs, setRecs] = useState<Record<string, WeekRecord>>({});
  /** Days the app saw a session, and days a Mission to Dad got its stars. */
  const [seen, setSeen] = useState<{ sessions: Set<string>; missions: Set<string> }>({ sessions: new Set(), missions: new Set() });

  useEffect(() => {
    void (async () => {
      const loaded = await Promise.all(weeks.map(async (w) => [w, parseWeek(await store.getSetting(weekKey(w)))] as const));
      setRecs(Object.fromEntries(loaded));
      const sessions = new Set<string>();
      const missions = new Set<string>();
      for (const p of profiles) {
        for (const d of await store.turnsPerDay(p.id, weeks[0])) if (d.turns > 0) sessions.add(d.day);
        for (const m of await store.missionsFor(p.id)) if (m.approvedAt !== null) missions.add(localDay(new Date(m.approvedAt)));
      }
      setSeen({ sessions, missions });
    })();
  }, [store, profiles, weeks, version]);

  const rec = recs[shown] ?? emptyWeek();
  const save = (monday: string, next: WeekRecord) => {
    setRecs((r) => ({ ...r, [monday]: next }));
    store.setSetting(weekKey(monday), JSON.stringify(next)).catch((e) => console.error('Could not save the week', e));
  };

  const days = daysOf(shown);
  const today = localDay();
  const at = weeks.indexOf(shown);
  const last = recs[addDays(shown, -7)] ?? emptyWeek();
  const most = Math.max(1, ...weeks.flatMap((w) => profiles.map((p) => recs[w]?.unprompted[p.id] ?? 0)));

  return (
    <View style={styles.grid}>
      <Panel
        title={`📅 Weekly plan · ${shown === thisWeek ? 'this week' : `week of ${short(shown)}`}`}
        style={{ flex: 3 }}
        right={
          <View style={styles.nav}>
            <SmallButton label="‹" kind="plain" accessibilityLabel="Previous week" disabled={at <= 0} onPress={() => setShown(weeks[at - 1])} />
            <SmallButton label="›" kind="plain" accessibilityLabel="Next week" disabled={at >= weeks.length - 1} onPress={() => setShown(weeks[at + 1])} />
          </View>
        }
      >
        <View style={styles.row}>
          <Text style={[styles.label, ui.muted]}>From guide card 5. Tap a day when it happened.</Text>
          {days.map((d, i) => (
            <Text key={d} style={[styles.dayHead, d === today && { color: colors.blue }]}>
              {DAY_LETTERS[i]}
            </Text>
          ))}
          <View style={styles.count} />
        </View>
        {rows.map((r, i) => {
          const auto = r.auto ? new Set(days.filter((d) => seen[r.auto!].has(d))) : new Set<string>();
          const done = doneDays(rec, i, auto);
          const n = [...done].filter((d) => days.includes(d)).length;
          const met = r.target !== null && n >= r.target;
          return (
            <View key={r.label} style={styles.row}>
              <View style={styles.label}>
                <Text style={styles.labelText}>{r.label}</Text>
                <Text style={ui.muted}>
                  {r.time}
                  {r.auto ? ' · ticks itself' : ''}
                </Text>
              </View>
              {days.map((d) => {
                const isAuto = auto.has(d);
                const on = done.has(d);
                const future = d > today;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: isAuto || future }}
                    accessibilityLabel={`${r.label}, ${d}${isAuto ? ', seen in the app' : ''}`}
                    disabled={isAuto || future}
                    onPress={() => save(shown, toggleTick(rec, i, d))}
                    style={[styles.day, on && (isAuto ? styles.dayAuto : styles.dayOn), future && { opacity: 0.35 }]}
                  >
                    <Text style={[styles.dayTick, !on && { color: 'transparent' }]}>✓</Text>
                  </Pressable>
                );
              })}
              <Text style={[styles.count, met && { color: colors.teal }]}>
                {n}
                {r.target !== null ? ` / ${r.target}` : ''}
                {met ? ' ✓' : ''}
              </Text>
            </View>
          );
        })}
      </Panel>

      <Panel title="🗣️ Unprompted Portuguese" style={{ flex: 1.6 }}>
        <Text style={ui.muted}>Each time a child speaks Portuguese without being asked: a word in an English sentence counts too. The number to watch (card 8).</Text>
        {profiles.map((p) => {
          const now = rec.unprompted[p.id] ?? 0;
          const before = last.unprompted[p.id] ?? 0;
          return (
            <View key={p.id} style={styles.kid}>
              <View style={styles.kidHead}>
                <Text style={styles.kidName}>{p.name}</Text>
                <SmallButton label="−" kind="plain" accessibilityLabel={`One fewer for ${p.name}`} disabled={!now} onPress={() => save(shown, bump(rec, p.id, -1))} />
                <Text style={styles.big}>{now}</Text>
                <SmallButton label="+1" accessibilityLabel={`One more for ${p.name}`} onPress={() => save(shown, bump(rec, p.id, 1))} />
              </View>
              <Text style={ui.muted}>
                Last week {before}
                {now > before ? ` · up ${now - before} 🎉` : ''}
              </Text>
              <View style={styles.bars} accessibilityLabel={`Last ${WEEKS} weeks: ${weeks.map((w) => recs[w]?.unprompted[p.id] ?? 0).join(', ')}`}>
                {weeks.map((w) => {
                  const v = recs[w]?.unprompted[p.id] ?? 0;
                  return <View key={w} style={[styles.bar, { height: 4 + (v / most) * 40 }, w === shown && { backgroundColor: colors.blue }]} />;
                })}
              </View>
            </View>
          );
        })}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  nav: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, borderBottomWidth: 1, borderColor: pz.line },
  label: { flex: 1, paddingRight: 8 },
  labelText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  dayHead: { width: 36, textAlign: 'center', fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  day: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: pz.line, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  dayAuto: { backgroundColor: colors.teal, borderColor: colors.teal },
  dayTick: { color: colors.white, fontSize: 18, fontWeight: '900' },
  count: { width: 58, textAlign: 'right', fontSize: 15, fontWeight: '800', color: colors.ink },
  kid: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: pz.line },
  kidHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kidName: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink },
  big: { minWidth: 48, textAlign: 'center', fontSize: 30, fontWeight: '900', color: colors.ink },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 46 },
  bar: { flex: 1, borderRadius: 4, backgroundColor: '#C9D6EA' },
});
