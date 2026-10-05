import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUnit, units } from '../content';
import { clipKey, phraseClipFile } from '../audio/clips';
import { play, sayAsGui, sourceFor } from '../audio/voice';
import { localDay } from '../engine/episode';
import { MAX_LISTEN_MS } from '../speech/pcm';
import { StubRecognizer } from '../speech/stub';
import { ENOUGH as TIMED_ENOUGH, parseTimings, summarize, TARGET_MS, TIMINGS_KEY, type SpeechTiming } from '../speech/timing';
import type { RecognitionResult, SpeechRecognizer } from '../speech/types';
import { useHoldToTalk } from '../speech/useHoldToTalk';
import { toChildProfile, type Store, type StoredProfile } from '../store/store';
import { MicButton } from '../ui/MicButton';
import { colors, TOUCH } from '../ui/theme';
import { checkItems, checkKey, checkSummary, judgeCheck, parseCheck, reportFor, reportJson, type CheckItem, type ChildCheck, type Verdict } from './speechCheck';
import { Panel, SmallButton, pz, styles as ui } from './ui';

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
/** Bars in the timing chart. */
const BARS = 40;
/** The chart's top, so one very slow turn doesn't flatten the rest. */
const CHART_MAX_MS = 5000;

const VERDICT: Record<Verdict, { label: string; color: string }> = {
  'got-it': { label: 'Taken ✓', color: colors.teal },
  nearly: { label: 'Taken, as a near miss', color: colors.blue },
  missed: { label: 'Missed ✗', color: colors.terracotta },
};

/**
 * Speech in the parent zone: how fast answers come back on this Wi-Fi (NFR-01), and a check that the game hears
 * each child saying the phrases right (NFR-11).
 */
export function SpeechSection({ store, profiles, recognizer }: { store: Store; profiles: StoredProfile[]; recognizer: SpeechRecognizer }) {
  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
      <Text style={ui.h1}>Speech</Text>
      <Speed store={store} />
      <Check store={store} profiles={profiles} recognizer={recognizer} />
    </ScrollView>
  );
}

function Speed({ store }: { store: Store }) {
  const [list, setList] = useState<SpeechTiming[] | null>(null);
  useEffect(() => {
    void store.getSetting(TIMINGS_KEY).then((v) => setList(parseTimings(v)));
  }, [store]);
  if (!list) return null;
  const s = summarize(list);
  const recent = list.slice(-BARS);
  const clear = async () => {
    await store.setSetting(TIMINGS_KEY, '[]');
    setList([]);
  };

  return (
    <Panel title="⏱️ How fast the game hears" right={list.length ? <SmallButton label="Clear" kind="plain" onPress={() => void clear()} /> : null}>
      <Text style={ui.muted}>
        The time from a child finishing a turn to the game knowing what they said. The aim is 9 turns in 10 within 2 seconds on your Wi-Fi.
        Only times are kept here, no words or audio.
      </Text>
      {s.turns === 0 ? (
        <Text style={ui.body}>No turns timed yet. Play a few scenes with the speech service on, then look again.</Text>
      ) : (
        <>
          <Text style={[styles.verdict, { color: s.meetsTarget === false ? colors.terracotta : s.meetsTarget ? colors.teal : colors.inkSoft }]}>
            {s.meetsTarget === null
              ? `Not enough turns yet (${s.turns} of ${TIMED_ENOUGH}).`
              : s.meetsTarget
                ? '✓ Fast enough.'
                : '✗ Slower than the aim. Try playing nearer the router, or check the speech proxy.'}
          </Text>
          <Text style={ui.body}>
            Last {s.turns} turns: {s.inTime} came back within 2 seconds ({pct(s.share)}). Half took {secs(s.medianMs)} or less, 9 in 10 took{' '}
            {secs(s.p90Ms)} or less, and the slowest {secs(s.slowestMs)}.
            {s.offline ? ` ${s.offline} couldn't reach the speech service, so the game took any voice instead.` : ''}
          </Text>
          <View style={styles.chart} accessibilityLabel={`The last ${recent.length} turns, in seconds: ${recent.map((t) => (t.ms / 1000).toFixed(1)).join(', ')}`}>
            <View style={[styles.aim, { bottom: (TARGET_MS / CHART_MAX_MS) * 80 }]} />
            {recent.map((t, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { height: 3 + (Math.min(t.ms, CHART_MAX_MS) / CHART_MAX_MS) * 80 },
                  { backgroundColor: t.offline ? colors.terracotta : t.ms <= TARGET_MS ? colors.teal : colors.sun },
                ]}
              />
            ))}
          </View>
          <Text style={ui.muted}>Each bar is a turn, newest on the right. The line is 2 seconds. Red: the speech service wasn't reached.</Text>
        </>
      )}
    </Panel>
  );
}

