import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChildProfile } from '../content/types';
import { Gui } from '../ui/Gui';
import { colors, radius } from '../ui/theme';

const AVATAR_COLORS = [colors.sun, '#7CC4B8'];

/** FR-01, FR-02: each child picks their own avatar, no reading needed. */
export function ProfilePicker({ profiles, onPick }: { profiles: ChildProfile[]; onPick: (p: ChildProfile) => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Fala Comigo</Text>
      <Text style={styles.title}>Quem vai jogar?</Text>
      <Text style={styles.subtitle}>Who's playing?</Text>
      <View style={styles.row}>
        {profiles.map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${p.age}`}
            onPress={() => onPick(p)}
            style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: 4 }] }]}
          >
            <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
              <Text style={styles.initial}>{p.name.slice(0, 1)}</Text>
            </View>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.age}>{p.age} anos</Text>
          </Pressable>
        ))}
        <Gui size={200} happy />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: 8 },
  brand: { fontSize: 52, fontWeight: '900', color: colors.blue },
  title: { fontSize: 36, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 40, marginTop: 28 },
  card: {
    width: 220,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.ink,
    borderRadius: radius.lg,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 56, fontWeight: '900', color: colors.ink },
  name: { fontSize: 28, fontWeight: '800', color: colors.ink },
  age: { fontSize: 16, fontWeight: '800', color: colors.inkSoft },
});
