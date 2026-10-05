import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Tap } from '../ui/Tap';
import { Lean } from '../ui/Thinking';
import { guiLines } from '../content';
import type { AgeBand } from '../content/types';
import { sayAsGui, stop } from '../audio/voice';
import { findWord, targetFor, type Word } from '../engine/comoSeDiz';
import { matchAttempt } from '../engine/match';
import { applyAttempt, applyOfflineAttempt, newTurn, type TurnState } from '../engine/turn';
import { MAX_LISTEN_MS } from '../speech/pcm';
import { StubRecognizer } from '../speech/stub';
import type { RecognitionResult, SpeechRecognizer } from '../speech/types';
import { useHoldToTalk } from '../speech/useHoldToTalk';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { MicButton } from '../ui/MicButton';
import type { Wear } from '../engine/shop';
import { colors, radius } from '../ui/theme';

interface Props {
  recognizer: SpeechRecognizer;
  /** The word lists of the units the child has reached. */
  words: Word[];
  age: AgeBand;
  /** Set when the child already said an English word in the scene: Gui goes straight to the Portuguese. */
  word?: Word | null;
  wear?: Wear;
  /** The child said the Portuguese word back: it counts (FR-11). */
  onLearned: () => void;
  onClose: () => void;
}

type Stage = 'ask' | 'say' | 'learned';

/**
 * "Como se diz?" (FR-11). The child says a word in English, Gui gives it back in Portuguese from the unit's word list,
 * and once the child says it too it counts. Never "wrong": a word Gui doesn't know is just one he hasn't learned yet.
 */
export function ComoSeDiz({ recognizer, words, age, word: given, wear, onLearned, onClose }: Props) {
  const l = guiLines.comoSeDiz;
  const [word, setWord] = useState<Word | null>(given ?? null);
  const [stage, setStage] = useState<Stage>(given ? 'say' : 'ask');
  const [line, setLine] = useState(given ? l.answer : l.ask);
  const [lineEn, setLineEn] = useState<string | null>(given ? null : l.askEn);
  const [turn, setTurn] = useState<TurnState>(newTurn());
  const [talking, setTalking] = useState(false);
  const [devText, setDevText] = useState('');
  const isStub = recognizer instanceof StubRecognizer;

  const say = async (...texts: string[]) => {
    setTalking(true);
    try {
      for (const t of texts) await sayAsGui(t);
    } finally {
      setTalking(false);
    }
  };

  const teach = (w: Word) => {
    setWord(w);
    setStage('say');
    setTurn(newTurn());
    setLine(l.answer);
    setLineEn(null);
    void say(l.answer, w.pt, l.yourTurn);
  };

  useEffect(() => {
    if (given) teach(given);
    else void say(l.ask);
    return () => void stop();
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHeard = async (heard: RecognitionResult | null) => {
    if (!heard) {
      setLine('🎤 O microfone não está a funcionar.');
      setLineEn("The microphone isn't working: check the permission.");
      return;
    }
    if (stage === 'ask') {
      const found = heard.offline ? null : findWord(heard.transcript, words);
      if (found) return teach(found);
      setLine(l.unknown);
      setLineEn(l.unknownEn);
      return say(l.unknown);
    }
    if (stage !== 'say' || !word) return;
    const next = heard.offline
      ? applyOfflineAttempt(turn, heard.voicedMs)
      : applyAttempt(turn, { result: matchAttempt(heard.transcript, targetFor(word), age), durationMs: heard.voicedMs });
    setTurn(next);
    if (next.done) {
      setStage('learned');
      setLine(l.praise);
      onLearned();
      return say(l.praise);
    }
    if (next.playModel) return say(word.pt);
    return say(l.again, word.pt);
  };

  const request = () =>
    stage === 'ask' ? ({ locale: 'en-GB', expectedText: '', maxDurationMs: MAX_LISTEN_MS } as const) : ({ locale: 'pt-PT', expectedText: word?.pt ?? '', maxDurationMs: MAX_LISTEN_MS } as const);
  const { mic, level, press, release } = useHoldToTalk(recognizer, (h) => void onHeard(h), () => void say('Segura e fala!'));

  const simulate = async (transcript: string) => {
    (recognizer as StubRecognizer).willHear(transcript);
    const listening = recognizer.listen(request());
    listening.release();
    await onHeard(await listening.result);
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel} accessibilityViewIsModal>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Tap>
        <View style={styles.row}>
          <Lean on={mic === 'thinking'}>
            <Gui size={170} talking={talking} happy={stage === 'learned'} wear={wear} />
          </Lean>
          <View style={styles.words}>
            <Text style={styles.line}>{line}</Text>
            {lineEn ? <Text style={styles.en}>{lineEn}</Text> : null}
            {word && stage !== 'ask' ? (
              <View style={styles.word}>
                <Text style={styles.wordPt}>{word.pt}</Text>
                <Text style={styles.wordEn}>{word.en}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.bottom}>
          {stage === 'learned' ? (
            <BigButton label={l.back} variant="blue" onPress={onClose} />
          ) : (
            <>
              {stage === 'say' && word ? (
                <Tap accessibilityRole="button" accessibilityLabel="Listen" onPress={() => void say(word.pt)} style={styles.listen}>
                  <Text style={styles.listenText}>🔊</Text>
                </Tap>
              ) : null}
              <MicButton mic={mic} level={level} disabled={isStub} onPressIn={() => void press(request())} onPressOut={release} />
            </>
          )}
        </View>
        {isStub && stage !== 'learned' ? (
          <View style={styles.dev}>
            <Text style={styles.devLabel}>DEV · stub</Text>
            {stage === 'ask' ? (
              <BigButton label="dog" variant="secondary" onPress={() => void simulate('Dog.')} />
            ) : (
              <BigButton label="Say it right" variant="secondary" onPress={() => void simulate(word?.pt ?? '')} />
            )}
            <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(30,42,68,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  panel: { width: 760, maxWidth: '94%', backgroundColor: colors.cream, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 24, gap: 16 },
  close: { position: 'absolute', right: 14, top: 14, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  closeText: { fontSize: 26, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingRight: 60 },
  words: { flex: 1, gap: 10 },
  line: { fontSize: 32, fontWeight: '900', color: colors.ink },
  en: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  word: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 10 },
  wordPt: { fontSize: 44, fontWeight: '900', color: colors.blue },
  wordEn: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  listen: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  listenText: { fontSize: 36 },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FFF3CD', borderWidth: 2, borderColor: colors.ink, borderRadius: 10 },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
