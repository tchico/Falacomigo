// A "where is it?" picture for Unit 4: the thing drawn under, on, inside or behind the place, so the 6-year-old can
// answer from the picture alone (NFR-03).
import { StyleSheet, Text, View } from 'react-native';
import type { Where } from './pictures';

export function WherePicture({ thing, where, place, size = 120 }: { thing: string; where: Where; place: string; size?: number }) {
  const big = size * 0.55;
  const small = size * 0.3;
  const placeView = <Text key="place" style={{ fontSize: big }}>{place}</Text>;
  // Drawn after the place, a thing sits in front of it; drawn before, it's partly hidden behind it.
  const thingAt = (style: object) => (
    <Text key="thing" style={[styles.thing, { fontSize: small }, style]}>
      {thing}
    </Text>
  );
  const parts =
    where === 'under' ? [placeView, thingAt({ bottom: size * 0.02 })]
    : where === 'on' ? [placeView, thingAt({ top: size * 0.02 })]
    : where === 'in' ? [thingAt({ top: size * 0.14 }), placeView]
    : [thingAt({ top: size * 0.1, left: size * 0.58 }), placeView];
  return (
    <View style={[styles.box, { width: size, height: size }, where === 'under' && { paddingBottom: size * 0.2 }, where === 'on' && { paddingTop: size * 0.22 }]}>
      {parts}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  thing: { position: 'absolute' },
});
