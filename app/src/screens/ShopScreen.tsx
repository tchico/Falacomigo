import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Tap } from '../ui/Tap';
import { Lean } from '../ui/Thinking';
import { shop } from '../content';
import type { ChildProfile, ShopItem } from '../content/types';
import { matchAttempt } from '../engine/match';
import { applyAttempt, applyOfflineAttempt, newTurn, type TurnState } from '../engine/turn';
import { coinsShort, wearFor } from '../engine/shop';
import { sayAsGui, stop } from '../audio/voice';
import type { Store } from '../store/store';
import { MAX_LISTEN_MS } from '../speech/pcm';
import { StubRecognizer } from '../speech/stub';
import type { RecognitionResult, SpeechRecognizer } from '../speech/types';
import { useHoldToTalk } from '../speech/useHoldToTalk';
import { BackButton } from '../ui/BackButton';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { MicButton } from '../ui/MicButton';
import { colors, radius, TOUCH } from '../ui/theme';

interface Props {
  store: Store;
  child: ChildProfile;
  coins: number;
  outfit: Record<string, string>;
  recognizer: SpeechRecognizer;
  onCoins: (coins: number) => void;
  onOutfit: (outfit: Record<string, string>) => void;
  onExit: () => void;
}

/**
 * FR-22: Gui's shop. Coins earned by speaking buy things for Gui to wear, and buying means saying it in
 * Portuguese ("Quero o boné!"). The same generous rules as the game apply: a near miss counts, and after two
 * tries the phrase is played and any real attempt counts. Prices are fixed and shown; nothing is random (NFR-09).
 */
