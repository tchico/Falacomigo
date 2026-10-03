import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Character as CharacterInfo } from '../content/types';
import { colors } from './theme';
import { useLoop, useReducedMotion } from './motion';

/** A local character (e.g. Zé the cook): breathes gently, and bounces a little while talking. */
export function Character({ info, talking = false }: { info: CharacterInfo; talking?: boolean }) {
  const reduced = useReducedMotion();
  const breathe = useLoop(2800, !reduced);
  const chatter = useLoop(300, talking && !reduced);
  const move = {
    transform: [
      { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
      { scale: chatter.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
    ],
  };
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.face, { backgroundColor: info.color ?? colors.white }, move]}>
        <Text style={styles.emoji}>{info.emoji}</Text>
      </Animated.View>
      <Text style={styles.name}>{info.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 240, alignItems: 'center', gap: 8 },
  face: { width: 190, height: 190, borderRadius: 95, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 110 },
  name: { fontSize: 24, fontWeight: '900', color: colors.ink, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 2, overflow: 'hidden' },
});
