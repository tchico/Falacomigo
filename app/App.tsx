import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUnit, units } from './src/content';
import type { ChildProfile, Mission } from './src/content/types';
import type { PhraseProgress } from './src/engine/ladder';
import { greeting, localDay, nextMission, nextScene } from './src/engine/episode';
import { COINS_PER_TURN, coinsForStars } from './src/engine/rewards';
import { createRecognizer } from './src/speech';
import { openStore } from './src/store/open';
import { initVoice, sayAsGui } from './src/audio/voice';
import { toChildProfile, type Store, type StoredProfile } from './src/store/store';
import { ProfilePicker } from './src/screens/ProfilePicker';
import { ParentZone } from './src/parent/ParentZone';
import { SceneScreen, type TurnLog } from './src/screens/SceneScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { BigButton } from './src/ui/BigButton';
import { MissionScreen } from './src/screens/MissionScreen';
import { colors } from './src/ui/theme';

type Screen =
  | { name: 'loading' }
  | { name: 'pick' }
  | { name: 'parent' }
  | { name: 'welcome'; text: string; unitId: string; sceneId: string }
  | { name: 'scene'; unitId: string; sceneId: string }
  | { name: 'mission'; unitId: string; mission: Mission; rowId: number }
  | { name: 'done' };

export default function App() {
  const recognizer = useMemo(() => createRecognizer(), []);
  const [store, setStore] = useState<Store | null>(null);
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [stops, setStops] = useState<Record<string, string>>({});
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [coins, setCoins] = useState(0);
  const [progress, setProgress] = useState<Record<string, PhraseProgress>>({});
  /** Phrases said in this episode, for picking the mission (FR-17). */
  const practised = useRef<string[]>([]);

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
    const [prog, wallet, played, last] = await Promise.all([store.getProgress(c.id), store.getCoins(c.id), store.scenesPlayed(c.id), store.lastPlayedDay(c.id)]);
    setChild(c);
    setProgress(prog);
    setCoins(wallet);
    const next = nextScene(units, played);
    practised.current = [];
    setScreen({ name: 'welcome', text: greeting(c.name, last, localDay()), unitId: next.unitId, sceneId: next.sceneId });
  };

  const onTurn = (unitId: string, sceneId: string) => (t: TurnLog) => {
    if (!store || !child) return;
    setCoins((c) => c + COINS_PER_TURN);
    practised.current.push(t.phraseId);
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
    const mission = nextMission(unit, given.map((m) => m.missionId), child.age, practised.current);
    const row = await store.createMission(child.id, unitId, mission.id);
    setScreen({ name: 'mission', unitId, mission, rowId: row.id });
  };

  useEffect(() => {
    if (screen.name === 'done') void sayAsGui('Até amanhã!');
  }, [screen.name]);

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

      {screen.name === 'pick' && <ProfilePicker profiles={profiles} details={stops} onPick={pick} onParent={() => setScreen({ name: 'parent' })} />}

      {screen.name === 'parent' && store && (
        <ParentZone store={store} profiles={profiles} onProfilesChanged={() => void refreshProfiles(store)} onExit={() => void backToStart()} />
      )}

      {screen.name === 'welcome' && (
        <WelcomeScreen
          text={screen.text}
          stopName={getUnit(screen.unitId).stop.name}
          onStart={() => setScreen({ name: 'scene', unitId: screen.unitId, sceneId: screen.sceneId })}
        />
      )}

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
          unitId={screen.unitId}
          mission={screen.mission}
          child={child}
          onApproved={async (stars) => {
            if (store) {
              await store.approveMission(screen.rowId, stars, coinsForStars(stars));
              setCoins(await store.getCoins(child.id));
            }
            setScreen({ name: 'done' });
          }}
          onLater={() => {
            setScreen({ name: 'done' });
          }}
        />
      )}

      {screen.name === 'done' && (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Até amanhã!</Text>
          <Text style={styles.doneText}>{coins} moedas</Text>
          <BigButton label="🏠 Voltar ao início" variant="secondary" onPress={() => void backToStart()} />
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
});
