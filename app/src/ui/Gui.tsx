import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';
import { useLoop, useNative, useReducedMotion } from './motion';

interface Props {
  size?: number;
  /** Wings up, eyes smiling and a little hop: the child just got it. */
  happy?: boolean;
  /** Beak moves while he's speaking. */
  talking?: boolean;
  /** What he's wearing from his shop (FR-22), as pictures by slot. */
  wear?: { head?: string; eyes?: string; neck?: string };
}

/**
 * Gui the seagull, drawn with plain views so it needs no extra native modules. He breathes, blinks, chatters
 * while he talks and hops when the child gets it right. All slow and gentle (NFR-09).
 * Replace with the real illustration (SVG or Lottie) later.
 */
export function Gui({ size = 180, happy = false, talking = false, wear = {} }: Props) {
  const s = size / 180;
  const reduced = useReducedMotion();
  const breathe = useLoop(2600, !reduced);
  const chatter = useLoop(260, talking && !reduced);
  const [hop] = useState(() => new Animated.Value(0));
  const [blink] = useState(() => new Animated.Value(1));

  // A hop when he becomes happy.
  useEffect(() => {
    if (!happy || reduced) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
      Animated.timing(hop, { toValue: 0, duration: 380, easing: Easing.bounce, useNativeDriver: useNative }),
    ]).start();
  }, [happy, reduced, hop]);

  // A blink every few seconds.
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.1, duration: 70, useNativeDriver: useNative }),
          Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: useNative }),
        ]).start(next);
      }, 2800 + Math.random() * 2400);
    };
    next();
    return () => clearTimeout(timer);
  }, [reduced, blink]);

  const bodyMove = {
    transform: [
      { translateY: Animated.add(breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4 * s] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -22 * s] })) },
    ],
  };
  const beakOpen = chatter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '14deg'] });

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel="Gui the seagull">
      <Animated.View style={[StyleSheet.absoluteFill, bodyMove]}>
        <View style={[styles.body, { left: 20 * s, top: 70 * s, width: 120 * s, height: 95 * s, borderRadius: 60 * s, borderWidth: 4 * s }]} />
        <View style={[styles.wing, { left: 40 * s, top: happy ? 55 * s : 95 * s, width: 70 * s, height: 40 * s, borderRadius: 30 * s, borderWidth: 4 * s, transform: [{ rotate: happy ? '-35deg' : '-8deg' }] }]} />
        <View style={[styles.head, { left: 88 * s, top: 20 * s, width: 70 * s, height: 70 * s, borderRadius: 35 * s, borderWidth: 4 * s }]} />
        <View style={[styles.cheek, { left: 112 * s, top: 56 * s, width: 12 * s, height: 9 * s, borderRadius: 5 * s }]} />
        <View style={[styles.scarf, { left: 86 * s, top: 76 * s, width: 64 * s, height: 16 * s, borderRadius: 8 * s, borderWidth: 3 * s }]} />
        {happy ? (
          // Smiling eye: a little arch.
          <View style={[styles.happyEye, { left: 126 * s, top: 40 * s, width: 16 * s, height: 10 * s, borderTopLeftRadius: 8 * s, borderTopRightRadius: 8 * s, borderWidth: 3 * s }]} />
        ) : (
          <Animated.View style={[styles.eye, { left: 128 * s, top: 42 * s, width: 12 * s, height: 12 * s, borderRadius: 6 * s, transform: [{ scaleY: blink }] }]} />
        )}
        {/* Lower beak opens and closes while he talks; the upper beak stays put. */}
        <Animated.View style={[styles.beakLower, { left: 150 * s, top: 58 * s, borderTopWidth: 0, borderBottomWidth: 7 * s, borderLeftWidth: 22 * s, transform: [{ rotate: beakOpen }] }]} />
        <View style={[styles.beak, { left: 152 * s, top: 50 * s, borderTopWidth: 8 * s, borderBottomWidth: 6 * s, borderLeftWidth: 26 * s }]} />
        {/* Things from his shop sit on top, so they move with him. */}
        {wear.neck ? <Text style={[styles.wear, { left: 94 * s, top: 62 * s, fontSize: 40 * s }]}>{wear.neck}</Text> : null}
        {wear.eyes ? <Text style={[styles.wear, { left: 110 * s, top: 26 * s, fontSize: 34 * s }]}>{wear.eyes}</Text> : null}
        {wear.head ? <Text style={[styles.wear, { left: 94 * s, top: -24 * s, fontSize: 54 * s }]}>{wear.head}</Text> : null}
      </Animated.View>
      <View style={[styles.leg, { left: 62 * s, top: 160 * s, width: 6 * s, height: 18 * s }]} />
      <View style={[styles.leg, { left: 96 * s, top: 160 * s, width: 6 * s, height: 18 * s }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.ink },
  wing: { position: 'absolute', backgroundColor: '#B9C3D1', borderColor: colors.ink },
  head: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.ink },
  cheek: { position: 'absolute', backgroundColor: '#F4B9A8' },
  scarf: { position: 'absolute', backgroundColor: colors.blue, borderColor: colors.ink },
  eye: { position: 'absolute', backgroundColor: colors.ink },
  happyEye: { position: 'absolute', borderColor: colors.ink, borderBottomWidth: 0, backgroundColor: 'transparent' },
  beak: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.sun,
  },
  beakLower: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#E0A21F',
  },
  leg: { position: 'absolute', backgroundColor: '#E8833A', borderRadius: 3 },
  wear: { position: 'absolute' },
});
