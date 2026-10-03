import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sayAsGui, stop } from '../audio/voice';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { Scenery } from '../ui/Scenery';
import { guiLines } from '../content';
import type { Wear } from '../engine/shop';
import { colors, radius } from '../ui/theme';

/** Gui says hello before the episode. After a break he just missed them: no streaks, nothing lost (FR-23). */
export function WelcomeScreen({ text, stopName, setting, wear, onStart, onShop, onAlbum }: { text: string; stopName: string; setting?: string; wear?: Wear; onStart: () => void; onShop: () => void; onAlbum: () => void }) {
  const [talking, setTalking] = useState(false);
  useEffect(() => {
    setTalking(true);
    void sayAsGui(text).finally(() => setTalking(false));
    return () => void stop();
  }, [text]);

  return (
    <View style={styles.screen}>
      <Scenery setting={setting} />
      <View style={styles.row}>
        <Gui size={260} talking={talking} wear={wear} />
        <View style={styles.bubble}>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.stop}>📍 {stopName}</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <BigButton label="Vamos! ▶" onPress={onStart} accessibilityLabel="Start" />
        <BigButton label={guiLines.album.button} variant="blue" onPress={onAlbum} accessibilityLabel="Postcard album" />
        <BigButton label="🛍️ Loja do Gui" variant="secondary" onPress={onShop} accessibilityLabel="Gui's shop" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  bubble: { maxWidth: 520, padding: 24, gap: 8, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  text: { fontSize: 44, fontWeight: '900', color: colors.ink },
  buttons: { flexDirection: 'row', gap: 16 },
  stop: { fontSize: 20, fontWeight: '800', color: colors.inkSoft },
});
