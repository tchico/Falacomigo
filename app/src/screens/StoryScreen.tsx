import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { storyGame } from '../content';
import type { Story } from '../content/types';
import { fillGuess } from '../engine/guess';
import { COINS_PER_TURN } from '../engine/rewards';
import { judgeSentence, STORY_BONUS, tellerFor, type StoryOption } from '../engine/story';
import { MIN_SPEECH_MS } from '../engine/turn';
import { sayAsGui, stop } from '../audio/voice';
import type { Store, StoredProfile } from '../store/store';
import { MAX_LISTEN_MS } from '../speech/pcm';
import { StubRecognizer } from '../speech/stub';
import type { RecognitionResult, SpeechRecognizer } from '../speech/types';
import { useHoldToTalk } from '../speech/useHoldToTalk';
import { BackButton } from '../ui/BackButton';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { Kid } from '../ui/Kid';
import { MicButton } from '../ui/MicButton';
import { colors, radius, TOUCH } from '../ui/theme';

type Phase = 'pick' | 'tell' | 'end';

/** One sentence of the story: Gui's, or one a child added (with the picture it came from, if any). */
interface Line {
  text: string;
  emoji?: string;
  by?: string;
}

interface Props {
  store: Store;
  /** The two children, older first. */
  pair: [StoredProfile, StoredProfile];
  recognizer: SpeechRecognizer;
  onExit: () => void;
}

const L = storyGame.lines;

/**
 * FR-25: build a story together. Gui says the first line, then the children take turns adding one sentence each out
 * loud, with three pictures to help ("Morava num castelo.") or a sentence of their own. Gui says each sentence back,
 * so a choice that was half-said is heard in full, and at the end reads the whole story. Nothing is ever wrong here.
 */
