import { StyleSheet, Text, View } from 'react-native';
import type { StoredProfile } from '../store/store';
import { avatarFor } from './avatars';
import { colors } from './theme';

/** A child's animal in the games for two (FR-24, FR-25): ringed when it's their turn, with the coins they've won. */
export function Kid({ p, size, coins, active, showName }: { p: StoredProfile; size: number; coins?: number; active?: boolean; showName?: boolean }) {
  const a = avatarFor(p.avatar);
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: a.color }, active && styles.avatarActive]}>
        <Text style={{ fontSize: size * 0.55 }}>{a.emoji}</Text>
      </View>
      {showName ? <Text style={styles.kidName}>{p.name}</Text> : null}
      {coins ? <Text style={styles.kidCoins}>🪙 +{coins}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { borderColor: colors.terracottaLight, borderWidth: 6 },
  kidName: { fontSize: 20, fontWeight: '900', color: colors.ink },
  kidCoins: { fontSize: 16, fontWeight: '900', color: colors.ink },
});
