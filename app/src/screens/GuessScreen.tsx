import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Tap } from '../ui/Tap';
import { Lean } from '../ui/Thinking';
import { guessGame } from '../content';
import type { GuessCard } from '../content/types';
import { cardsFor, fillGuess, GUESS_BONUS, judgeClue, judgeGuess, newRound, type GuessRound } from '../engine/guess';
import { COINS_PER_TURN } from '../engine/rewards';
import { applyAttempt, applyOfflineAttempt, MIN_SPEECH_MS, newTurn, type TurnState } from '../engine/turn';
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

type Phase = 'intro' | 'hand-describer' | 'describe' | 'hand-guesser' | 'guess' | 'got' | 'end';

interface Props {
  store: Store;
  /** The two children, older first: they take turns giving the clues, starting with the older one. */
  pair: [StoredProfile, StoredProfile];
  /** The furthest unit both have reached, so the words are ones they both know. */
  reachedUnit: number;
  recognizer: SpeechRecognizer;
  onExit: () => void;
}

const L = guessGame.lines;
const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * FR-24: "Adivinha!", describe and guess with the tablet passed between the two children. The one giving clues sees
 * the secret picture and its clues (each can be heard), and says one; the other says which picture it is. They play
 * as a team: a guess that isn't it just asks for another clue. The usual generous rules apply to every spoken turn.
 */
