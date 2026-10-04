// A postcard for the album (FR-21): a little picture of the scene's place, its title and a stamp from the stop.
// Drawn with plain views like the scenery, until there are illustrations.
import { StyleSheet, Text, View } from 'react-native';
import type { Postcard as Card } from '../engine/album';
import { paletteFor, placeFor, type Place } from './Scenery';
import { colors } from './theme';

/** The main thing in the picture, from the scene's setting. */
function pictureOf(p: Place): string {
  if (p.props.has('trampoline')) return '🤸';
  if (p.props.has('photo')) return '🖼️';
  if (p.props.has('dining')) return '🍽️';
  if (p.props.has('castle')) return '🏰';
  if (p.props.has('ball')) return '⚽';
  if (p.kind === 'beach') return '🍦';
  if (p.props.has('river')) return '⛵';
  if (p.props.has('street')) return '🗺️';
  if (p.kind === 'porto') return '🌉';
  if (p.kind === 'kitchen') return '🍳';
  if (p.kind === 'ferry') return '⛴️';
  return '🌳';
}

export function Postcard({ card, stamp, width = 220 }: { card: Card; stamp: string; width?: number }) {
  const h = width * 0.68;
  if (!card.got) {
    return (
      <View style={[styles.card, styles.empty, { width, height: h }]} accessibilityLabel="A postcard still to find">
        <Text style={[styles.question, { fontSize: width * 0.22 }]}>?</Text>
      </View>
    );
  }
  const place = placeFor(card.setting);
  const pal = paletteFor(place);
  return (
    <View style={[styles.card, { width, height: h, transform: [{ rotate: `${(card.sceneId.length % 3) - 1}deg` }] }]} accessibilityLabel={`Postcard: ${card.titleEn ?? card.title}`}>
      <View style={[styles.picture, { backgroundColor: pal.sky }]}>
        {place.evening ? <View style={[styles.moon, { width: width * 0.08, height: width * 0.08, borderRadius: width * 0.04 }]} /> : null}
        <View style={[styles.ground, { backgroundColor: pal.ground, borderTopColor: pal.groundEdge }]} />
        <Text style={{ fontSize: width * 0.2 }}>{pictureOf(place)}</Text>
      </View>
      <View style={[styles.stamp, { width: width * 0.2, height: width * 0.24 }]}>
        <Text style={{ fontSize: width * 0.1 }}>{stamp}</Text>
      </View>
      <Text style={[styles.title, { fontSize: Math.max(14, width * 0.085) }]} numberOfLines={1}>
        {card.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 12, padding: 8, gap: 6, overflow: 'hidden' },
  empty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  question: { fontWeight: '900', color: colors.inkSoft },
  picture: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4, overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%', borderTopWidth: 3 },
  moon: { position: 'absolute', left: '12%', top: '12%', backgroundColor: '#F6F1D5' },
  stamp: { position: 'absolute', right: 10, top: 10, backgroundColor: colors.cream, borderWidth: 2, borderColor: colors.terracotta, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }] },
  title: { fontWeight: '900', color: colors.ink, textAlign: 'center' },
});
