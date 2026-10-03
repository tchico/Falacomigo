import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getUnit, guiLines, journey, units } from './src/content';
import type { ChildProfile, Mission } from './src/content/types';
import type { PhraseProgress } from './src/engine/ladder';
import { greeting, localDay, nextMission, nextScene } from './src/engine/episode';
import { buildAlbum, type AlbumStop, type Postcard } from './src/engine/album';
import { isSleepy } from './src/engine/session';
import { buildWarmup } from './src/engine/warmup';
import { defaultSettings, readSettings, settingsKey, type ChildSettings } from './src/settings/childSettings';
import type { PlayableBeat } from './src/engine/scene';
import { COINS_PER_TURN, coinsForStars } from './src/engine/rewards';
import { createRecognizer, createSmartReplies } from './src/speech';
import { openStore } from './src/store/open';
import { initVoice, stop as stopVoice } from './src/audio/voice';
import { initRecordings } from './src/audio/recordings';
import { SMART_REPLIES, toChildProfile, type Store, type StoredProfile } from './src/store/store';
import { ProfilePicker } from './src/screens/ProfilePicker';
import { ParentZone } from './src/parent/ParentZone';
import { SceneScreen, type TurnLog } from './src/screens/SceneScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { shop } from './src/content';
import { wearFor } from './src/engine/shop';
import { BigButton } from './src/ui/BigButton';
import { BackButton } from './src/ui/BackButton';
import { MissionScreen } from './src/screens/MissionScreen';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { DoneScreen } from './src/screens/DoneScreen';
import { colors } from './src/ui/theme';

type Screen =
  | { name: 'loading' }
  | { name: 'store-error' }
  | { name: 'pick' }
  | { name: 'parent' }
  | { name: 'welcome'; text: string; unitId: string; sceneId: string; album: AlbumStop[] }
  | { name: 'warmup'; unitId: string; sceneId: string; beats: PlayableBeat[] }
  | { name: 'scene'; unitId: string; sceneId: string }
  | { name: 'mission'; unitId: string; mission: Mission; rowId: number }
  | { name: 'done'; sleepy: boolean }
  | { name: 'album'; album: AlbumStop[]; back: Screen }
  | { name: 'shop'; back: Screen };

/** The postcard an episode just added (FR-21), shown when it ends. */
type NewPostcard = { card: Postcard; stamp: string; newStop: boolean };