export function ShopScreen({ store, child, coins, outfit, recognizer, onCoins, onOutfit, onExit }: Props) {
  const [owned, setOwned] = useState<string[]>([]);
  const [picked, setPicked] = useState<ShopItem | null>(null);
  const [turn, setTurn] = useState<TurnState>(newTurn());
  const [line, setLine] = useState('Olá! Esta é a minha loja! O que queres comprar?');
  const [talking, setTalking] = useState(false);
  const [happy, setHappy] = useState(false);
  const [devText, setDevText] = useState('');
  const isStub = recognizer instanceof StubRecognizer;

  useEffect(() => {
    void store.ownedItems(child.id).then(setOwned);
  }, [store, child.id]);

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
    void say('Olá! Esta é a minha loja! O que queres comprar?');
    return () => void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wear = async (item: ShopItem) => {
    const next = { ...outfit };
    if (next[item.slot] === item.id) delete next[item.slot];
    else next[item.slot] = item.id;
    await store.setOutfit(child.id, item.slot, next[item.slot] ?? null);
    onOutfit(next);
    setHappy(true);
    void say(next[item.slot] ? 'Fica-me bem?' : 'Pronto, tirei!');
  };

  const pick = (item: ShopItem) => {
    setHappy(false);
    if (owned.includes(item.id)) return void wear(item);
    setPicked(item);
    setTurn(newTurn());
    const short = coinsShort(coins, item);
    // Never a "no": just how to get there.
    if (short > 0) void say(`${capitalise(item.name)} custa ${item.price} moedas. Fala mais comigo e ganhas mais moedas!`);
    else void say(`${capitalise(item.name)}? Diz: ${item.say}`);
  };

  const buy = async (item: ShopItem) => {
    if (!(await store.buyItem(child.id, item.id, item.price))) return;
    setOwned((o) => [...o, item.id]);
    onCoins(await store.getCoins(child.id));
    const next = { ...outfit, [item.slot]: item.id };
    await store.setOutfit(child.id, item.slot, item.id);
    onOutfit(next);
    setPicked(null);
    setHappy(true);
    void say(`Aqui está ${item.name}! Obrigado! Fica-me bem?`);
  };

  const onHeard = async (heard: RecognitionResult | null) => {
    if (!picked) return;
    if (!heard) return setLine('🎤 O microfone não está a funcionar. (The microphone isn\'t working: check the permission.)');
    const next = heard.offline
      ? applyOfflineAttempt(turn, heard.voicedMs)
      : applyAttempt(turn, { result: matchAttempt(heard.transcript, picked, child.age), durationMs: heard.voicedMs });
    setTurn(next);
    if (next.done) return buy(picked);
    if (next.playModel) return say(`Ouve: ${picked.say}`);
    return say('Hum? Outra vez!');
  };

  const { mic, level, press, release } = useHoldToTalk(recognizer, (h) => void onHeard(h), () => void say('Segura e fala!'));
  const listen = () => picked && void press({ locale: 'pt-PT', expectedText: picked.say, maxDurationMs: MAX_LISTEN_MS });

  const simulate = async (transcript: string) => {
    if (!picked) return;
    (recognizer as StubRecognizer).willHear(transcript);
    const l = recognizer.listen({ locale: 'pt-PT', expectedText: picked.say, maxDurationMs: MAX_LISTEN_MS });
    l.release();
    await onHeard(await l.result);
  };

  const canBuy = picked && coinsShort(coins, picked) === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <BackButton
          onPress={() => {
            void stop();
            onExit();
          }}
        />
        <Text style={styles.title}>🛍️ {shop.title}</Text>
      </View>

      <View style={styles.main}>
        <View style={styles.guiSide}>
          <View style={styles.bubble}>
            <Text style={styles.line}>{line}</Text>
          </View>
          <Lean on={mic === 'thinking'}>
            <Gui size={230} happy={happy} talking={talking} wear={wearFor(outfit, shop.items)} />
          </Lean>
        </View>

        <ScrollView contentContainerStyle={styles.shelf}>
          {shop.items.map((item) => {
            const has = owned.includes(item.id);
            const wearing = outfit[item.slot] === item.id;
            return (
              <Tap
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.en}, ${has ? (wearing ? 'wearing' : 'owned') : `${item.price} coins`}`}
                onPress={() => pick(item)}
                style={[styles.card, picked?.id === item.id && styles.cardPicked, wearing && styles.cardWearing]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.name}>{item.name}</Text>
                {has ? (
                  <Text style={styles.state}>{wearing ? '✓ vestido' : 'é teu!'}</Text>
                ) : (
                  <Text style={[styles.price, coinsShort(coins, item) > 0 && { opacity: 0.5 }]}>🪙 {item.price}</Text>
                )}
              </Tap>
            );
          })}
        </ScrollView>
      </View>

      {picked && canBuy ? (
        <View style={styles.bottom}>
          <View style={styles.hint}>
            <Text style={styles.hintLabel}>DIZ ASSIM</Text>
            <Text style={styles.hintText}>{picked.say}</Text>
          </View>
          <MicButton mic={mic} level={level} disabled={isStub} onPressIn={listen} onPressOut={release} />
        </View>
      ) : null}

      {isStub && picked && canBuy ? (
        <View style={styles.dev}>
          <Text style={styles.devLabel}>DEV · stub microphone</Text>
          <BigButton label="Say it right" variant="secondary" onPress={() => void simulate(picked.say)} />
          <BigButton label="Silence" variant="secondary" onPress={() => void simulate('')} />
          <TextInput value={devText} onChangeText={setDevText} placeholder="or type what was said" style={styles.devInput} onSubmitEditing={() => void simulate(devText)} />
        </View>
      ) : null}
    </View>
  );
}

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBEAD0' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 24, paddingRight: 220, paddingTop: 20 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink },
  main: { flex: 1, flexDirection: 'row', gap: 24, padding: 24 },
  guiSide: { width: 360, alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  bubble: { padding: 18, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  line: { fontSize: 24, fontWeight: '800', color: colors.ink },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignContent: 'flex-start' },
  card: { width: 160, minHeight: TOUCH * 2.6, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.md },
  cardPicked: { borderColor: colors.terracotta, backgroundColor: '#FFF1E6' },
  cardWearing: { borderColor: colors.teal },
  emoji: { fontSize: 56 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  price: { fontSize: 18, fontWeight: '900', color: colors.ink },
  state: { fontSize: 16, fontWeight: '900', color: colors.teal },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 20 },
  hint: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  hintLabel: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  hintText: { fontSize: 34, fontWeight: '800', color: colors.ink },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF3CD', borderTopWidth: 2, borderColor: colors.ink },
  devLabel: { fontSize: 12, fontWeight: '800', color: colors.ink },
  devInput: { flex: 1, minHeight: 48, borderWidth: 2, borderColor: colors.ink, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.white },
});
