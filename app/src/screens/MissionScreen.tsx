import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChildProfile, Mission } from '../content/types';
import { fill } from '../engine/template';
import { coinsForStars } from '../engine/rewards';
import { clipKey, missionClipFile } from '../audio/clips';
import { play, sayAsGui, sourceFor, stop } from '../audio/voice';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { HoldButton } from '../ui/HoldButton';
import { colors, radius, TOUCH } from '../ui/theme';

interface Props {
  unitId: string;
  mission: Mission;
  child: ChildProfile;
  /** Dad's 1–3 stars, given behind the hold gate (FR-18). */
  onApproved: (stars: number) => void;
  /** The mission stays open, and Dad can give the stars later from the parent zone. */
  onLater: () => void;
}

/** How long Dad holds a star to approve. Long enough that a child tapping around won't do it by accident. */
export const STAR_HOLD_MS = 2000;

/** FR-17: the mission card from Gui to Dad, with the phrase in Dad's voice. */
export function MissionScreen({ unitId, mission, child, onApproved, onLater }: Props) {
  const [going, setGoing] = useState(false);
  const [stars, setStars] = useState(0);
  const age = String(child.age) as '6' | '8';
  const phrase = fill(mission.say[age], child);

  const playPhrase = () => play(sourceFor(clipKey(unitId, missionClipFile(mission, child)), phrase));

  useEffect(() => {
    void (async () => {
      await sayAsGui(`Missão! ${mission.card.text}`);
      await playPhrase();
    })();
    return () => void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);

  const approve = (n: number) => {
    setStars(n);
    void sayAsGui(n === 3 ? 'Três estrelas! Fantástico!' : 'Boa! Obrigado, pai!');
    setTimeout(() => onApproved(n), 1500);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.picture}>
          <View style={styles.missionBubble}>
            <Text style={styles.missionBubbleText}>{going ? 'Vai! Eu espero.' : 'Missão!'}</Text>
          </View>
          <Gui size={220} happy={going || stars > 0} />
        </View>
        <View style={styles.text}>
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.label}>CARTA DO GUI PARA O PAI</Text>
              <Text style={styles.title}>{fill(mission.card.text, child)}</Text>
            </View>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>DIA {mission.day}</Text>
            </View>
          </View>
          <Text style={styles.en}>Go and find Dad and say:</Text>
          <View style={styles.say}>
            <Pressable accessibilityRole="button" accessibilityLabel="Play" onPress={() => void playPhrase()} style={styles.play}>
              <Text style={styles.playText}>▶</Text>
            </Pressable>
            <Text style={styles.sayText}>{phrase}</Text>
          </View>
          {stars === 0 ? (
            <View style={styles.buttons}>
              <BigButton
                label="Vou agora!"
                onPress={() => {
                  setGoing(true);
                  void sayAsGui('Vai! Eu espero aqui.');
                }}
              />
              <BigButton label="Mais tarde" variant="secondary" onPress={onLater} />
            </View>
          ) : (
            <Text style={styles.earned}>
              {'★'.repeat(stars)} +{coinsForStars(stars)} moedas
            </Text>
          )}
        </View>
      </View>

      <View style={styles.parent}>
        <Text style={styles.parentText}>🔒 Só para o pai — segura uma estrela para aprovar</Text>
        {[1, 2, 3].map((n) => (
          <HoldButton key={n} holdMs={STAR_HOLD_MS} onHeld={() => approve(n)} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} style={styles.star}>
            <Text style={[styles.starText, n <= stars && { color: colors.sun }]}>★</Text>
          </HoldButton>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 },
  card: { flexDirection: 'row', gap: 28, padding: 28, width: '100%', maxWidth: 1000, backgroundColor: '#FFFDF7', borderWidth: 4, borderColor: colors.ink, borderRadius: 20 },
  picture: { width: 300, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12, backgroundColor: colors.sky, borderWidth: 3, borderColor: colors.ink, borderRadius: radius.md, overflow: 'hidden' },
  missionBubble: { position: 'absolute', top: 16, left: 16, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  missionBubbleText: { fontSize: 20, fontWeight: '900', color: colors.ink },
  text: { flex: 1, gap: 14 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  label: { fontSize: 15, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  title: { fontSize: 40, fontWeight: '900', color: colors.ink },
  stamp: { borderWidth: 3, borderStyle: 'dashed', borderColor: colors.terracotta, borderRadius: 8, padding: 10, backgroundColor: '#FFF1E6' },
  stampText: { fontSize: 14, fontWeight: '900', color: colors.terracotta },
  en: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  say: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: radius.md, backgroundColor: colors.blueTint, borderWidth: 3, borderColor: colors.ink },
  play: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 28, color: colors.white },
  sayText: { flex: 1, fontSize: 30, fontWeight: '800', color: colors.ink },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  earned: { fontSize: 30, fontWeight: '900', color: colors.terracotta, marginTop: 'auto' },
  parent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.blueDark, borderWidth: 3, borderColor: colors.white },
  parentText: { color: colors.white, fontSize: 17, fontWeight: '800', marginRight: 8 },
  star: { width: TOUCH + 8, height: TOUCH + 8, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 46, color: colors.white },
});
