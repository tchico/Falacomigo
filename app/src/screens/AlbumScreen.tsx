import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tap } from '../ui/Tap';
import { guiLines } from '../content';
import { sayAsGui } from '../audio/voice';
import { focusStop, postcardCount, type AlbumStop } from '../engine/album';
import { BackButton } from '../ui/BackButton';
import { Postcard } from '../ui/Postcard';
import { colors, radius } from '../ui/theme';

/**
 * The postcard album and the journey map (FR-21): the stops from the garden to Lisbon, and the postcards from
 * each one. A stop's postcards all found opens the next stop. Tapping a stop shows its postcards.
 */
export function AlbumScreen({ album, onExit }: { album: AlbumStop[]; onExit: () => void }) {
  const [selected, setSelected] = useState(() => focusStop(album).stop.id);
  const stop = album.find((s) => s.stop.id === selected) ?? album[0];
  const count = postcardCount(album);

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <BackButton onPress={onExit} />
        <Text style={styles.title}>{guiLines.album.title}</Text>
        <View style={styles.count} accessibilityLabel={`${count.got} of ${count.total} postcards`}>
          <Text style={styles.countText}>
            ✉️ {count.got} / {count.total} postais
          </Text>
        </View>
      </View>

      {/* The journey, left to right: done stops ticked, the current one ringed, later ones waiting. */}
      <View style={styles.map}>
        <View style={styles.road} />
        {album.map((s) => (
          <Tap
            key={s.stop.id}
            accessibilityRole="button"
            accessibilityLabel={`${s.stop.nameEn ?? s.stop.name}: ${s.state}`}
            onPress={() => {
              setSelected(s.stop.id);
              void sayAsGui(s.stop.name);
            }}
            style={styles.stopWrap}
          >
            <View style={[styles.pin, styles[s.state], s.stop.id === selected && styles.selected]}>
              <Text style={styles.pinEmoji}>{s.state === 'soon' || s.state === 'locked' ? '🔒' : s.stop.emoji}</Text>
              {s.state === 'done' ? (
                <View style={styles.tick}>
                  <Text style={styles.tickText}>✓</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.stopName, s.state === 'soon' && { color: colors.inkSoft }]} numberOfLines={2}>
              {s.number}. {s.stop.name}
            </Text>
          </Tap>
        ))}
      </View>

      <View style={styles.page}>
        <Text style={styles.pageTitle}>
          {stop.stop.emoji} {stop.stop.name}
        </Text>
        {stop.state === 'soon' ? (
          <Text style={styles.soonText}>{guiLines.album.soon}…</Text>
        ) : (
          <ScrollView horizontal contentContainerStyle={styles.cards}>
            {stop.postcards.map((p) => (
              <Postcard key={p.sceneId} card={p} stamp={stop.stop.emoji} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 20 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingRight: 200 },
  title: { flex: 1, fontSize: 36, fontWeight: '900', color: colors.blue },
  count: { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 6 },
  countText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  map: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#BFDDF0', borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 12 },
  road: { position: 'absolute', left: 50, right: 50, top: 52, borderTopWidth: 4, borderColor: colors.ink, borderStyle: 'dashed' },
  stopWrap: { alignItems: 'center', gap: 6, width: 100 },
  pin: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.teal },
  current: { backgroundColor: colors.sun },
  locked: { backgroundColor: colors.white },
  soon: { backgroundColor: colors.blueTint, borderColor: colors.inkSoft },
  selected: { transform: [{ scale: 1.15 }], borderColor: colors.terracottaLight },
  pinEmoji: { fontSize: 30 },
  tick: { position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tickText: { fontSize: 14, fontWeight: '900', color: colors.teal },
  stopName: { fontSize: 15, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  page: { flex: 1, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 20, gap: 12 },
  pageTitle: { fontSize: 30, fontWeight: '900', color: colors.ink },
  cards: { gap: 20, padding: 6 },
  soonText: { fontSize: 24, fontWeight: '800', color: colors.inkSoft },
});