export function StoryScreen({ store, pair, recognizer, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [storyNo, setStoryNo] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [attempts, setAttempts] = useState(0);
  /** The picture the teller last tapped to hear, used if their speech can't be judged. */
  const [tapped, setTapped] = useState<StoryOption | null>(null);
  const [line, setLine] = useState(L.which);
  const [talking, setTalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [devText, setDevText] = useState('');
  const scroll = useRef<ScrollView>(null);
  const isStub = recognizer instanceof StubRecognizer;

  const teller = pair[tellerFor(step, storyNo)];
  const current = story && phase === 'tell' ? story.steps[step] : null;

  const say = async (text: string) => {
    setLine(text);
    setTalking(true);
    try {
      await sayAsGui(text);
    } finally {
      setTalking(false);
    }
  };

  useEffect(() => {
    void say(L.which);
    return () => void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coins = (id: string, n: number) => {
    setEarned((e) => ({ ...e, [id]: (e[id] ?? 0) + n }));
    store.addCoins(id, n).catch((e) => console.error('Could not save the coins', e));
  };

  const askFor = (s: Story, i: number, no: number) => {
    setStep(i);
    setAttempts(0);
    setTapped(null);
    return say(`${fillGuess(L.turn, { name: pair[tellerFor(i, no)].name })} ${s.steps[i].ask}`);
  };

  const begin = async (s: Story) => {
    setStory(s);
    setLines([{ text: s.start.text }]);
    setStep(0);
    setPhase('tell');
    setBusy(true);
    await say(`${L.start} ${s.start.text}`);
    await askFor(s, 0, storyNo);
    setBusy(false);
  };

  /** The sentence goes in the story, Gui says it back, and it's the other child's turn (or the end). */
  const add = async (added: Line) => {
    if (!story) return;
    setBusy(true);
    coins(teller.id, COINS_PER_TURN);
    setLines((ls) => [...ls, added]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    if (added.text) await say(added.emoji ? added.text : `${L.own} ${added.text}`);
    else await say(L.own);
    if (step + 1 < story.steps.length) await askFor(story, step + 1, storyNo);
    else {
      for (const p of pair) coins(p.id, STORY_BONUS);
      setPhase('end');
      await say(L.end);
    }
    setBusy(false);
  };

  const fromOption = (o: StoryOption): Line => ({ text: o.text, emoji: o.emoji, by: teller.id });

  const onHeard = async (heard: RecognitionResult | null) => {
    if (!current) return;
    if (!heard) return setLine('🎤 O microfone não está a funcionar. (The microphone isn\'t working: check the permission.)');
    const told = heard.offline ? null : judgeSentence(heard.transcript, current, teller.age);
    if (told?.kind === 'option') return add(fromOption(told.option));
    if (told?.kind === 'own') return add({ text: told.text, by: teller.id });
    const n = attempts + 1;
    setAttempts(n);
    // Hard to hear, or no connection: once they've said something, the picture they tapped counts, or failing that
    // their sentence does even though it couldn't be written down (FR-09, NFR-02).
    if ((heard.offline || n >= 2) && heard.voicedMs >= MIN_SPEECH_MS) return add(tapped ? fromOption(tapped) : { text: '', by: teller.id });
    return say(heard.offline || n >= 2 ? L.help : L.again);
  };

  const { mic, level, press, release } = useHoldToTalk(recognizer, (h) => void onHeard(h), () => void say('Segura e fala!'));
  const request = () => ({ locale: 'pt-PT' as const, expectedText: '', maxDurationMs: MAX_LISTEN_MS });
  const listen = () => void press(request());

  const simulate = async (transcript: string) => {
    (recognizer as StubRecognizer).willHear(transcript);
    const l = recognizer.listen(request());
    l.release();
    await onHeard(await l.result);
  };

  const readAll = () => void say(lines.map((l) => l.text).filter(Boolean).concat(L.end).join(' '));

  const another = () => {
    setStoryNo((n) => n + 1);
    setStory(null);
    setLines([]);
    setPhase('pick');
    void say(L.which);
  };

  const exit = () => {
    void stop();
    onExit();
  };

  const kidFor = (id?: string) => pair.find((p) => p.id === id);

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <BackButton onPress={exit} />
        <Text style={styles.title}>{story ? `${story.emoji} ${story.title}` : `📖 ${storyGame.title}`}</Text>
        <View style={styles.team}>
          {pair.map((p) => (
            <Kid key={p.id} p={p} size={54} coins={earned[p.id]} active={phase === 'tell' && p.id === teller.id} />
          ))}
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.guiSide}>
          <View style={styles.bubble}>
            <Text style={styles.line}>{line}</Text>
          </View>
          <Gui size={180} talking={talking} happy={phase === 'end'} />
        </View>

        <View style={styles.play}>
          {phase === 'pick' && (
            <View style={styles.picks}>
              {storyGame.stories.map((s) => (
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.titleEn ?? s.title} onPress={() => void begin(s)} style={({ pressed }) => [styles.pickCard, pressed && { transform: [{ translateY: 4 }] }]}>
                  <Text style={styles.pickEmoji}>{s.emoji}</Text>
                  <Text style={styles.pickTitle}>{s.title}</Text>
                  {s.titleEn ? <Text style={styles.pickEn}>{s.titleEn}</Text> : null}
                </Pressable>
              ))}
            </View>
          )}

          {(phase === 'tell' || phase === 'end') && (
            <ScrollView ref={scroll} style={styles.book} contentContainerStyle={styles.bookInner}>
              {lines.map((l, i) => {
                const by = kidFor(l.by);
                return (
                  <Pressable key={i} accessibilityRole="button" accessibilityLabel="Hear this sentence" disabled={!l.text} onPress={() => void say(l.text)} style={styles.sentence}>
                    {by ? <Kid p={by} size={34} /> : <Text style={styles.sentenceMark}>🐦</Text>}
                    <Text style={styles.sentenceText}>
                      {l.emoji ? `${l.emoji} ` : ''}
                      {l.text || '🎤 …'}
                    </Text>
                  </Pressable>
                );
              })}
              {phase === 'end' ? <Text style={styles.fim}>{L.end}</Text> : null}
            </ScrollView>
          )}

          {current && (
            <View style={styles.options}>
              {current.options.map((o) => (
                <Pressable
                  key={o.text}
                  accessibilityRole="button"
                  accessibilityLabel={`Hear: ${o.en}`}
                  disabled={busy}
                  onPress={() => {
                    setTapped(o);
                    void say(o.text);
                  }}
                  style={[styles.option, tapped?.text === o.text && styles.optionTapped]}
                >
                  <Text style={styles.optionEmoji}>{o.emoji}</Text>
                  <Text style={styles.optionText}>{o.text}</Text>
                  {teller.age === 8 ? <Text style={styles.optionEn}>{o.en}</Text> : null}
                </Pressable>
              ))}
            </View>
          )}

          {phase === 'end' && (
            <View style={styles.row}>
              <BigButton label={L.read} onPress={readAll} accessibilityLabel="Hear the whole story" />
              <BigButton label={L.more} onPress={another} accessibilityLabel="Another story" />
              <BigButton label="🏠" variant="secondary" onPress={exit} accessibilityLabel="Home" />
            </View>
          )}
        </View>
      </View>

      {current && (
        <View style={styles.bottom}>
          <View style={styles.hint}>
            <Text style={styles.hintLabel}>{teller.name.toUpperCase()}</Text>
            <Text style={styles.hintText}>{current.ask}</Text>
            <Text style={styles.hintEn}>{teller.age === 8 && current.askEn ? `${current.askEn} · ` : ''}{L.helpEn}</Text>
          </View>
          <MicButton mic={mic} level={level} disabled={isStub || busy} onPressIn={listen} onPressOut={release} />
        </View>
      )}

      {isStub && current && !busy ? (
        <View style={styles.dev}>
          <Text style={styles.devLabel}>DEV · stub microphone</Text>
          <BigButton label="Say a picture" variant="secondary" onPress={() => void simulate(current.options[1].text)} />
          <BigButton label="Own sentence" variant="secondary" onPress={() => void simulate('e depois foram ao café comer um bolo')} />
          <BigButton label="Silence" variant="secondary" onPress={() => void simulate('')} />
          <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3ECDD' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 24, paddingTop: 16 },
  title: { flex: 1, fontSize: 30, fontWeight: '900', color: colors.ink },
  team: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  main: { flex: 1, flexDirection: 'row', gap: 24, padding: 20 },
  guiSide: { width: 280, alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  bubble: { padding: 18, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  line: { fontSize: 22, fontWeight: '800', color: colors.ink },
  play: { flex: 1, justifyContent: 'center', gap: 16 },
  picks: { flexDirection: 'row', gap: 20, justifyContent: 'center', flexWrap: 'wrap' },
  pickCard: { width: 230, padding: 18, alignItems: 'center', gap: 6, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  pickEmoji: { fontSize: 90 },
  pickTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  pickEn: { fontSize: 15, fontWeight: '700', color: colors.inkSoft, textAlign: 'center' },
  book: { flex: 1, backgroundColor: '#FFFDF7', borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  bookInner: { padding: 18, gap: 10 },
  sentence: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sentenceMark: { width: 34, fontSize: 26, textAlign: 'center' },
  sentenceText: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink },
  fim: { fontSize: 26, fontWeight: '900', color: colors.teal, textAlign: 'center', marginTop: 8 },
  options: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  option: { flex: 1, maxWidth: 240, minHeight: TOUCH * 2, padding: 12, alignItems: 'center', gap: 4, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  optionTapped: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  optionEmoji: { fontSize: 64 },
  optionText: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  optionEn: { fontSize: 14, fontWeight: '700', color: colors.inkSoft, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 20, justifyContent: 'center', flexWrap: 'wrap' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 20 },
  hint: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 14 },
  hintLabel: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  hintText: { fontSize: 30, fontWeight: '800', color: colors.ink },
  hintEn: { fontSize: 15, fontWeight: '700', color: colors.inkSoft },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF3CD', borderTopWidth: 2, borderColor: colors.ink },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
