import { StyleSheet, Text, View } from 'react-native';
import type { MicState } from '../speech/useHoldToTalk';
import { colors } from './theme';
import { Tap } from './Tap';
import { ThinkingDots } from './Thinking';

/**
 * The big orange hold-to-talk button, with a calm ring that grows with the child's voice (NFR-09). It sinks as soon as
 * it's touched and shows dots from the moment listening stops until the answer is back (NFR-12).
 */
export function MicButton({ mic, level, disabled, onPressIn, onPressOut }: { mic: MicState; level: number; disabled?: boolean; onPressIn: () => void; onPressOut: () => void }) {
  return (
    <View style={styles.wrap}>
      {mic === 'listening' ? <View style={[styles.ring, { transform: [{ scale: 1 + Math.min(0.35, level * 4) }] }]} /> : null}
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Hold to talk"
        accessibilityState={{ busy: mic !== 'idle', disabled }}
        disabled={disabled || mic === 'thinking'}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.mic, mic === 'listening' && { backgroundColor: colors.terracottaLight }, disabled && { opacity: 0.4 }]}
      >
        <Text style={styles.icon}>🎤</Text>
        {mic === 'thinking' ? (
          <View style={styles.dots}>
            <ThinkingDots color={colors.white} size={12} />
          </View>
        ) : (
          <Text style={styles.text}>{mic === 'listening' ? 'A ouvir…' : 'Fala!'}</Text>
        )}
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: colors.terracottaLight, opacity: 0.35 },
  mic: { width: 130, height: 130, borderRadius: 65, backgroundColor: colors.terracotta, borderWidth: 5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 34 },
  text: { color: colors.white, fontSize: 22, fontWeight: '900' },
  dots: { height: 30, justifyContent: 'center' },
});