export function GuessScreen({ store, pair, reachedUnit, recognizer, onExit }: Props) {
  const cards = useMemo(() => cardsFor(guessGame.cards, reachedUnit), [reachedUnit]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [roundNo, setRoundNo] = useState(0);
  const [round, setRound] = useState<GuessRound | null>(null);
  const used = useRef<string[]>([]);
  /** Pictures already guessed this round, which weren't it. */
  const [tried, setTried] = useState<string[]>([]);
  const [turn, setTurn] = useState<TurnState>(newTurn());
  /** The picture the guesser last tapped to hear, used if the speech can't be judged. */
  const [tapped, setTapped] = useState<GuessCard | null>(null);
  const [line, setLine] = useState(L.intro);
  const [talking, setTalking] = useState(false);
  const [found, setFound] = useState(0);
  const [earned, setEarned] = useState<Record<string, number>>({});
  const [devText, setDevText] = useState('');
  const isStub = recognizer instanceof StubRecognizer;

  const describer = pair[roundNo % 2];
  const guesser = pair[(roundNo + 1) % 2];
  const names = { describer: describer.name, guesser: guesser.name };
  const listener = phase === 'guess' ? guesser : describer;

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
    void say(L.intro);
    return () => void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coins = (id: string, n: number) => {
    setEarned((e) => ({ ...e, [id]: (e[id] ?? 0) + n }));
    store.addCoins(id, n).catch((e) => console.error('Could not save the coins', e));
  };

  const startRound = (n: number) => {
    const r = newRound(cards, used.current);
    used.current.push(r.secret.id);
    setRoundNo(n);
    setRound(r);
    setTried([]);
    setTapped(null);
    setPhase('hand-describer');
    const d = pair[n % 2];
    const g = pair[(n + 1) % 2];
    void say(fillGuess(L.describerTurn, { describer: d.name, guesser: g.name }));
  };

  const toDescribe = () => {
    setTurn(newTurn());
    setPhase('describe');
    void say(tried.length ? L.moreClue : L.describe);
  };

  const toGuess = () => {
    setTurn(newTurn());
    setTapped(null);
    setPhase('guess');
    void say(L.guess);
  };

  const choose = (card: GuessCard) => {
    if (!round) return;
    if (card.id === round.secret.id) {
      coins(describer.id, GUESS_BONUS);
      coins(guesser.id, GUESS_BONUS);
      setFound((f) => f + 1);
      setPhase('got');
      void say(`${L.right} ${round.secret.say}`);
      return;
    }
    // Not it: no "wrong", just another clue. With only the secret left, it's found next time for sure.
    setTried((t) => [...t, card.id]);
    setPhase('hand-describer');
    void say(fillGuess(L.notIt, { option: capitalise(card.name) }));
  };

  const onHeard = async (heard: RecognitionResult | null) => {
    if (!round) return;
    if (!heard) return setLine('🎤 O microfone não está a funcionar. (The microphone isn\'t working: check the permission.)');

    if (phase === 'describe') {
      const judged = heard.offline ? null : judgeClue(heard.transcript, round.secret, describer.age);
      if (judged === 'named-it') return say(L.psst);
      const next = judged ? applyAttempt(turn, { result: judged, durationMs: heard.voicedMs }) : applyOfflineAttempt(turn, heard.voicedMs);
      setTurn(next);
      if (next.done) {
        coins(describer.id, COINS_PER_TURN);
        return say(L.goodClue);
      }
      if (next.playModel) return say(`Ouve: ${round.secret.clues[tried.length % round.secret.clues.length].text}`);
      return say(L.again);
    }

    if (phase === 'guess') {
      const left = round.options.filter((o) => !tried.includes(o.id));
      const judged = heard.offline ? null : judgeGuess(heard.transcript, left, guesser.age);
      if (judged?.result === 'got-it') {
        coins(guesser.id, COINS_PER_TURN);
        return choose(judged.card);
      }
      const attempts = turn.attempts + 1;
      setTurn({ ...turn, attempts });
      // Hard to hear, or no connection: the picture they tapped counts once they've said something (FR-09, NFR-02).
      if ((heard.offline || attempts >= 2) && tapped && heard.voicedMs >= MIN_SPEECH_MS) {
        coins(guesser.id, COINS_PER_TURN);
        return choose(tapped);
      }
      return say(heard.offline || attempts >= 2 ? L.pickOne : L.again);
    }
  };

  const { mic, level, press, release } = useHoldToTalk(recognizer, (h) => void onHeard(h), () => void say('Segura e fala!'));
  const request = () => ({ locale: 'pt-PT' as const, expectedText: phase === 'guess' ? '' : round?.secret.clues[0].text ?? '', maxDurationMs: MAX_LISTEN_MS });
  const listen = () => void press(request());

  const simulate = async (transcript: string) => {
    (recognizer as StubRecognizer).willHear(transcript);
    const l = recognizer.listen(request());
    l.release();
    await onHeard(await l.result);
  };

  const next = () => {
    if (roundNo + 1 < guessGame.rounds) return startRound(roundNo + 1);
    setPhase('end');
    void say(fillGuess(L.end, { n: found }));
  };

  const again = () => {
    setFound(0);
    setEarned({});
    startRound(0);
  };

  const exit = () => {
    void stop();
    onExit();
  };

  const clueDone = phase === 'describe' && turn.done;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <BackButton onPress={exit} />
        <Text style={styles.title}>🤔 {guessGame.title}</Text>
        <View style={styles.team}>
          {pair.map((p) => (
            <Kid key={p.id} p={p} size={54} coins={earned[p.id]} active={(phase === 'describe' || phase === 'hand-describer') ? p.id === describer.id : (phase === 'guess' || phase === 'hand-guesser') ? p.id === guesser.id : false} />
          ))}
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.guiSide}>
          <View style={styles.bubble}>
            <Text style={styles.line}>{line}</Text>
          </View>
          <Lean on={mic === 'thinking'}>
            <Gui size={190} talking={talking} happy={phase === 'got' || phase === 'end' || clueDone} />
          </Lean>
        </View>

        <View style={styles.play}>
          {phase === 'intro' && (
            <View style={styles.center}>
              <View style={styles.row}>
                {pair.map((p) => (
                  <Kid key={p.id} p={p} size={120} showName />
                ))}
              </View>
              <BigButton label={L.ready} onPress={() => startRound(0)} accessibilityLabel="Ready" />
            </View>
          )}

          {(phase === 'hand-describer' || phase === 'hand-guesser') && (
            <View style={styles.center}>
              {/* Handing over: only the child whose turn it is should look now. */}
              <Kid p={phase === 'hand-describer' ? describer : guesser} size={150} showName />
              {phase === 'hand-describer' && tried.length ? (
                // Back for another clue: the guesser has seen the pictures, so no need to hide anything.
                <Text style={styles.handText}>{L.giveBack}</Text>
              ) : (
                <>
                  <Text style={styles.handText}>{fillGuess(phase === 'hand-describer' ? L.describerTurn : L.guesserTurn, names)}</Text>
                  <Text style={styles.handEn}>{fillGuess(phase === 'hand-describer' ? L.describerTurnEn : L.guesserTurnEn, names)}</Text>
                </>
              )}
              <BigButton label={L.ready} onPress={phase === 'hand-describer' ? toDescribe : toGuess} accessibilityLabel="Ready" />
            </View>
          )}

          {phase === 'describe' && round && (
            <View style={styles.describe}>
              <View style={styles.secret}>
                <Text style={styles.secretLabel}>{L.secret}</Text>
                <Text style={styles.secretEmoji}>{round.secret.emoji}</Text>
                <Text style={styles.secretName}>{round.secret.name}</Text>
              </View>
              <View style={styles.clues}>
                {round.secret.clues.map((c) => (
                  <Tap key={c.text} accessibilityRole="button" accessibilityLabel={`Hear: ${c.en}`} onPress={() => void say(c.text)} style={({ pressed }) => [styles.clue, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.clueText}>🔊 {c.text}</Text>
                    {describer.age === 8 ? <Text style={styles.clueEn}>{c.en}</Text> : null}
                  </Tap>
                ))}
              </View>
            </View>
          )}

          {phase === 'guess' && round && (
            <View style={styles.options}>
              {round.options.map((o) => {
                const out = tried.includes(o.id);
                return (
                  <Tap
                    key={o.id}
                    disabled={out}
                    accessibilityRole="button"
                    accessibilityLabel={out ? 'Already guessed' : `Hear its name`}
                    onPress={() => {
                      setTapped(o);
                      void say(capitalise(o.name));
                    }}
                    style={[styles.option, out && styles.optionOut, tapped?.id === o.id && styles.optionTapped]}
                  >
                    <Text style={styles.optionEmoji}>{o.emoji}</Text>
                  </Tap>
                );
              })}
            </View>
          )}

          {phase === 'got' && round && (
            <View style={styles.center}>
              <Text style={styles.gotEmoji}>{round.secret.emoji}</Text>
              <Text style={styles.gotText}>{round.secret.say}</Text>
              <View style={styles.row}>
                {pair.map((p) => (
                  <Kid key={p.id} p={p} size={80} coins={earned[p.id]} showName />
                ))}
              </View>
              <BigButton label={L.next} onPress={next} accessibilityLabel="Next" />
            </View>
          )}

          {phase === 'end' && (
            <View style={styles.center}>
              <Text style={styles.gotText}>{fillGuess(L.end, { n: found })}</Text>
              <Text style={styles.handEn}>{fillGuess(L.endEn, { n: found })}</Text>
              <View style={styles.row}>
                {pair.map((p) => (
                  <Kid key={p.id} p={p} size={100} coins={earned[p.id]} showName />
                ))}
              </View>
              <View style={styles.row}>
                <BigButton label={L.more} onPress={again} accessibilityLabel="Play again" />
                <BigButton label="🏠" variant="secondary" onPress={exit} accessibilityLabel="Home" />
              </View>
            </View>
          )}
        </View>
      </View>

      {(phase === 'describe' || phase === 'guess') && (
        <View style={styles.bottom}>
          <View style={styles.hint}>
            <Text style={styles.hintLabel}>{listener.name.toUpperCase()}</Text>
            <Text style={styles.hintText}>{phase === 'describe' ? L.describe : L.guess}</Text>
            {phase === 'guess' ? <Text style={styles.hintEn}>{L.tapHelpEn}</Text> : null}
          </View>
          {clueDone ? (
            <BigButton
              label={L.passOn}
              onPress={() => {
                setPhase('hand-guesser');
                void say(fillGuess(L.guesserTurn, names));
              }}
              accessibilityLabel="Pass the tablet"
            />
          ) : (
            <MicButton mic={mic} level={level} disabled={isStub} onPressIn={listen} onPressOut={release} />
          )}
        </View>
      )}

      {isStub && round && (phase === 'describe' || phase === 'guess') && !clueDone ? (
        <View style={styles.dev}>
          <Text style={styles.devLabel}>DEV · stub microphone</Text>
          {phase === 'describe' ? (
            <>
              <BigButton label="Give a clue" variant="secondary" onPress={() => void simulate(round.secret.clues[0].text)} />
              <BigButton label="Say its name" variant="secondary" onPress={() => void simulate(round.secret.say)} />
            </>
          ) : (
            <>
              <BigButton label="Guess right" variant="secondary" onPress={() => void simulate(round.secret.say)} />
              <BigButton label="Guess another" variant="secondary" onPress={() => void simulate(round.options.find((o) => o.id !== round.secret.id && !tried.includes(o.id))?.say ?? '')} />
            </>
          )}
          <BigButton label="Silence" variant="secondary" onPress={() => void simulate('')} />
          <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8F1E4' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 24, paddingTop: 16 },
  title: { flex: 1, fontSize: 30, fontWeight: '900', color: colors.ink },
  team: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  main: { flex: 1, flexDirection: 'row', gap: 24, padding: 20 },
  guiSide: { width: 300, alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  bubble: { padding: 18, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  line: { fontSize: 22, fontWeight: '800', color: colors.ink },
  play: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', gap: 16 },
  row: { flexDirection: 'row', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' },
  handText: { fontSize: 30, fontWeight: '900', color: colors.ink, textAlign: 'center', maxWidth: 620 },
  handEn: { fontSize: 18, fontWeight: '700', color: colors.inkSoft, textAlign: 'center' },
  describe: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  secret: { width: 240, padding: 16, alignItems: 'center', gap: 4, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.terracotta, borderRadius: radius.lg },
  secretLabel: { fontSize: 18, fontWeight: '900', color: colors.terracotta },
  secretEmoji: { fontSize: 120 },
  secretName: { fontSize: 26, fontWeight: '900', color: colors.ink },
  clues: { flex: 1, gap: 12 },
  clue: { minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: radius.md },
  clueText: { fontSize: 24, fontWeight: '800', color: colors.ink },
  clueEn: { fontSize: 15, fontWeight: '700', color: colors.inkSoft },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' },
  option: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  optionOut: { opacity: 0.25 },
  optionTapped: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  optionEmoji: { fontSize: 96 },
  gotEmoji: { fontSize: 130 },
  gotText: { fontSize: 40, fontWeight: '900', color: colors.teal, textAlign: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 20 },
  hint: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 14 },
  hintLabel: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  hintText: { fontSize: 30, fontWeight: '800', color: colors.ink },
  hintEn: { fontSize: 15, fontWeight: '700', color: colors.inkSoft },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF3CD', borderTopWidth: 2, borderColor: colors.ink },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
