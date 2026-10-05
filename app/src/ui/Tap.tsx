// Every button a child can tap (NFR-12): it sinks the moment a finger lands, before whatever it starts (a voice, a
// picture, the next screen) has had time to load, so a tap never looks ignored.
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export const PRESSED: ViewStyle = { transform: [{ scale: 0.94 }], opacity: 0.85 };

/**
 * A Pressable that shows the press straight away. A style given as a function draws its own pressed look, the way
 * BigButton does; a plain style gets the standard one.
 */
export function Tap({ style, ...rest }: PressableProps) {
  return <Pressable {...rest} style={typeof style === 'function' ? style : ({ pressed }) => [style as StyleProp<ViewStyle>, pressed && PRESSED]} />;
}
