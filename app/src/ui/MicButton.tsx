import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MicState } from '../speech/useHoldToTalk';
import { colors } from './theme';

/** The big orange hold-to-talk button, with a calm ring that grows with the child's voice (NFR-09). */
export function MicButton({ mic, level, disabled, onPressIn, onPressOut }: { mic: MicState; level: number; disabled?: boolean; onPressIn: () => void; onPressOut: () => void }) {
  return (
    <View style={styles.wrap}>
      {mic === 'listening' ? <View style={[styles.ring, { transform: [{ scale: 1 + Math.min(0.35, level * 4) }] }]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold to talk"
        accessibilityState={{ busy: mic !== 'idle', disabled }}
        disabled={disabled || mic === 'thinking'}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.mic, mic === 'listening' && { backgroundColor: colors.terracottaLight }, disabled && { opacity: 0.4 }]}
      >
        <Text style={styles.icon}>🎤</Text>
        <Text style={styles.text}>{mic === 'listening' ? 'A ouvir…' : mic === 'thinking' ? '…' : 'Fala!'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: colors.terracottaLight, opacity: 0.35 },
  mic: { width: 130, height: 130, borderRadius: 65, backgroundColor: colors.terracotta, borderWidth: 5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 34 },
  text: { color: colors.white, fontSize: 22, fontWeight: '900' },
});
