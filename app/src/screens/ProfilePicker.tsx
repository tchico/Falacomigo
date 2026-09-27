import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StoredProfile } from '../store/store';
import { avatarFor } from '../ui/avatars';
import { Gui } from '../ui/Gui';
import { colors, radius, TOUCH } from '../ui/theme';

interface Props {
  profiles: StoredProfile[];
  /** Small line under each name, e.g. "Paragem 1". */
  details?: Record<string, string>;
  onPick: (p: StoredProfile) => void;
  onParent: () => void;
}

/** FR-01, FR-02: each child taps their own animal, one tap and no reading needed. */
export function ProfilePicker({ profiles, details = {}, onPick, onParent }: Props) {
  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Fala Comigo</Text>
      <Text style={styles.title}>Quem vai jogar?</Text>
      <Text style={styles.subtitle}>Who's playing?</Text>
      <View style={styles.row}>
        {profiles.map((p) => {
          const avatar = avatarFor(p.avatar);
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.age}`}
              onPress={() => onPick(p)}
              style={({ pressed }) => [styles.card, pressed && { transform: [{ translateY: 4 }] }]}
            >
              <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <Text style={styles.emoji}>{avatar.emoji}</Text>
              </View>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.age}>
                {p.age} anos{details[p.id] ? ` · ${details[p.id]}` : ''}
              </Text>
            </Pressable>
          );
        })}
        <Gui size={200} happy />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Parent zone" onPress={onParent} style={styles.parent}>
        <Text style={styles.parentText}>🔒 Pai</Text>
      </Pressable>
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
  emoji: { fontSize: 64 },
  name: { fontSize: 28, fontWeight: '800', color: colors.ink },
  age: { fontSize: 16, fontWeight: '800', color: colors.inkSoft },
  parent: {
    position: 'absolute',
    right: 32,
    bottom: 28,
    minHeight: TOUCH,
    minWidth: 110,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentText: { fontSize: 20, fontWeight: '800', color: colors.ink },
});
