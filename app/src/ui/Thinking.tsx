// What a character does while the speech result is on its way (NFR-12): leans in to listen, with three dots
// pulsing slowly. It starts the moment the child stops talking, so the wait never looks like nothing happened.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from './theme';
import { useLoop, useNative, useReducedMotion } from './motion';

/** Leans whoever is inside towards the child while `on`. */
export function Lean({ on, children }: { on: boolean; children: ReactNode }) {
  const [lean] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  useEffect(() => {
    Animated.timing(lean, { toValue: on && !reduced ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: useNative }).start();
  }, [on, reduced, lean]);
  const style = {
    transform: [
      { translateY: lean.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
      { rotate: lean.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] }) },
    ],
  };
  return (
    <View>
      <Animated.View style={style}>{children}</Animated.View>
      {on ? (
        <View style={styles.dotsAt} accessibilityLabel="Thinking">
          <ThinkingDots />
        </View>
      ) : null}
    </View>
  );
}

/** Three dots that brighten in turn, slowly (NFR-09). Still dots when motion is reduced. */
export function ThinkingDots({ color = colors.ink, size = 14 }: { color?: string; size?: number }) {
  const reduced = useReducedMotion();
  const t = useLoop(1200, !reduced);
  return (
    <View style={[styles.dots, { gap: size * 0.6 }]}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: reduced ? 0.7 : t.interpolate({ inputRange: [0, 0.5, 1], outputRange: i === 1 ? [0.35, 1, 0.35] : i === 0 ? [1, 0.35, 0.6] : [0.35, 0.6, 1] }),
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsAt: { position: 'absolute', top: -6, right: -10, backgroundColor: colors.white, borderRadius: 999, borderWidth: 3, borderColor: colors.ink, paddingHorizontal: 12, paddingVertical: 9 },
  dots: { flexDirection: 'row', alignItems: 'center' },
});
