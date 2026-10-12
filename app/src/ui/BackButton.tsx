import { StyleSheet, Text } from 'react-native';
import { Tap } from './Tap';
import { colors, TOUCH } from './theme';

/**
 * Back to "Quem vai jogar?" from any game screen (as in the mockups). Nothing is lost by leaving:
 * every turn is already saved (NFR-08), and an unfinished scene simply starts again next time.
 */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel="Back to the start" onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.btn, pressed && { transform: [{ translateY: 2 }] }]}>
      <Text style={styles.icon}>‹</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  btn: { width: TOUCH + 4, height: TOUCH + 4, borderRadius: (TOUCH + 4) / 2, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 40, lineHeight: 44, fontWeight: '900', color: colors.ink, marginTop: -4, marginLeft: -3 },
});
