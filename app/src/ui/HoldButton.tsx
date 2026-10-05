import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Tap } from './Tap';
import { colors } from './theme';

interface Props {
  /** How long it has to be held. */
  holdMs: number;
  onHeld: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * The parental gate (FR-18, design doc §5): an action that only happens after a steady hold, with a bar that fills
 * while it's held. A tap or a short press does nothing, so a child tapping around can't approve their own mission.
 */
export function HoldButton({ holdMs, onHeld, accessibilityLabel, style, children }: Props) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);

  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };

  useEffect(() => cancel, []);

  const start = () => {
    cancel();
    started.current = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        cancel();
        onHeld();
      }
    }, 50);
  };

  return (
    <Tap accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint="Press and hold" onPressIn={start} onPressOut={cancel} style={style}>
      {children}
      {progress > 0 ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      ) : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', left: 6, right: 6, bottom: 4, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.sun },
});
