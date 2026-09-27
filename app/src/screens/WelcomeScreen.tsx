import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sayAsGui, stop } from '../audio/voice';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { colors, radius } from '../ui/theme';

/** Gui says hello before the episode. After a break he just missed them: no streaks, nothing lost (FR-23). */
export function WelcomeScreen({ text, stopName, onStart }: { text: string; stopName: string; onStart: () => void }) {
  useEffect(() => {
    void sayAsGui(text);
    return () => void stop();
  }, [text]);

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <Gui size={260} happy />
        <View style={styles.bubble}>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.stop}>📍 {stopName}</Text>
        </View>
      </View>
      <BigButton label="Vamos! ▶" onPress={onStart} accessibilityLabel="Start" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', gap: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  bubble: { maxWidth: 520, padding: 24, gap: 8, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  text: { fontSize: 44, fontWeight: '900', color: colors.ink },
  stop: { fontSize: 20, fontWeight: '800', color: colors.inkSoft },
});
