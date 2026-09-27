import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ChildProfile, Unit } from '../content/types';
import { buildScene } from '../engine/scene';
import { matchAttempt } from '../engine/match';
import { applyAttempt, countsAsSuccess, newTurn, parentOverride, type TurnState } from '../engine/turn';
import type { SpeechRecognizer } from '../speech/types';
import { StubRecognizer } from '../speech/stub';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { colors, radius } from '../ui/theme';

export interface TurnLog {
  beatId: string;
  phraseId: string;
  success: boolean;
  outcome: TurnState['outcome'];
}

interface Props {
  unit: Unit;
  sceneId: string;
  child: ChildProfile;
  recognizer: SpeechRecognizer;
  onCoins: (n: number) => void;
  onFinished: (log: TurnLog[]) => void;
}

const COINS_PER_TURN = 10; // FR-20

/**
 * One scene, beat by beat (FR-03: speaking is the only way forward).
 * With the stub recogniser, a developer panel at the bottom stands in for the microphone.
 */
export function SceneScreen({ unit, sceneId, child, recognizer, onCoins, onFinished }: Props) {
  const beats = useMemo(() => buildScene(unit, sceneId, child), [unit, sceneId, child]);
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<TurnState>(newTurn());
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [devText, setDevText] = useState('');
  const log = useRef<TurnLog[]>([]);

  const beat = beats[index];
  const isStub = recognizer instanceof StubRecognizer;

  const advance = () => {
    setFeedback(null);
    setTurn(newTurn());
    if (index + 1 >= beats.length) onFinished(log.current);
    else setIndex(index + 1);
  };

  const finishTurn = (t: TurnState) => {
    if (!beat.phrase) return;
    log.current.push({ beatId: beat.id, phraseId: beat.phrase.id, success: countsAsSuccess(t.outcome), outcome: t.outcome });
    onCoins(COINS_PER_TURN);
    // Gui always answers with the correct form (a recast), whether the child got it exactly or nearly (FR-10).
    setFeedback(beat.recast ?? (t.outcome === 'got-it' ? 'Boa!' : beat.modelText) ?? 'Boa!');
  };

  const speak = async () => {
    if (!beat.target || !beat.modelText || turn.done) return;
    setListening(true);
    const heard = await recognizer.recognize({ locale: 'pt-PT', expectedText: beat.modelText, maxDurationMs: 6000 });
    setListening(false);
    const result = matchAttempt(heard.transcript, beat.target, child.age);
    const next = applyAttempt(turn, { result, durationMs: heard.durationMs });
    setTurn(next);
    if (next.done) finishTurn(next);
    else setFeedback(next.playModel ? `Ouve: ${beat.modelText}` : 'Hmm? Outra vez!');
  };

  const override = () => {
    if (!beat.phrase || turn.done) return;
    const next = parentOverride(turn);
    setTurn(next);
    finishTurn(next);
  };

  const simulate = (transcript: string) => {
    (recognizer as StubRecognizer).willHear(transcript);
    void speak();
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
        <Pressable onLongPress={override} delayLongPress={1200} accessibilityLabel="Gui">
          <Gui size={240} happy={turn.done} />
        </Pressable>
        <View style={styles.bubble}>
          <Text style={styles.line}>{turn.done && feedback ? feedback : beat.line}</Text>
          {child.age === 8 && beat.lineEn && !turn.done ? <Text style={styles.lineEn}>{beat.lineEn}</Text> : null}
          {!turn.done && feedback ? <Text style={styles.nudge}>{feedback}</Text> : null}
        </View>
      </View>

      <View style={styles.bottom}>
        {beat.phrase && !turn.done ? (
          <>
            <View style={styles.hint}>
              <Text style={styles.hintLabel}>DIZ ASSIM</Text>
              <Text style={styles.hintText}>{hintFor(beat.modelText ?? '', beat.phrase.startRung, turn.playModel)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to talk"
              onPress={isStub ? undefined : speak}
              style={[styles.mic, listening && { backgroundColor: colors.terracottaLight }]}
            >
              <Text style={styles.micText}>{listening ? 'A ouvir…' : 'Fala!'}</Text>
            </Pressable>
          </>
        ) : (
          <BigButton label={index + 1 >= beats.length ? 'Fim!' : 'Continuar'} variant="blue" onPress={advance} />
        )}
      </View>

      {isStub && beat.phrase && !turn.done ? (
        <View style={styles.dev}>
          <Text style={styles.devLabel}>DEV · stub microphone</Text>
          <BigButton label="Say it right" variant="secondary" onPress={() => simulate(beat.modelText ?? '')} />
          <BigButton label="Nearly" variant="secondary" onPress={() => simulate(beat.target?.keywords.find((k) => !k.includes('{')) ?? '')} />
          <BigButton label="Silence" variant="secondary" onPress={() => simulate('')} />
          <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => simulate(devText)} />
        </View>
      ) : null}
    </View>
  );
}

/** Show more or less of the phrase depending on the rung (support ladder, design doc §3). */
function hintFor(model: string, rung: number, playModel: boolean): string {
  if (playModel || rung <= 2) return model;
  const words = model.split(' ');
  if (rung === 3) return `${words.slice(0, Math.max(1, words.length - 1)).join(' ')} …`;
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
  nudge: { fontSize: 22, fontWeight: '800', color: colors.terracotta },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 24, backgroundColor: colors.grass, paddingTop: 20 },
  hint: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  hintLabel: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  hintText: { fontSize: 34, fontWeight: '800', color: colors.ink },
  mic: { width: 130, height: 130, borderRadius: 65, backgroundColor: colors.terracotta, borderWidth: 5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  micText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF3CD', borderTopWidth: 2, borderColor: colors.ink },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
