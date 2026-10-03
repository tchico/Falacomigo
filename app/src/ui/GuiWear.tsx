// Things from Gui's shop (FR-22), drawn as part of Gui: flat colours and the same dark outline, side-on like him,
// in his 180-unit grid (scaled by `s`). Gui.tsx places each piece in his layers so they move with him.
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from './theme';

const RED = '#D93B30';
const PINK = '#E0457B';
const PINK_DARK = '#B8325F';
const PETAL = '#F7A8C4';
const SHINE = '#8FA6C8';

/** An absolutely placed piece at (left, top) with size (w, h), all in Gui's units. */
function piece(s: number, left: number, top: number, w: number, h: number, style: ViewStyle = {}): ViewStyle {
  return { position: 'absolute', left: left * s, top: top * s, width: w * s, height: h * s, ...style };
}

/** A group that can be tilted as one, around its own centre. */
function Group({ s, left, top, w, h, tilt, children }: { s: number; left: number; top: number; w: number; h: number; tilt: string; children: ReactNode }) {
  return <View style={piece(s, left, top, w, h, { transform: [{ rotate: tilt }] })}>{children}</View>;
}

/** What goes on his head: drawn last, over everything. */
export function HeadWear({ id, s }: { id?: string; s: number }) {
  const line = (w: number) => ({ borderWidth: w * s, borderColor: colors.ink });
  switch (id) {
    case 'cap':
      return (
        <>
          {/* The peak points the same way as his beak. */}
          <View style={piece(s, 144, 32, 38, 12, { backgroundColor: colors.blueDark, borderTopRightRadius: 10 * s, borderBottomRightRadius: 6 * s, transform: [{ rotate: '12deg' }], ...line(3) })} />
          <View style={piece(s, 90, 10, 66, 32, { backgroundColor: colors.blue, borderTopLeftRadius: 33 * s, borderTopRightRadius: 33 * s, borderBottomLeftRadius: 4 * s, borderBottomRightRadius: 4 * s, transform: [{ rotate: '4deg' }], ...line(4) })} />
          <View style={piece(s, 119, 8, 7, 7, { backgroundColor: colors.ink, borderRadius: 4 * s })} />
        </>
      );
    case 'top-hat':
      return (
        <Group s={s} left={95} top={-18} w={56} h={47} tilt="8deg">
          <View style={piece(s, 10, 0, 36, 40, { backgroundColor: colors.ink, borderRadius: 3 * s })} />
          <View style={piece(s, 10, 26, 36, 7, { backgroundColor: colors.terracotta })} />
          <View style={piece(s, 0, 38, 56, 9, { backgroundColor: colors.ink, borderRadius: 5 * s })} />
        </Group>
      );
    case 'crown':
      return (
        <Group s={s} left={103} top={-4} w={40} h={28} tilt="6deg">
          {/* Three points (diamonds), half hidden behind the band. */}
          {[
            [0, 5],
            [13, 0],
            [26, 5],
          ].map(([x, y]) => (
            <View key={x} style={piece(s, x, y, 14, 14, { backgroundColor: colors.sun, transform: [{ rotate: '45deg' }], ...line(3) })} />
          ))}
          <View style={piece(s, 0, 12, 40, 16, { backgroundColor: colors.sun, borderRadius: 3 * s, ...line(3) })} />
          <View style={piece(s, 7, 18, 5, 5, { backgroundColor: colors.blue, borderRadius: 3 * s })} />
          <View style={piece(s, 17, 17, 6, 6, { backgroundColor: colors.terracotta, borderRadius: 3 * s })} />
          <View style={piece(s, 28, 18, 5, 5, { backgroundColor: colors.blue, borderRadius: 3 * s })} />
        </Group>
      );
    case 'flower':
      // Tucked on the side of his head, behind the eye.
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i * 2 * Math.PI) / 5;
            return <View key={i} style={piece(s, 97.5 + 9 * Math.cos(a), 20.5 + 9 * Math.sin(a), 13, 13, { backgroundColor: PETAL, borderRadius: 7 * s, ...line(2) })} />;
          })}
          <View style={piece(s, 99.5, 22.5, 9, 9, { backgroundColor: colors.sun, borderRadius: 5 * s, ...line(2) })} />
        </>
      );
    default:
      return null;
  }
}

/** Over his eye: one lens, side-on, with the arm running back across his head. */
export function EyeWear({ id, s }: { id?: string; s: number }) {
  if (id !== 'sunglasses') return null;
  return (
    <>
      <View style={piece(s, 97, 43, 28, 3, { backgroundColor: colors.ink, borderRadius: 2 * s, transform: [{ rotate: '4deg' }] })} />
      <View style={piece(s, 122, 39, 26, 17, { backgroundColor: colors.ink, borderRadius: 7 * s })} />
      <View style={piece(s, 128, 43, 7, 3, { backgroundColor: SHINE, borderRadius: 2 * s })} />
    </>
  );
}

/** His own scarf: blue, red with white stripes, or gone when he wears the bow tie. Drawn over his head. */
export function Scarf({ id, s }: { id?: string; s: number }) {
  if (id === 'bow') return <BowTie s={s} />;
  const red = id === 'scarf';
  return (
    <>
      <View style={piece(s, 86, 76, 64, 16, { backgroundColor: red ? RED : colors.blue, borderRadius: 8 * s, borderWidth: 3 * s, borderColor: colors.ink })} />
      {red ? (
        <>
          <View style={piece(s, 104, 79, 5, 10, { backgroundColor: colors.white })} />
          <View style={piece(s, 122, 79, 5, 10, { backgroundColor: colors.white })} />
        </>
      ) : null}
    </>
  );
}

/** The red scarf's loose end, hanging over his back. Drawn before his head so the head sits on top. */
export function ScarfTail({ id, s }: { id?: string; s: number }) {
  if (id !== 'scarf') return null;
  return (
    <Group s={s} left={85} top={85} w={14} h={36} tilt="14deg">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: RED, borderRadius: 5 * s, borderWidth: 3 * s, borderColor: colors.ink }]} />
      <View style={piece(s, 3, 12, 8, 4, { backgroundColor: colors.white })} />
      <View style={piece(s, 3, 22, 8, 4, { backgroundColor: colors.white })} />
    </Group>
  );
}

/** A bow tie at his throat: two outlined triangles and a knot. */
function BowTie({ s }: { s: number }) {
  // A triangle from borders, pointing at the knot from the left (dir 1) or the right (dir -1).
  const wing = (left: number, top: number, w: number, h: number, color: string, dir: 1 | -1): ViewStyle => ({
    position: 'absolute',
    left: left * s,
    top: top * s,
    width: 0,
    height: 0,
    borderTopWidth: (h / 2) * s,
    borderBottomWidth: (h / 2) * s,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    ...(dir === 1 ? { borderLeftWidth: w * s, borderLeftColor: color } : { borderRightWidth: w * s, borderRightColor: color }),
  });
  return (
    <>
      <View style={wing(128, 72, 18, 24, colors.ink, 1)} />
      <View style={wing(131.5, 77, 11, 14, PINK, 1)} />
      <View style={wing(146, 72, 18, 24, colors.ink, -1)} />
      <View style={wing(149.5, 77, 11, 14, PINK, -1)} />
      <View style={piece(s, 140.5, 78.5, 11, 11, { backgroundColor: PINK_DARK, borderRadius: 6 * s, borderWidth: 2.5 * s, borderColor: colors.ink })} />
    </>
  );
}
