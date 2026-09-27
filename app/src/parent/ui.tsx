// Shared look for the parent zone: plain, calm panels in English, for Dad (design/mockups/06 and 07).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, TOUCH } from '../ui/theme';

export const pz = {
  bg: '#F4EFE4',
  panel: colors.white,
  line: '#E2D9C6',
  sidebar: colors.ink,
};

export function Panel({ title, right, children, style }: { title?: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SmallButton({ label, onPress, kind = 'blue', disabled, accessibilityLabel }: { label: string; onPress: () => void; kind?: 'blue' | 'red' | 'plain'; disabled?: boolean; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, styles[kind], disabled && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.btnText, kind === 'plain' && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  panel: { backgroundColor: pz.panel, borderRadius: radius.md, borderWidth: 2, borderColor: pz.line, padding: 20, gap: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  h1: { fontSize: 32, fontWeight: '900', color: colors.ink },
  sub: { fontSize: 15, fontWeight: '700', color: colors.inkSoft },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 14, color: colors.inkSoft },
  btn: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  blue: { backgroundColor: colors.blue },
  red: { backgroundColor: colors.terracotta },
  plain: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
