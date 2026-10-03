// The journey map (FR-21): from the kids' garden in Ireland, over the sea and down Portugal to Lisbon. When a child
// comes back, Gui flies the journey so far, stop by stop, and lands where they are now. Plain views
// over a map with the real coastlines, slow and calm (NFR-09), and still when "reduce motion" is on.
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { hereIndex, type AlbumStop } from '../engine/album';
import { Gui } from './Gui';
import { trail } from './journeyPath';
import { useNative, useReducedMotion } from './motion';
import type { Wear } from '../engine/shop';
import { colors } from './theme';

const SEA = '#BFDDF0';
const MAP = require('../../assets/journey-map.png');
/** How long Gui takes to fly from one stop to the next. */
const LEG_MS = 1100;

export function JourneyMap({ album, width, wear }: { album: AlbumStop[]; width: number; wear?: Wear }) {
  const height = (width * 672) / 700;
  const here = hereIndex(album);
  const pts = album.map((s) => ({ x: s.stop.x * width, y: s.stop.y * height }));
  const dots = useMemo(() => trail(album.map((s) => ({ x: s.stop.x, y: s.stop.y }))), [album]);
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [arrived, setArrived] = useState(here === 0);

  useEffect(() => {
    if (here === 0) return;
    if (reduced) {
      progress.setValue(here);
      setArrived(true);
      return;
    }
    progress.setValue(0);
    setArrived(false);
    const fly = Animated.sequence([
      Animated.delay(500),
      Animated.timing(progress, { toValue: here, duration: here * LEG_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative }),
    ]);
    fly.start(({ finished }) => finished && setArrived(true));
    return () => fly.stop();
  }, [here, reduced, progress]);

  // Gui follows the route through each stop on the way.
  const range = pts.slice(0, here + 1).map((_, i) => i);
  const guiSize = Math.round(width * 0.11);
  // Gui stands on top of the stop's circle.
  const standOn = width * 0.045;
  const at = (axis: 'x' | 'y', offset: number) =>
    here === 0 ? pts[0][axis] + offset : progress.interpolate({ inputRange: range, outputRange: range.map((i) => pts[i][axis] + offset) });

  return (
    <View style={[styles.map, { width, height }]} accessibilityRole="image" accessibilityLabel={`Journey map: Gui is at stop ${here + 1}, ${album[here]?.stop.nameEn ?? ''}`}>
      {/* The real coastlines, drawn by tools/build-map.mjs. */}
      <Image source={MAP} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="stretch" />
      <Text style={[styles.country, { left: width * 0.04, top: height * 0.03, fontSize: width * 0.034 }]}>Irlanda</Text>
      <Text style={[styles.country, { left: width * 0.74, top: height * 0.36, fontSize: width * 0.03, color: colors.inkSoft }]}>França</Text>
      <Text style={[styles.country, { left: width * 0.56, top: height * 0.78, fontSize: width * 0.034, color: '#8A6A3A' }]}>Espanha</Text>
      <Text style={[styles.country, { left: width * 0.015, top: height * 0.72, fontSize: width * 0.03, transform: [{ rotate: '-80deg' }] }]}>Portugal</Text>

      {/* The route. Dots light up behind Gui as he flies. */}
      {dots.map((d, i) => {
        const travelled = d.at <= here;
        const opacity = !travelled ? 0.25 : here === 0 ? 1 : progress.interpolate({ inputRange: [Math.max(0, d.at - 0.01), d.at], outputRange: [0.25, 1], extrapolate: 'clamp' });
        return <Animated.View key={i} style={[styles.dot, { left: d.x * width - 4, top: d.y * height - 4, opacity }]} />;
      })}

      {album.map((s, i) => {
        const r = width * (i === here ? 0.045 : 0.032);
        const visited = i < here || s.state === 'done';
        return (
          <View key={s.stop.id} style={{ position: 'absolute', left: pts[i].x - r, top: pts[i].y - r }}>
            {i === here && arrived ? <View style={[styles.ring, { width: r * 2 + 16, height: r * 2 + 16, borderRadius: r + 8, left: -8, top: -8 }]} /> : null}
            <View
              style={[
                styles.stop,
                { width: r * 2, height: r * 2, borderRadius: r },
                visited && { backgroundColor: colors.teal },
                i === here && { backgroundColor: colors.sun },
                s.state === 'soon' && { borderColor: colors.inkSoft },
              ]}
            >
              <Text style={{ fontSize: r * 0.9, fontWeight: '900', color: colors.inkSoft }}>{visited || i === here ? s.stop.emoji : s.number}</Text>
            </View>
          </View>
        );
      })}

      {/* Names of the places reached so far, and of Lisbon, where the journey ends. */}
      {album.map((s, i) =>
        i <= here || i === album.length - 1 ? (
          <Text
            key={s.stop.id}
            style={[
              styles.name,
              // Stops on the west coast have their name out at sea, clear of the stops inland.
              s.stop.x < 0.2 ? { right: width - pts[i].x + width * 0.05, textAlign: 'right' } : { left: pts[i].x + width * 0.05 },
              { top: pts[i].y - width * 0.02, fontSize: width * 0.027 },
              i > here && { color: colors.inkSoft },
            ]}
          >
            {s.stop.name}
          </Text>
        ) : null,
      )}

      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: at('x', -guiSize * 0.5) }, { translateY: at('y', -guiSize - standOn + 4) }] }}>
        <Gui size={guiSize} happy={arrived && here > 0} wear={wear} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: SEA, borderWidth: 4, borderColor: colors.ink, borderRadius: 28, overflow: 'hidden' },
  country: { position: 'absolute', fontWeight: '900', color: colors.ink },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink },
  stop: { borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 4, borderColor: colors.terracottaLight, borderStyle: 'dashed' },
  name: { position: 'absolute', fontWeight: '900', color: colors.ink },
});
