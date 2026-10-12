import { StyleSheet, Text, type PressableProps } from 'react-native';
import { Tap } from './Tap';
import { colors, radius, TOUCH } from './theme';

type Variant = 'primary' | 'secondary' | 'blue';

export function BigButton({ label, variant = 'primary', ...rest }: PressableProps & { label: string; variant?: Variant }) {
  return (
    <Tap
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}
      {...rest}
    >
      <Text style={[styles.label, variant === 'secondary' && { color: colors.ink }]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH,
    paddingHorizontal: 28,
    borderRadius: radius.md,
    borderWidth: 4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.terracotta },
  secondary: { backgroundColor: colors.white },
  blue: { backgroundColor: colors.blue },
  pressed: { transform: [{ translateY: 3 }] },
  label: { color: colors.white, fontSize: 26, fontWeight: '800' },
});
