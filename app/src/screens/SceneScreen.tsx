import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChildProfile, Unit } from '../content/types';
import { buildScene } from '../engine/scene';
import { matchAttempt } from '../engine/match';
import { applyAttempt, applyOfflineAttempt, ladderOutcome, newTurn, parentOverride, type TurnState } from '../engine/turn';
import { startRungFor, type Outcome, type PhraseProgress } from '../engine/ladder';
import type { Listening, RecognitionResult, SpeechRecognizer } from '../speech/types';
import { MAX_LISTEN_MS } from '../speech/pcm';
import { clipKey, phraseClipFile } from '../audio/clips';
import { play, sayAs, sayAsGui, sourceFor, stop } from '../audio/voice';
import { StubRecognizer } from '../speech/stub';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { pictureFor } from '../ui/pictures';
import { colors, radius } from '../ui/theme';

export interface TurnLog {
  beatId: string;
  phraseId: string;
  startRung: number;
  /** How the turn counts on the support ladder. */
  outcome: Outcome;
  turnOutcome: TurnState['outcome'];
}

interface Props {
  unit: Unit;
  sceneId: string;
  child: ChildProfile;
  recognizer: SpeechRecognizer;
  /** The child's ladder progress, to pick how much support each phrase gets. */
  progress: Record<string, PhraseProgress>;
  /** Called as soon as each spoken turn ends, so it can be saved straight away (NFR-08). */
  onTurn: (t: TurnLog) => void;
  onFinished: () => void;
}

/**
 * One scene, beat by beat (FR-03: speaking is the only way forward).
 * With the stub recogniser, a developer panel at the bottom stands in for the microphone.
 */
