import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

/**
 * Gui the seagull, drawn with plain views so the skeleton needs no extra native modules.
 * Replace with the real illustration (SVG or Lottie) later.
 */
export function Gui({ size = 180, happy = false }: { size?: number; happy?: boolean }) {
  const s = size / 180;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel="Gui the seagull">
      <View style={[styles.body, { left: 20 * s, top: 70 * s, width: 120 * s, height: 95 * s, borderRadius: 60 * s, borderWidth: 4 * s }]} />
      <View style={[styles.wing, { left: 40 * s, top: happy ? 55 * s : 95 * s, width: 70 * s, height: 40 * s, borderRadius: 30 * s, borderWidth: 4 * s, transform: [{ rotate: happy ? '-35deg' : '-8deg' }] }]} />
      <View style={[styles.head, { left: 88 * s, top: 20 * s, width: 70 * s, height: 70 * s, borderRadius: 35 * s, borderWidth: 4 * s }]} />
      <View style={[styles.scarf, { left: 86 * s, top: 76 * s, width: 64 * s, height: 16 * s, borderRadius: 8 * s, borderWidth: 3 * s }]} />
      <View style={[styles.eye, { left: 128 * s, top: 42 * s, width: 12 * s, height: 12 * s, borderRadius: 6 * s }]} />
      <View style={[styles.beak, { left: 152 * s, top: 52 * s, borderTopWidth: 9 * s, borderBottomWidth: 9 * s, borderLeftWidth: 26 * s }]} />
      <View style={[styles.leg, { left: 62 * s, top: 160 * s, width: 6 * s, height: 18 * s }]} />
      <View style={[styles.leg, { left: 96 * s, top: 160 * s, width: 6 * s, height: 18 * s }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.ink },
  wing: { position: 'absolute', backgroundColor: '#B9C3D1', borderColor: colors.ink },
  head: { position: 'absolute', backgroundColor: colors.white, borderColor: colors.ink },
  scarf: { position: 'absolute', backgroundColor: colors.blue, borderColor: colors.ink },
  eye: { position: 'absolute', backgroundColor: colors.ink },
  beak: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.sun,
  },
  leg: { position: 'absolute', backgroundColor: '#E8833A', borderRadius: 3 },
});
