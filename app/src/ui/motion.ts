// Shared bits for the gentle animations (NFR-09: calm, no flashing). Motion turns off when the device's
// "reduce motion" accessibility setting is on.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

/** The native animation driver isn't available on the web build. */
export const useNative = Platform.OS !== 'web';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduced(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** A slow, endless back-and-forth between 0 and 1, e.g. for breathing or bobbing. */
export function useLoop(periodMs: number, enabled = true): Animated.Value {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) {
      v.setValue(0);
      return;
    }
    const half = { duration: periodMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative };
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, ...half }), Animated.timing(v, { toValue: 0, ...half })]));
    loop.start();
    return () => loop.stop();
  }, [v, periodMs, enabled]);
  return v;
}