export default function App() {
  const recognizer = useMemo(() => createRecognizer(), []);
  const smartReplies = useMemo(() => createSmartReplies(), []);
  /** Dad's switch for Gui's smart replies, in the parent zone. Off by default. */
  const [smartOn, setSmartOn] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [stops, setStops] = useState<Record<string, string>>({});
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [coins, setCoins] = useState(0);
  const [progress, setProgress] = useState<Record<string, PhraseProgress>>({});
  /** What Gui is wearing for this child, from his shop (FR-22). */
  const [outfit, setOutfit] = useState<Record<string, string>>({});
  const wear = wearFor(outfit, shop.items);
  /** Phrases said in this episode, for picking the mission (FR-17). */
  const practised = useRef<string[]>([]);
  /** When this child's session started, so Gui gets sleepy after a while (FR-16). */
  const sessionStart = useRef(0);
  /** The warm-up comes once per session, before the first scene (FR-15). */
  const warmedUp = useRef(false);
  const [postcard, setPostcard] = useState<NewPostcard | null>(null);
  /** Dad's settings for the child playing (FR-29). */
  const [settings, setSettings] = useState<ChildSettings>(() => defaultSettings(8, guiLines.session.aimMinutes));

  const refreshProfiles = useCallback(async (s: Store) => {
    const ps = await s.listProfiles();
    const labels: Record<string, string> = {};
    for (const p of ps) {
      const next = nextScene(units, await s.scenesPlayed(p.id));
      labels[p.id] = `Paragem ${getUnit(next.unitId).unit}`;
    }
    setProfiles(ps);
    setStops(labels);
    setSmartOn((await s.getSetting(SMART_REPLIES)) === 'on');
  }, []);

  const start = useCallback(() => {
    setScreen({ name: 'loading' });
    Promise.all([openStore(), initRecordings()])
      .then(([s]) => s)
      .then(async (s) => {
        setStore(s);
        await refreshProfiles(s);
        setScreen({ name: 'pick' });
      })
      .catch((e) => {
        console.warn('Could not open the local store', e);
        setScreen({ name: 'store-error' });
      });
  }, [refreshProfiles]);

  useEffect(() => {
    void initVoice();
    start();
  }, [start]);

  const pick = async (p: StoredProfile) => {
    if (!store) return;
    const c = toChildProfile(p);
    const [prog, wallet, played, last, worn, saved] = await Promise.all([
      store.getProgress(c.id),
      store.getCoins(c.id),
      store.scenesPlayed(c.id),
      store.lastPlayedDay(c.id),
      store.getOutfit(c.id),
      store.getSetting(settingsKey(c.id)),
    ]);
    setSettings(readSettings(saved, c.age, guiLines.session.aimMinutes));
    setOutfit(worn);
    setChild(c);
    setProgress(prog);
    setCoins(wallet);
    const next = nextScene(units, played);
    practised.current = [];
    sessionStart.current = Date.now();
    warmedUp.current = false;
    setScreen({ name: 'welcome', text: greeting(c.name, last, localDay()), unitId: next.unitId, sceneId: next.sceneId, album: buildAlbum(units, journey.stops, played) });
  };

  /** Into the episode: the warm-up first, if anything is due and it hasn't been done this session (FR-15). */
  const startEpisode = (unitId: string, sceneId: string) => {
    if (!child) return;
    const beats = warmedUp.current ? [] : buildWarmup(units, progress, localDay(), child, guiLines.warmup.intro, guiLines.warmup.introEn);
    warmedUp.current = true;
    setScreen(beats.length ? { name: 'warmup', unitId, sceneId, beats } : { name: 'scene', unitId, sceneId });
  };

  /** "Mais uma": straight into the next scene (FR-16, no lock-out). */
  const oneMore = async () => {
    if (!store || !child) return;
    const next = nextScene(units, await store.scenesPlayed(child.id));
    practised.current = [];
    setPostcard(null);
    startEpisode(next.unitId, next.sceneId);
  };

  const showAlbum = async (back: Screen) => {
    if (!store || !child) return;
    setScreen({ name: 'album', album: buildAlbum(units, journey.stops, await store.scenesPlayed(child.id)), back });
  };

  const onTurn = (sceneId: string) => (t: TurnLog) => {
    if (!store || !child) return;
    setCoins((c) => c + COINS_PER_TURN);
    practised.current.push(t.phraseId);
    store
      .recordTurn({ childId: child.id, unitId: t.unitId, sceneId, beatId: t.beatId, phraseId: t.phraseId, startRung: t.startRung, outcome: t.outcome, day: localDay(), coins: COINS_PER_TURN })
      .then((updated) => setProgress((prev) => ({ ...prev, [updated.phraseId]: updated })))
      .catch((e) => console.error('Could not save the turn', e));
  };

  const onSceneFinished = async (unitId: string, sceneId: string) => {
    if (!store || !child) return;
    const before = buildAlbum(units, journey.stops, await store.scenesPlayed(child.id));
    await store.finishScene(child.id, unitId, sceneId, localDay());
    const after = buildAlbum(units, journey.stops, await store.scenesPlayed(child.id));
    // A new postcard for the album, and maybe a full stop that opens the next one (FR-21).
    const stopNow = after.find((st) => st.unitId === unitId);
    const card = stopNow?.postcards.find((p) => p.sceneId === sceneId);
    const wasNew = !before.find((st) => st.unitId === unitId)?.postcards.find((p) => p.sceneId === sceneId)?.got;
    setPostcard(stopNow && card && wasNew ? { card, stamp: stopNow.stop.emoji, newStop: stopNow.state === 'done' } : null);
    const unit = getUnit(unitId);
    const given = await store.missionsGiven(child.id, unitId);
    const mission = nextMission(unit, given.map((m) => m.missionId), child.age, practised.current);
    const row = await store.createMission(child.id, unitId, mission.id);
    setScreen({ name: 'mission', unitId, mission, rowId: row.id });
  };

  const doneScreen = (): Screen => ({ name: 'done', sleepy: isSleepy(sessionStart.current, Date.now(), settings.sessionMinutes) });

  /** A word from "Como se diz?" said back in Portuguese: it counts like a turn (FR-11). */
  const onWordLearned = () => {
    if (!store || !child) return;
    setCoins((c) => c + COINS_PER_TURN);
    store.addCoins(child.id, COINS_PER_TURN).catch((e) => console.error('Could not save the coins', e));
  };

  const backToStart = async () => {
    void stopVoice();
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

      {/* Back to "Quem vai jogar?" from the game screens; the scene draws its own in its top bar. */}
      {(screen.name === 'welcome' || screen.name === 'mission') && (
        <View style={styles.back}>
          <BackButton onPress={() => void backToStart()} />
        </View>
      )}

      {screen.name === 'loading' && (
        <View style={styles.done}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      )}

      {screen.name === 'store-error' && (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Ups!</Text>
          {/* For the parent, so in English. In a browser this nearly always means a second tab. */}
          <Text style={[styles.doneText, { maxWidth: 640, textAlign: 'center' }]}>
            Fala Comigo couldn't open its saved progress. If it's open in another tab or window, close that one, then try again.
          </Text>
          {/* In a browser, expo-sqlite can't recover inside the same page after a failed open, so start the page again. */}
          <BigButton label="↻ Tentar outra vez" onPress={Platform.OS === 'web' ? () => window.location.reload() : start} accessibilityLabel="Try again" />
        </View>
      )}

      {screen.name === 'pick' && <ProfilePicker profiles={profiles} details={stops} onPick={pick} onParent={() => setScreen({ name: 'parent' })} />}

      {screen.name === 'parent' && store && (
        <ParentZone store={store} profiles={profiles} smartRepliesAvailable={!!smartReplies} onProfilesChanged={() => void refreshProfiles(store)} onExit={() => void backToStart()} />
      )}

      {screen.name === 'welcome' && (
        <WelcomeScreen
          text={screen.text}
          stopName={getUnit(screen.unitId).stop.name}
          album={screen.album}
          wear={wear}
          onShop={() => setScreen({ name: 'shop', back: screen })}
          onAlbum={() => void showAlbum(screen)}
          onStart={() => startEpisode(screen.unitId, screen.sceneId)}
        />
      )}

      {screen.name === 'warmup' && child && (
        <SceneScreen
          key={`${child.id}/warmup`}
          unit={getUnit(screen.unitId)}
          sceneId={screen.sceneId}
          beats={screen.beats}
          title={guiLines.warmup.title}
          child={child}
          recognizer={recognizer}
          progress={progress}
          onTurn={onTurn('warmup')}
          onFinished={() => setScreen({ name: 'scene', unitId: screen.unitId, sceneId: screen.sceneId })}
          onExit={() => void backToStart()}
          onWordLearned={onWordLearned}
          settings={settings}
          wear={wear}
          smartReplies={smartOn ? smartReplies : null}
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
          onTurn={onTurn(screen.sceneId)}
          onFinished={() => void onSceneFinished(screen.unitId, screen.sceneId)}
          onExit={() => void backToStart()}
          onWordLearned={onWordLearned}
          settings={settings}
          wear={wear}
          smartReplies={smartOn ? smartReplies : null}
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
            setScreen(doneScreen());
          }}
          wear={wear}
          onLater={() => {
            setScreen(doneScreen());
          }}
        />
      )}

      {screen.name === 'shop' && store && child && (
        <ShopScreen
          store={store}
          child={child}
          coins={coins}
          outfit={outfit}
          recognizer={recognizer}
          onCoins={setCoins}
          onOutfit={setOutfit}
          onExit={() => setScreen(screen.back)}
        />
      )}

      {screen.name === 'done' && (
        <DoneScreen
          coins={coins}
          sleepy={screen.sleepy}
          postcard={postcard}
          wear={wear}
          onMore={() => void oneMore()}
          onAlbum={() => {
            setPostcard(null);
            void showAlbum({ name: 'done', sleepy: screen.sleepy });
          }}
          onShop={() => {
            setPostcard(null);
            setScreen({ name: 'shop', back: { name: 'done', sleepy: screen.sleepy } });
          }}
          onHome={() => void backToStart()}
        />
      )}

      {screen.name === 'album' && <AlbumScreen album={screen.album} onExit={() => setScreen(screen.back)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  back: { position: 'absolute', left: 24, top: 20, zIndex: 10 },
  coins: { position: 'absolute', right: 24, top: 20, zIndex: 10, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 6 },
  coinsText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  doneTitle: { fontSize: 56, fontWeight: '900', color: colors.blue },
  doneText: { fontSize: 22, fontWeight: '700', color: colors.ink },
});
