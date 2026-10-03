import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { sayAsGui, stop } from '../audio/voice';
import { guiLines } from '../content';
import type { AlbumStop } from '../engine/album';
import type { Wear } from '../engine/shop';
import { BigButton } from '../ui/BigButton';
import { JourneyMap } from '../ui/JourneyMap';
import { colors, radius } from '../ui/theme';

/**
 * Gui says hello before the episode, on the journey map: he flies the journey so far and lands where the child is now
 * (FR-21). After a break he just missed them: no streaks, nothing lost (FR-23).
 */
export function WelcomeScreen({ text, stopName, album, wear, onStart, onShop, onAlbum }: { text: string; stopName: string; album: AlbumStop[]; wear?: Wear; onStart: () => void; onShop: () => void; onAlbum: () => void }) {
  const { width, height } = useWindowDimensions();
  // As big as fits beside the greeting, keeping the map's own shape.
  const mapWidth = Math.max(280, Math.min(width * 0.5, ((height - 60) * 700) / 672));
  useEffect(() => {
    void sayAsGui(text);
    return () => void stop();
  }, [text]);

  return (
    <View style={styles.screen}>
      <JourneyMap album={album} width={mapWidth} wear={wear} />
      <View style={styles.side}>
        <View style={styles.bubble}>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.stop}>📍 {stopName}</Text>
        </View>
        <BigButton label="Vamos! ▶" onPress={onStart} accessibilityLabel="Start" />
        <View style={styles.row}>
          <BigButton label={guiLines.album.button} variant="blue" onPress={onAlbum} accessibilityLabel="Postcard album" />
          <BigButton label="🛍️ Loja do Gui" variant="secondary" onPress={onShop} accessibilityLabel="Gui's shop" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Room on the left for the back button.
  screen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24, paddingLeft: 104 },
  side: { flexShrink: 1, maxWidth: 480, gap: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bubble: { padding: 24, gap: 8, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  text: { fontSize: 40, fontWeight: '900', color: colors.ink },
  stop: { fontSize: 20, fontWeight: '800', color: colors.inkSoft },
});