function Check({ store, profiles, recognizer }: { store: Store; profiles: StoredProfile[]; recognizer: SpeechRecognizer }) {
  const kids = useMemo(() => profiles.map(toChildProfile), [profiles]);
  const [childId, setChildId] = useState(kids[0]?.id);
  const child = kids.find((k) => k.id === childId) ?? kids[0];
  const [unitId, setUnitId] = useState(units[0].id);
  const items = useMemo(() => (child ? checkItems(units, child) : []), [child]);
  const [checks, setChecks] = useState<Record<string, ChildCheck>>({});
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<{ text: string; verdict: Verdict } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [devText, setDevText] = useState('');
  const isStub = recognizer instanceof StubRecognizer;

  useEffect(() => {
    void (async () => {
      const all = await Promise.all(kids.map(async (k) => [k.id, parseCheck(await store.getSetting(checkKey(k.id)))] as const));
      setChecks(Object.fromEntries(all));
    })();
  }, [store, kids]);

  const inUnit = items.filter((i) => i.unitId === unitId);
  const check = (child && checks[child.id]) || {};
  const item: CheckItem | undefined = inUnit[index];

  /** The first phrase in the unit not checked yet, or the start. */
  const firstOpen = (c: ChildCheck, list: CheckItem[]) => Math.max(0, list.findIndex((i) => !c[i.key]));
  useEffect(() => {
    setIndex(firstOpen(check, inUnit));
    setHeard(null);
    // Only when the child or the unit changes, not after each answer.
  }, [childId, unitId]);

  const onHeard = (h: RecognitionResult | null) => {
    if (!h || !item || !child) return;
    if (h.offline) return setHeard({ text: '(the speech service wasn\'t reached)', verdict: 'missed' });
    setHeard({ text: h.transcript, verdict: judgeCheck(h.transcript, item, child.age) });
  };
  const { mic, level, press, release } = useHoldToTalk(recognizer, onHeard, () => {});
  const request = () => ({ locale: 'pt-PT' as const, expectedText: item?.say ?? '', maxDurationMs: MAX_LISTEN_MS });

  const simulate = async (text: string) => {
    (recognizer as StubRecognizer).willHear(text);
    const l = recognizer.listen(request());
    l.release();
    onHeard(await l.result);
  };

  const hear = () => {
    if (!item || !child) return;
    const phrase = getUnit(item.unitId).phrases.find((p) => p.id === item.phraseId);
    void (phrase && !item.ownModel ? play(sourceFor(clipKey(item.unitId, phraseClipFile(phrase, child)), item.say)) : sayAsGui(item.say));
  };

  const next = () => {
    setHeard(null);
    setIndex((i) => Math.min(inUnit.length - 1, i + 1));
  };

  const count = async () => {
    if (!item || !heard || !child) return;
    const updated = { ...check, [item.key]: { key: item.key, say: item.say, heard: heard.text, verdict: heard.verdict, at: Date.now() } };
    setChecks((c) => ({ ...c, [child.id]: updated }));
    await store.setSetting(checkKey(child.id), JSON.stringify(updated));
    next();
  };

  const clear = async () => {
    if (!child) return;
    await store.setSetting(checkKey(child.id), '{}');
    setChecks((c) => ({ ...c, [child.id]: {} }));
    setIndex(0);
    setHeard(null);
  };

  if (!child) return null;
  const done = inUnit.filter((i) => check[i.key]).length;

  return (
    <>
      <Panel title="🎯 Does the game hear them?">
        <Text style={ui.muted}>
          One child at a time, at a stop they've played. They say each phrase the right way; you tell the game whether they really did. The aim:
          fewer than 1 in 5 right answers missed. Only the words the speech service heard are kept, never audio.
        </Text>
        <View style={styles.chips}>
          {kids.map((k) => (
            <Chip key={k.id} label={`${k.name} · ${k.age}`} on={k.id === child.id} onPress={() => setChildId(k.id)} />
          ))}
        </View>
        <View style={styles.chips}>
          {units.map((u) => {
            const n = items.filter((i) => i.unitId === u.id);
            const d = n.filter((i) => check[i.key]).length;
            return <Chip key={u.id} label={`${u.unit}. ${u.title} · ${d}/${n.length}`} on={u.id === unitId} onPress={() => setUnitId(u.id)} />;
          })}
        </View>

        {item ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={ui.muted}>
                Phrase {index + 1} of {inUnit.length} · {done} checked
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SmallButton label="‹" kind="plain" accessibilityLabel="Previous phrase" disabled={index === 0} onPress={() => { setHeard(null); setIndex(index - 1); }} />
                <SmallButton label="›" kind="plain" accessibilityLabel="Next phrase" disabled={index >= inUnit.length - 1} onPress={next} />
              </View>
            </View>
            <View style={styles.sayRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.say}>{item.say}</Text>
                {item.en ? <Text style={ui.muted}>{item.en.replace(/\{name\}/g, child.name)}</Text> : null}
                {check[item.key] && !heard ? (
                  <Text style={ui.muted}>
                    Checked before: heard “{check[item.key].heard}”, {VERDICT[check[item.key].verdict].label.toLowerCase()}
                  </Text>
                ) : null}
              </View>
              <SmallButton label="🔊 Hear it" kind="plain" onPress={hear} />
              <MicButton mic={mic} level={level} disabled={isStub} onPressIn={() => void press(request())} onPressOut={release} />
            </View>
            {isStub ? (
              <Text style={ui.muted}>
                This needs the speech service: set up the proxy first (proxy/README.md).
                {__DEV__ ? ' In development, type what was heard below.' : ''}
              </Text>
            ) : null}
            {isStub && __DEV__ ? (
              <TextInput value={devText} onChangeText={setDevText} placeholder="DEV · what the speech service heard" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
            ) : null}
            {heard ? (
              <View style={styles.heard}>
                <Text style={ui.body}>
                  Heard: <Text style={{ fontWeight: '800' }}>“{heard.text || '(nothing)'}”</Text>
                </Text>
                <Text style={[styles.pill, { backgroundColor: VERDICT[heard.verdict].color }]}>{VERDICT[heard.verdict].label}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <SmallButton label="They said it right: count it" onPress={() => void count()} />
                  <SmallButton label="They didn't: try again" kind="plain" onPress={() => setHeard(null)} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </Panel>

      <Panel
        title="Results"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallButton label={showReport ? 'Hide the report' : 'Report for Claude'} kind="plain" onPress={() => setShowReport(!showReport)} disabled={!Object.keys(check).length} />
            <SmallButton label={`Start ${child.name}'s check again`} kind="plain" onPress={() => void clear()} disabled={!Object.keys(check).length} />
          </View>
        }
      >
        {kids.map((k) => {
          const results = Object.values(checks[k.id] ?? {});
          const s = checkSummary(results);
          const missed = results.filter((r) => r.verdict === 'missed');
          return (
            <View key={k.id} style={styles.result}>
              <Text style={styles.kidName}>{k.name}</Text>
              {s.said === 0 ? (
                <Text style={ui.muted}>Not checked yet.</Text>
              ) : (
                <>
                  <Text style={ui.body}>
                    {s.said} said right: {s.gotIt + s.nearly} taken ({s.gotIt} straight away, {s.nearly} as a near miss), {s.missed} missed ({pct(s.missedShare)}).
                  </Text>
                  <Text style={[styles.verdict, { color: s.meetsTarget === false ? colors.terracotta : s.meetsTarget ? colors.teal : colors.inkSoft }]}>
                    {s.meetsTarget === null ? 'A few more to go before it tells.' : s.meetsTarget ? '✓ Fewer than 1 in 5 missed.' : '✗ The game misses too many: send the report.'}
                  </Text>
                  {missed.map((r) => (
                    <Text key={r.key} style={ui.muted}>
                      {r.say} → heard “{r.heard}”
                    </Text>
                  ))}
                </>
              )}
            </View>
          );
        })}
        {showReport ? (
          <View style={{ gap: 6 }}>
            <Text style={ui.muted}>
              Copy this and send it to Claude in the project. It becomes a test, so the accepted answers can be tuned for {child.name} and stay that way.
            </Text>
            <Text selectable style={styles.report}>
              {reportJson(reportFor(child, check, localDay()))}
            </Text>
          </View>
        ) : null}
      </Panel>
    </>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  verdict: { fontSize: 17, fontWeight: '800' },
  chart: { height: 88, flexDirection: 'row', alignItems: 'flex-end', gap: 3, borderBottomWidth: 2, borderColor: pz.line },
  aim: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.inkSoft },
  bar: { flex: 1, maxWidth: 18, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: colors.ink, justifyContent: 'center', backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 15, fontWeight: '800', color: colors.ink },
  card: { borderWidth: 2, borderColor: pz.line, borderRadius: 14, padding: 16, gap: 12, backgroundColor: '#FCFAF5' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sayRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  say: { fontSize: 30, fontWeight: '900', color: colors.ink },
  heard: { gap: 8, borderTopWidth: 1, borderColor: pz.line, paddingTop: 12 },
  pill: { alignSelf: 'flex-start', color: colors.white, fontWeight: '900', fontSize: 15, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  devInput: { borderWidth: 2, borderColor: pz.line, borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: colors.white },
  result: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: pz.line },
  kidName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  report: { fontFamily: 'monospace', fontSize: 12, color: colors.ink, backgroundColor: '#F4EFE4', padding: 10, borderRadius: 8 },
});
