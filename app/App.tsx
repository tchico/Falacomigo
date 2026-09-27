import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUnit, units } from './src/content';
import type { ChildProfile, Mission } from './src/content/types';
import type { PhraseProgress } from './src/engine/ladder';
import { localDay, nextMission, nextScene } from './src/engine/episode';
import { COINS_PER_TURN, coinsForStars } from './src/engine/rewards';
import { StubRecognizer } from './src/speech/stub';
import { openStore } from './src/store/open';
import { initVoice } from './src/audio/voice';
import { toChildProfile, type Store, type StoredProfile } from './src/store/store';
import { ProfilePicker } from './src/screens/ProfilePicker';
import { SceneScreen, type TurnLog } from './src/screens/SceneScreen';
import { MissionScreen } from './src/screens/MissionScreen';
import { colors } from './src/ui/theme';

type Screen =
  | { name: 'loading' }
  | { name: 'pick' }
  | { name: 'scene'; unitId: string; sceneId: string }
  | { name: 'mission'; unitId: string; mission: Mission; rowId: number }
  | { name: 'done' };

export default function App() {
  const recognizer = useMemo(() => new StubRecognizer(), []);
  const [store, setStore] = useState<Store | null>(null);
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [stops, setStops] = useState<Record<string, string>>({});
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [coins, setCoins] = useState(0);
  const [progress, setProgress] = useState<Record<string, PhraseProgress>>({});

  const refreshProfiles = useCallback(async (s: Store) => {
    const ps = await s.listProfiles();
    const labels: Record<string, string> = {};
    for (const p of ps) {
      const next = nextScene(units, await s.scenesPlayed(p.id));
      labels[p.id] = `Paragem ${getUnit(next.unitId).unit}`;
    }
    setProfiles(ps);
    setStops(labels);
  }, []);

  useEffect(() => {
    void initVoice();
    openStore()
      .then(async (s) => {
        setStore(s);
        await refreshProfiles(s);
        setScreen({ name: 'pick' });
      })
      .catch((e) => console.error('Could not open the local store', e));
  }, [refreshProfiles]);

  const pick = async (p: StoredProfile) => {
    if (!store) return;
    const c = toChildProfile(p);
    const [prog, wallet, played] = await Promise.all([store.getProgress(c.id), store.getCoins(c.id), store.scenesPlayed(c.id)]);
    setChild(c);
    setProgress(prog);
    setCoins(wallet);
    const next = nextScene(units, played);
    setScreen({ name: 'scene', unitId: next.unitId, sceneId: next.sceneId });
  };

  const onTurn = (unitId: string, sceneId: string) => (t: TurnLog) => {
    if (!store || !child) return;
    setCoins((c) => c + COINS_PER_TURN);
    store
      .recordTurn({ childId: child.id, unitId, sceneId, beatId: t.beatId, phraseId: t.phraseId, startRung: t.startRung, outcome: t.outcome, day: localDay(), coins: COINS_PER_TURN })
      .then((updated) => setProgress((prev) => ({ ...prev, [updated.phraseId]: updated })))
      .catch((e) => console.error('Could not save the turn', e));
  };

  const onSceneFinished = async (unitId: string, sceneId: string) => {
    if (!store || !child) return;
    await store.finishScene(child.id, unitId, sceneId, localDay());
    const unit = getUnit(unitId);
    const given = await store.missionsGiven(child.id, unitId);
    const mission = nextMission(unit, given.map((m) => m.missionId));
    const row = await store.createMission(child.id, unitId, mission.id);
    setScreen({ name: 'mission', unitId, mission, rowId: row.id });
  };

  const backToStart = async () => {
    setChild(null);
    setScreen({ name: 'pick' });
    if (store) await refreshProfiles(store);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {child ? (
        <View style={styles.coins} accessibilityLabel={`${coins} coins`}>
          <Text style={styles.coinsText}>{coins} moedas</Text>
        </View>
      ) : null}

      {screen.name === 'loading' && (
        <View style={styles.done}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      )}

      {screen.name === 'pick' && <ProfilePicker profiles={profiles} details={stops} onPick={pick} onParent={() => {}} />}

      {screen.name === 'scene' && child && (
        <SceneScreen
          key={`${child.id}/${screen.unitId}/${screen.sceneId}`}
          unit={getUnit(screen.unitId)}
          sceneId={screen.sceneId}
          child={child}
          recognizer={recognizer}
          progress={progress}
          onTurn={onTurn(screen.unitId, screen.sceneId)}
          onFinished={() => void onSceneFinished(screen.unitId, screen.sceneId)}
        />
      )}

      {screen.name === 'mission' && child && (
        <MissionScreen
          mission={screen.mission}
          child={child}
          onDone={async (stars) => {
            if (store && stars > 0) {
              await store.approveMission(screen.rowId, stars, coinsForStars(stars));
              setCoins(await store.getCoins(child.id));
            }
            setScreen({ name: 'done' });
          }}
        />
      )}

      {screen.name === 'done' && (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Até amanhã!</Text>
          <Text style={styles.doneText}>{coins} moedas</Text>
          <Text style={styles.doneLink} onPress={() => void backToStart()}>
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
