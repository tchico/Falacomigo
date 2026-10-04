import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { guessGame, storyGame } from '../content';
import { sayAsGui, stop } from '../audio/voice';
import type { StoredProfile } from '../store/store';
import { BackButton } from '../ui/BackButton';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { Kid } from '../ui/Kid';
import { colors } from '../ui/theme';

export type TogetherGame = 'guess' | 'story';

/** "Juntos": the two children pick a game for two, describe and guess (FR-24) or a story together (FR-25). */
export function TogetherScreen({ pair, onChoose, onExit }: { pair: [StoredProfile, StoredProfile]; onChoose: (g: TogetherGame) => void; onExit: () => void }) {
  useEffect(() => {
    void sayAsGui(storyGame.lines.choose);
    return () => void stop();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <BackButton onPress={onExit} />
      </View>
      <Text style={styles.title}>{storyGame.lines.choose}</Text>
      <Text style={styles.subtitle}>{storyGame.lines.chooseEn}</Text>
      <View style={styles.row}>
        {pair.map((p) => (
          <Kid key={p.id} p={p} size={110} showName />
        ))}
        <Gui size={150} />
      </View>
      <View style={styles.row}>
        <BigButton label={`🤔 ${guessGame.title}`} onPress={() => onChoose('guess')} accessibilityLabel="Describe and guess" />
        <BigButton label={storyGame.lines.button} onPress={() => onChoose('story')} accessibilityLabel="Make up a story together" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8F1E4', alignItems: 'center', gap: 24 },
  top: { alignSelf: 'stretch', paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 40, fontWeight: '900', color: colors.ink },
  subtitle: { fontSize: 20, fontWeight: '700', color: colors.inkSoft, marginTop: -16 },
  row: { flexDirection: 'row', gap: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
});
