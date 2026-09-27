import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChildProfile, Mission } from '../content/types';
import { fill } from '../engine/template';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { colors, radius, TOUCH } from '../ui/theme';

const COINS_PER_STAR = 20; // Dad's stars are worth the most (design doc §4)

/** FR-17, FR-18: the mission card, and Dad's stars behind a long-press gate. */
export function MissionScreen({ mission, child, onDone }: { mission: Mission; child: ChildProfile; onDone: (stars: number, coins: number) => void }) {
  const [stars, setStars] = useState(0);
  const age = String(child.age) as '6' | '8';

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Gui size={200} />
        <View style={styles.text}>
          <Text style={styles.label}>CARTA DO GUI PARA O PAI · DIA {mission.day}</Text>
          <Text style={styles.title}>{mission.card.text}</Text>
          <Text style={styles.en}>{mission.card.en}</Text>
          <View style={styles.say}>
            <Text style={styles.sayText}>{fill(mission.say[age], child)}</Text>
          </View>
          <View style={styles.buttons}>
            <BigButton label="Vou agora!" onPress={() => {}} />
            <BigButton label="Mais tarde" variant="secondary" onPress={() => onDone(0, 0)} />
          </View>
        </View>
      </View>

      <View style={styles.parent}>
        <Text style={styles.parentText}>Só para o pai: segura uma estrela</Text>
        {[1, 2, 3].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            delayLongPress={1000}
            onLongPress={() => {
              setStars(n);
              onDone(n, n * COINS_PER_STAR);
            }}
            style={styles.star}
          >
            <Text style={[styles.starText, n <= stars && { color: colors.sun }]}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', gap: 28 },
  card: { flexDirection: 'row', gap: 28, padding: 32, width: 960, backgroundColor: '#FFFDF7', borderWidth: 4, borderColor: colors.ink, borderRadius: 20, alignItems: 'center' },
  text: { flex: 1, gap: 12 },
  label: { fontSize: 15, fontWeight: '800', color: colors.inkSoft, letterSpacing: 1 },
  title: { fontSize: 44, fontWeight: '900', color: colors.ink },
  en: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  say: { padding: 18, borderRadius: radius.md, backgroundColor: colors.blueTint, borderWidth: 3, borderColor: colors.ink },
  sayText: { fontSize: 32, fontWeight: '800', color: colors.ink },
  buttons: { flexDirection: 'row', gap: 12 },
  parent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.blueDark, borderWidth: 3, borderColor: colors.white },
  parentText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  star: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 44, color: colors.white },
});
