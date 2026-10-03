import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { guiLines } from '../content';
import { sayAsGui, saySlowly, stop } from '../audio/voice';
import type { WordHelp } from '../engine/pronounce';
import type { Wear } from '../engine/shop';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { colors, radius } from '../ui/theme';

/**
 * "Truque!": help with a word the child keeps missing. The word in pieces, read the English way, lighting up as Gui
 * builds it up slowly from its end, and a tip that links its hardest sound to an English word they know.
 * Nothing here says they got it wrong: it's a trick for a tricky word.
 */
export function Truque({ help, wear, onDone }: { help: WordHelp; wear?: Wear; onDone: () => void }) {
  /** The first piece lit up, while Gui says the pieces from there to the end. */
  const [from, setFrom] = useState<number | null>(null);
  const [talking, setTalking] = useState(false);
  const run = useRef(0);

  const show = async (intro: boolean) => {
    const me = ++run.current;
    const alive = () => run.current === me;
    setTalking(true);
    if (intro) await sayAsGui(guiLines.truque.title);
    for (let i = 0; alive() && i < help.buildUp.length; i++) {
      setFrom(help.pt.length - 1 - i);
      await saySlowly(help.buildUp[i]);
    }
    if (alive()) {
      setFrom(null);
      setTalking(false);
    }
  };

  useEffect(() => {
    void show(true);
    return () => {
      run.current++;
      void stop();
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.backdrop}>
      <View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.row}>
          <Gui size={150} talking={talking} wear={wear} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.title}>{guiLines.truque.title} ✨</Text>
            <Text style={styles.word}>{help.word}</Text>
          </View>
        </View>
        <View style={styles.pieces} accessibilityLabel={`Say it like: ${help.en.join(' ')}`}>
          {help.en.map((piece, i) => {
            const lit = from !== null && i >= from;
            const stressed = /[A-Z]/.test(piece);
            return (
              <View key={i} style={[styles.piece, stressed && styles.stressed, lit && styles.lit]}>
                <Text style={[styles.pieceText, stressed && styles.pieceStressed]}>{piece}</Text>
              </View>
            );
          })}
        </View>
        {help.tip ? (
          <View style={styles.tip}>
            <Text style={styles.tipEmoji}>{help.tip.emoji}</Text>
            <Text style={styles.tipText}>{help.tip.text}</Text>
          </View>
        ) : null}
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" accessibilityLabel="Again, slowly" onPress={() => void show(false)} style={styles.slow}>
            <Text style={styles.slowText}>🐢</Text>
          </Pressable>
          <BigButton
            label={guiLines.truque.go}
            variant="blue"
            onPress={() => {
              run.current++;
              void stop();
              onDone();
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(30,42,68,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  panel: { width: 760, maxWidth: '94%', backgroundColor: colors.cream, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg, padding: 24, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  title: { fontSize: 26, fontWeight: '900', color: colors.terracotta },
  word: { fontSize: 52, fontWeight: '900', color: colors.blue },
  pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  piece: { minWidth: 72, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center' },
  stressed: { borderWidth: 5 },
  lit: { backgroundColor: colors.sun },
  pieceText: { fontSize: 30, fontWeight: '700', color: colors.ink },
  pieceStressed: { fontWeight: '900' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.blueTint, borderRadius: radius.md, padding: 14 },
  tipEmoji: { fontSize: 40 },
  tipText: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.ink },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  slow: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.ink, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  slowText: { fontSize: 34 },
});
