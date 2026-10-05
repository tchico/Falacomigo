import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tap } from '../ui/Tap';
import { sayAsGui } from '../audio/voice';
import { guessGame } from '../content';
import type { StoredProfile } from '../store/store';
import { avatarFor } from '../ui/avatars';
import { Gui } from '../ui/Gui';
import { HoldButton } from '../ui/HoldButton';
import { colors, radius, TOUCH } from '../ui/theme';

interface Props {
  profiles: StoredProfile[];
  /** Small line under each name, e.g. "Paragem 1". */
  details?: Record<string, string>;
  onPick: (p: StoredProfile) => void;
  onParent: () => void;
  /** Two children playing together (FR-24). */
  onPair?: (pair: [StoredProfile, StoredProfile]) => void;
}

export const PARENT_HOLD_MS = 3000;

/** FR-01, FR-02: each child taps their own animal, one tap and no reading needed. */
export function ProfilePicker({ profiles, details = {}, onPick, onParent, onPair }: Props) {
  // Spoken, so a child who can't read yet knows what to do (NFR-03).
  useEffect(() => void sayAsGui('Olá! Anda cá! Quem vai jogar?'), []);
  /** Picking two children for "Juntos" (FR-24), when there are more than two. */
  const [pairing, setPairing] = useState<string[] | null>(null);

  const together = () => {
    if (!onPair) return;
    if (profiles.length === 2) return onPair(older(profiles[0], profiles[1]));
    setPairing([]);
    void sayAsGui(guessGame.lines.pick);
  };

  const tap = (p: StoredProfile) => {
    if (!pairing) return onPick(p);
    const next = pairing.includes(p.id) ? pairing.filter((id) => id !== p.id) : [...pairing, p.id];
    if (next.length === 2 && onPair) {
      const [a, b] = next.map((id) => profiles.find((q) => q.id === id)!);
      setPairing(null);
      return onPair(older(a, b));
    }
    setPairing(next);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>Fala Comigo</Text>
      <Text style={styles.title}>{pairing ? guessGame.lines.pick : 'Quem vai jogar?'}</Text>
      <Text style={styles.subtitle}>{pairing ? guessGame.lines.pickEn : "Who's playing?"}</Text>
      <View style={styles.row}>
        {profiles.map((p) => {
          const avatar = avatarFor(p.avatar);
          return (
            <Tap
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.age}`}
              onPress={() => tap(p)}
              style={({ pressed }) => [styles.card, pairing?.includes(p.id) && styles.cardPicked, pressed && { transform: [{ translateY: 4 }] }]}
            >
              <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <Text style={styles.emoji}>{avatar.emoji}</Text>
              </View>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.age}>
                {p.age} anos{details[p.id] ? ` · ${details[p.id]}` : ''}
              </Text>
            </Tap>
          );
        })}
        <View style={styles.gui}>
          <View style={styles.guiBubble}>
            <Text style={styles.guiBubbleText}>Olá! Anda cá!</Text>
          </View>
          <Gui size={200} happy />
        </View>
      </View>
      {onPair && profiles.length >= 2 ? (
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Play together"
          onPress={pairing ? () => setPairing(null) : together}
          style={({ pressed }) => [styles.together, pairing && styles.togetherOn, pressed && { transform: [{ translateY: 4 }] }]}
        >
          <Text style={styles.togetherText}>{guessGame.lines.button}</Text>
        </Tap>
      ) : null}
      {/* The parental gate (design doc §5): hold for 3 seconds. */}
      <HoldButton holdMs={PARENT_HOLD_MS} onHeld={onParent} accessibilityLabel="Parent zone" style={styles.parent}>
        <Text style={styles.parentText}>🔒 Pai</Text>
      </HoldButton>
    </View>
  );
}

/** The older child gives the first clues; the younger one guesses first (design doc §4). */
const older = (a: StoredProfile, b: StoredProfile): [StoredProfile, StoredProfile] => (b.age > a.age ? [b, a] : [a, b]);

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
  cardPicked: { borderColor: colors.terracottaLight, backgroundColor: '#FFF1E6' },
  together: { marginTop: 24, minHeight: TOUCH, paddingHorizontal: 28, borderRadius: radius.pill, borderWidth: 4, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  togetherOn: { backgroundColor: colors.blueTint },
  togetherText: { fontSize: 24, fontWeight: '900', color: colors.ink },
  gui: { alignItems: 'center', gap: 4 },
  guiBubble: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  guiBubbleText: { fontSize: 20, fontWeight: '900', color: colors.ink },
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
