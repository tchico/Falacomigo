import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUnit } from './src/content';
import type { ChildProfile } from './src/content/types';
import { ageWord } from './src/engine/template';
import { newProgress, record, type PhraseProgress } from './src/engine/ladder';
import { StubRecognizer } from './src/speech/stub';
import { ProfilePicker } from './src/screens/ProfilePicker';
import { SceneScreen, type TurnLog } from './src/screens/SceneScreen';
import { MissionScreen } from './src/screens/MissionScreen';
import { colors } from './src/ui/theme';

// Placeholder profiles until the parent zone can edit them (FR-01, FR-28).
const PROFILES: ChildProfile[] = [
  { id: 'child1', name: 'Ana', age: 8, ageWord: ageWord(8), sibling: 'irmão' },
  { id: 'child2', name: 'Tomás', age: 6, ageWord: ageWord(6), sibling: 'irmã' },
];

type Screen = { name: 'pick' } | { name: 'scene'; sceneId: string } | { name: 'mission'; missionIndex: number } | { name: 'done' };

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const unit = useMemo(() => getUnit('unit-01'), []);
  const recognizer = useMemo(() => new StubRecognizer(), []);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'pick' });
  const [coins, setCoins] = useState(0);
  // In memory for now; FR-13 / NFR-08 will persist this with expo-sqlite.
  const [progress, setProgress] = useState<Record<string, PhraseProgress>>({});

  const onSceneFinished = (log: TurnLog[]) => {
    setProgress((prev) => {
      const next = { ...prev };
      for (const t of log) {
        const phrase = unit.phrases.find((p) => p.id === t.phraseId)!;
        const current = next[t.phraseId] ?? newProgress(phrase.id, phrase.startRung);
        next[t.phraseId] = record(current, t.success ? 'success' : t.outcome === 'nearly' ? 'nearly' : 'failure', today());
      }
      return next;
    });
    setScreen({ name: 'mission', missionIndex: 0 });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {child ? (
        <View style={styles.coins} accessibilityLabel={`${coins} coins`}>
          <Text style={styles.coinsText}>{coins} moedas</Text>
        </View>
      ) : null}

      {screen.name === 'pick' && (
        <ProfilePicker
          profiles={PROFILES}
          onPick={(p) => {
            setChild(p);
            setScreen({ name: 'scene', sceneId: unit.scenes[0].id });
          }}
        />
      )}

      {screen.name === 'scene' && child && (
        <SceneScreen
          unit={unit}
          sceneId={screen.sceneId}
          child={child}
          recognizer={recognizer}
          onCoins={(n) => setCoins((c) => c + n)}
          onFinished={onSceneFinished}
        />
      )}

      {screen.name === 'mission' && child && (
        <MissionScreen
          mission={unit.missions[screen.missionIndex]}
          child={child}
          onDone={(_stars, earned) => {
            setCoins((c) => c + earned);
            setScreen({ name: 'done' });
          }}
        />
      )}

      {screen.name === 'done' && (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Até amanhã!</Text>
          <Text style={styles.doneText}>{Object.keys(progress).length} phrases practised · {coins} moedas</Text>
          <Text style={styles.doneLink} onPress={() => { setChild(null); setScreen({ name: 'pick' }); }}>
            Voltar ao início
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  coins: { position: 'absolute', right: 24, top: 20, zIndex: 10, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 6 },
  coinsText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  doneTitle: { fontSize: 56, fontWeight: '900', color: colors.blue },
  doneText: { fontSize: 22, fontWeight: '700', color: colors.ink },
  doneLink: { fontSize: 22, fontWeight: '800', color: colors.terracotta, padding: 16 },
});
