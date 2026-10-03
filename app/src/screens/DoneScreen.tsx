import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { guiLines } from '../content';
import { sayAsGui, stop } from '../audio/voice';
import type { Postcard as Card } from '../engine/album';
import type { Wear } from '../engine/shop';
import { BigButton } from '../ui/BigButton';
import { Gui } from '../ui/Gui';
import { Postcard } from '../ui/Postcard';
import { colors, radius } from '../ui/theme';

interface Props {
  coins: number;
  /** The session has run its time: Gui is sleepy and says goodbye, but one more is still allowed (FR-16). */
  sleepy: boolean;
  /** The postcard this episode just added to the album, if it's a new one (FR-21). */
  postcard?: { card: Card; stamp: string; newStop: boolean } | null;
  wear?: Wear;
  onMore: () => void;
  onAlbum: () => void;
  onShop: () => void;
  onHome: () => void;
}

/** The end of an episode: a new postcard, then either "one more?" or a sleepy goodbye. */
export function DoneScreen({ coins, sleepy, postcard, wear, onMore, onAlbum, onShop, onHome }: Props) {
  const l = guiLines;
  const [talking, setTalking] = useState(false);
  const title = sleepy ? l.session.bye : l.session.more;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setTalking(true);
      if (postcard) await sayAsGui(l.album.newPostcard);
      if (!cancelled && postcard?.newStop) await sayAsGui(l.album.newStop);
      if (!cancelled) await sayAsGui(sleepy ? l.session.sleepy : l.session.more);
      if (!cancelled) setTalking(false);
    })();
    return () => {
      cancelled = true;
      void stop();
    };
    // Once, when the episode ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <Gui size={220} sleepy={sleepy && !talking} talking={talking} wear={wear} />
        <View style={styles.bubble}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.en}>{sleepy ? l.session.sleepyEn : l.session.moreEn}</Text>
          <Text style={styles.coins}>🪙 {coins} moedas</Text>
        </View>
        {postcard ? (
          <View style={styles.postcard}>
            <Text style={styles.newPostcard}>{postcard.newStop ? l.album.newStop : l.album.newPostcard}</Text>
            <Postcard card={postcard.card} stamp={postcard.stamp} width={240} />
          </View>
        ) : null}
      </View>
      <View style={styles.buttons}>
        {/* No lock-out (FR-16): when Gui is sleepy, one more is still there, just not the big button. */}
        <BigButton label={l.session.moreButton} variant={sleepy ? 'secondary' : 'primary'} onPress={onMore} accessibilityLabel="One more adventure" />
        <BigButton label={l.album.button} variant="blue" onPress={onAlbum} accessibilityLabel="Postcard album" />
        <BigButton label="🛍️ Loja do Gui" variant="secondary" onPress={onShop} accessibilityLabel="Gui's shop" />
        <BigButton label="🏠" variant={sleepy ? 'primary' : 'secondary'} onPress={onHome} accessibilityLabel="Back to the start" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  bubble: { maxWidth: 420, padding: 24, gap: 6, backgroundColor: colors.white, borderWidth: 4, borderColor: colors.ink, borderRadius: radius.lg },
  title: { fontSize: 40, fontWeight: '900', color: colors.blue },
  en: { fontSize: 18, fontWeight: '700', color: colors.inkSoft },
  coins: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 6 },
  postcard: { alignItems: 'center', gap: 10 },
  newPostcard: { fontSize: 22, fontWeight: '900', color: colors.terracotta },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
});