export function SceneScreen({ unit, sceneId, child, recognizer, progress, onTurn, onFinished }: Props) {
  const beats = useMemo(() => buildScene(unit, sceneId, child), [unit, sceneId, child]);
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<TurnState>(newTurn());
  const [mic, setMic] = useState<'idle' | 'listening' | 'thinking'>('idle');
  const [level, setLevel] = useState(0);
  const listening = useRef<Listening | null>(null);
  const holding = useRef(false);
  /** Development builds only: what the recogniser returned, to diagnose recognition problems. */
  const [devHeard, setDevHeard] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [devText, setDevText] = useState('');

  const beat = beats[index];
  const isStub = recognizer instanceof StubRecognizer;
  const startRung = beat.phrase ? startRungFor(beat.phrase.startRung, child.age) : 1;
  const rung = beat.phrase ? progress[beat.phrase.id]?.rung ?? startRung : 1;

  /** The model phrase in Dad's voice if he's recorded it, otherwise text-to-speech (FR-05). */
  const playModel = () => {
    if (!beat.phrase || !beat.modelText) return Promise.resolve();
    const source = beat.ownModel
      ? ({ kind: 'tts', text: beat.modelText } as const)
      : sourceFor(clipKey(unit.id, phraseClipFile(beat.phrase, child)), beat.modelText);
    return play(source);
  };

  // Gui says every line out loud, so the 6-year-old never needs to read (NFR-03).
  // On the Echo rung the child hears the phrase straight after, to copy it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await sayAs(beat.speaker, beat.line);
      if (!cancelled && beat.phrase && rung === 1) await playModel();
    })();
    return () => {
      cancelled = true;
    };
    // Only when a new beat starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => void stop(), []);

  /** The recast and nudges come from whoever is talking in this beat. */
  const say = (text: string) => {
    setFeedback(text);
    void sayAs(beat.speaker, text);
  };
  const character = beat.speaker === 'gui' ? null : unit.characters?.[beat.speaker];

  const advance = () => {
    void stop();
    setFeedback(null);
    setTurn(newTurn());
    if (index + 1 >= beats.length) onFinished();
    else setIndex(index + 1);
  };

  const finishTurn = (t: TurnState) => {
    if (!beat.phrase) return;
    onTurn({ beatId: beat.id, phraseId: beat.phrase.id, startRung, outcome: ladderOutcome(t.outcome), turnOutcome: t.outcome });
    // Gui always answers with the correct form (a recast), whether the child got it exactly or nearly (FR-10).
    say(beat.recast ?? (t.outcome === 'got-it' ? 'Boa!' : beat.modelText) ?? 'Boa!');
  };

  /** Hold-to-talk (FR-06): listening starts when the button goes down and ends on release, a pause, or 6 seconds. */
  const startListening = async () => {
    holding.current = true;
    if (!beat.target || !beat.modelText || turn.done || listening.current) return;
    await stop();
    if (!holding.current) {
      // A quick tap, not a hold.
      say('Segura e fala!');
      return;
    }
    const l = recognizer.listen({ locale: 'pt-PT', expectedText: beat.modelText, maxDurationMs: MAX_LISTEN_MS }, setLevel);
    listening.current = l;
    setMic('listening');
    let heard: RecognitionResult;
    try {
      heard = await l.result;
    } catch (e) {
      // The microphone didn't start (no permission, or none available). Don't count it as a try:
      // say so plainly for the grown-up, and the parent override still works.
      console.warn('Microphone unavailable', e);
      listening.current = null;
      setMic('idle');
      setLevel(0);
      setFeedback('🎤 O microfone não está a funcionar. (The microphone isn\'t working: check the permission.)');
      return;
    }
    listening.current = null;
    setMic('idle');
    setLevel(0);
    if (__DEV__) setDevHeard(`heard: "${heard.transcript}" · ${(heard.voicedMs / 1000).toFixed(1)} s of voice${heard.offline ? ' · OFFLINE (speech service not reached)' : ''}`);
    await onHeard(heard);
  };

  const releaseMic = () => {
    holding.current = false;
    if (listening.current) {
      setMic('thinking');
      listening.current.release();
    }
  };

  const onHeard = async (heard: RecognitionResult) => {
    if (!beat.target) return;
    const next = heard.offline
      ? applyOfflineAttempt(turn, heard.voicedMs)
      : applyAttempt(turn, { result: matchAttempt(heard.transcript, beat.target, child.age), durationMs: heard.voicedMs });
    setTurn(next);
    if (next.done) finishTurn(next);
    else if (next.playModel) {
      // After two tries, Gui plays the model and the next try with any real speech counts (FR-09).
      setFeedback(`Ouve: ${beat.modelText}`);
      await sayAsGui('Ouve!');
      await playModel();
    } else say('Hmm? Outra vez!');
  };

  const override = () => {
    if (!beat.phrase || turn.done) return;
    const next = parentOverride(turn);
    setTurn(next);
    finishTurn(next);
  };

  const simulate = async (transcript: string) => {
    if (!beat.modelText || turn.done) return;
    (recognizer as StubRecognizer).willHear(transcript);
    await stop();
    const l = recognizer.listen({ locale: 'pt-PT', expectedText: beat.modelText, maxDurationMs: MAX_LISTEN_MS });
    l.release();
    await onHeard(await l.result);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.sceneTitle}>{unit.scenes.find((s) => s.id === sceneId)?.title}</Text>
        <View style={styles.dots} accessibilityLabel={`Turn ${index + 1} of ${beats.length}`}>
          {beats.map((b, i) => (
            <View key={b.id} style={[styles.dot, i < index && { backgroundColor: colors.teal }, i === index && { backgroundColor: colors.terracottaLight }]} />
          ))}
        </View>
      </View>

      <View style={styles.stage}>
        {/* Hidden parent override (FR-12): long-press Gui. */}
        <Pressable onLongPress={override} delayLongPress={1200} accessibilityLabel={character?.name ?? 'Gui'}>
          {character ? (
            <View style={styles.character}>
              <View style={[styles.characterFace, { backgroundColor: character.color ?? colors.white }]}>
                <Text style={styles.characterEmoji}>{character.emoji}</Text>
              </View>
              <Text style={styles.characterName}>{character.name}</Text>
            </View>
          ) : (
            <Gui size={240} happy={turn.done} />
          )}
        </Pressable>
        <View style={styles.bubble}>
          <Text style={styles.line}>{turn.done && feedback ? feedback : beat.line}</Text>
          {child.age === 8 && beat.lineEn && !turn.done ? <Text style={styles.lineEn}>{beat.lineEn}</Text> : null}
          {!turn.done && feedback ? <Text style={styles.nudge}>{feedback}</Text> : null}
          {__DEV__ && devHeard ? <Text style={styles.devHeard}>{devHeard}</Text> : null}
          {pictureFor(beat.image).length ? (
            <View style={styles.pictures} accessibilityElementsHidden>
              {pictureFor(beat.image).map((e, i) => (
                <View key={i} style={styles.picture}>
                  <Text style={styles.pictureText}>{e}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottom}>
        {beat.phrase && !turn.done ? (
          <>
            <View style={styles.hint}>
              <Text style={styles.hintLabel}>DIZ ASSIM</Text>
              <Text style={styles.hintText}>{hintFor(beat.modelText ?? '', rung, turn.playModel)}</Text>
            </View>
            {rung <= 3 || turn.playModel ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Listen" onPress={() => void playModel()} style={styles.listen}>
                <Text style={styles.listenText}>🔊</Text>
              </Pressable>
            ) : null}
            <View style={styles.micWrap}>
              {/* A calm ring that grows with the child's voice while listening: no flashing (NFR-09). */}
              {mic === 'listening' ? <View style={[styles.micRing, { transform: [{ scale: 1 + Math.min(0.35, level * 4) }] }]} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hold to talk"
                accessibilityState={{ busy: mic !== 'idle' }}
                disabled={isStub || mic === 'thinking'}
                onPressIn={() => void startListening()}
                onPressOut={releaseMic}
                style={[styles.mic, mic === 'listening' && { backgroundColor: colors.terracottaLight }]}
              >
                <Text style={styles.micIcon}>🎤</Text>
                <Text style={styles.micText}>{mic === 'listening' ? 'A ouvir…' : mic === 'thinking' ? '…' : 'Fala!'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <BigButton label={index + 1 >= beats.length ? 'Fim! ★' : 'Continuar ▶'} variant="blue" onPress={advance} />
        )}
      </View>

      {isStub && beat.phrase && !turn.done ? (
        <View style={styles.dev}>
          <Text style={styles.devLabel}>DEV · stub microphone</Text>
          <BigButton label="Say it right" variant="secondary" onPress={() => void simulate(beat.modelText ?? '')} />
          <BigButton label="Nearly" variant="secondary" onPress={() => void simulate(beat.target?.keywords.find((k) => !k.includes('{')) ?? '')} />
          <BigButton label="Silence" variant="secondary" onPress={() => void simulate('')} />
          <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
        </View>
      ) : null}
    </View>
  );
}

/** Show more or less of the phrase depending on the rung (support ladder, design doc §3). */
function hintFor(model: string, rung: number, playModel: boolean): string {
  if (playModel || rung <= 2) return model;
  const words = model.split(' ');
  if (rung === 3) {
    // Fill the gap: the start of the phrase, with the end left for the child. A one-word phrase shows its first letters.
    if (words.length === 1) return `${model.slice(0, Math.min(2, Math.ceil(model.length / 3)))}…`;
    return `${words.slice(0, words.length - 1).join(' ')} …`;
  }
  return '…';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 32, paddingRight: 220, paddingTop: 24 },
  sceneTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  bubble: { maxWidth: 520, padding: 24, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, gap: 8 },
  line: { fontSize: 40, fontWeight: '800', color: colors.ink },
  lineEn: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  devHeard: { fontSize: 13, fontWeight: '700', color: colors.inkSoft, fontFamily: 'monospace' },
  nudge: { fontSize: 22, fontWeight: '800', color: colors.terracotta },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 24, backgroundColor: colors.grass, paddingTop: 20 },
  hint: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  hintLabel: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  hintText: { fontSize: 34, fontWeight: '800', color: colors.ink },
  character: { width: 240, alignItems: 'center', gap: 8 },
  characterFace: { width: 190, height: 190, borderRadius: 95, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  characterEmoji: { fontSize: 110 },
  characterName: { fontSize: 24, fontWeight: '900', color: colors.ink, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 2, overflow: 'hidden' },
  pictures: { flexDirection: 'row', gap: 12, marginTop: 8 },
  picture: { width: 88, height: 88, borderRadius: 18, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  pictureText: { fontSize: 52 },
  listen: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  listenText: { fontSize: 36 },
  mic: { width: 130, height: 130, borderRadius: 65, backgroundColor: colors.terracotta, borderWidth: 5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  micWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: colors.terracottaLight, opacity: 0.35 },
  micIcon: { fontSize: 34 },
  micText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF3CD', borderTopWidth: 2, borderColor: colors.ink },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
