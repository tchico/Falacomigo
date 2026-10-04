import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { guide, units } from '../content';
import { addDays } from '../engine/ladder';
import { localDay } from '../engine/episode';
import { hasRecording } from '../audio/recordings';
import { SMART_REPLIES, toChildProfile, type Store, type StoredProfile } from '../store/store';
import { colors, TOUCH } from '../ui/theme';
import { ChildCard } from './ChildCard';
import { ChildrenSection } from './ChildrenSection';
import { childDashboard, tipOfWeek, type ChildDashboard } from './dashboard';
import { GuideSection } from './GuideSection';
import { MissionsSection } from './MissionsSection';
import { recordingList } from './recordings';
import { RecordingsSection } from './RecordingsSection';
import { Panel, SmallButton, pz, styles as ui } from './ui';

type Section = 'overview' | 'missions' | 'recordings' | 'children' | 'guide';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'missions', label: 'Missions', icon: '✉️' },
  { id: 'recordings', label: 'My recordings', icon: '🎙️' },
  { id: 'children', label: 'Children', icon: '👧' },
  { id: 'guide', label: 'Guide', icon: '📖' },
];

interface ChildSummary {
  profile: StoredProfile;
  coins: number;
  dash: ChildDashboard;
}

/** The parent zone, reached through the hold gate on the profile screen. In English, for Dad. */
export function ParentZone({ store, profiles, smartRepliesAvailable, onProfilesChanged, onExit }: { store: Store; profiles: StoredProfile[]; smartRepliesAvailable: boolean; onProfilesChanged: () => void; onExit: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const [openMissions, setOpenMissions] = useState(0);
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [version, setVersion] = useState(0);
  const [guideCard, setGuideCard] = useState(0);
  const tip = guide.cards[tipOfWeek(guide.cards.length, localDay())];
  const [smartOn, setSmartOn] = useState(false);
  useEffect(() => {
    void store.getSetting(SMART_REPLIES).then((v) => setSmartOn(v === 'on'));
  }, [store]);
  const toggleSmart = async () => {
    await store.setSetting(SMART_REPLIES, smartOn ? 'off' : 'on');
    setSmartOn(!smartOn);
  };
  const kids = useMemo(() => profiles.map(toChildProfile), [profiles]);
  const slots = useMemo(() => recordingList(units, kids), [kids]);

  useEffect(() => {
    void (async () => {
      setOpenMissions((await store.openMissions()).length);
      const today = localDay();
      setSummaries(
        await Promise.all(
          profiles.map(async (profile) => ({
            profile,
            coins: await store.getCoins(profile.id),
            dash: childDashboard({
              progress: await store.getProgress(profile.id),
              units,
              turnsPerDay: await store.turnsPerDay(profile.id, addDays(today, -13)),
              missions: await store.missionsFor(profile.id),
              today,
            }),
          })),
        ),
      );
    })();
  }, [store, profiles, version, section]);

  const changed = () => {
    setVersion((v) => v + 1);
    onProfilesChanged();
  };

  const recorded = section === 'overview' ? slots.filter((s) => hasRecording(s.key)).length : 0;

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>Fala Comigo</Text>
        <Text style={styles.brandSub}>Parent zone</Text>
        <View style={{ gap: 6, marginTop: 24 }}>
          {SECTIONS.map((s) => (
            <Pressable key={s.id} accessibilityRole="tab" accessibilityState={{ selected: section === s.id }} onPress={() => setSection(s.id)} style={[styles.nav, section === s.id && styles.navActive]}>
              <Text style={styles.navText}>
                {s.icon}  {s.label}
              </Text>
              {s.id === 'missions' && openMissions > 0 ? <Text style={styles.badge}>{openMissions}</Text> : null}
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={onExit} style={styles.back}>
          <Text style={styles.backText}>‹  Back to the game</Text>
        </Pressable>
      </View>

      <View style={styles.main}>
        {section === 'overview' && (
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text style={ui.h1}>This week</Text>
            <Panel title={`💡 Tip of the week · ${tip.title}`}>
              <Text style={ui.body}>{tip.tryThisWeek.charAt(0).toUpperCase() + tip.tryThisWeek.slice(1)}</Text>
              <View style={{ alignItems: 'flex-start' }}>
                <SmallButton
                  label="Read the card"
                  kind="plain"
                  onPress={() => {
                    setGuideCard(guide.cards.indexOf(tip));
                    setSection('guide');
                  }}
                />
              </View>
            </Panel>
            <View style={styles.grid}>
              {summaries.map((s) => (
                <ChildCard key={s.profile.id} profile={s.profile} coins={s.coins} dash={s.dash} />
              ))}
            </View>
            <View style={styles.grid}>
              <Panel title="Missions to Dad" style={styles.cell}>
                <Text style={ui.body}>{openMissions ? `${openMissions} waiting for your stars.` : 'Nothing waiting.'}</Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <SmallButton label="Give stars" onPress={() => setSection('missions')} disabled={!openMissions} />
                </View>
              </Panel>
              <Panel title="Gui's smart replies (beta)" style={styles.cell}>
                <Text style={ui.body}>
                  When a child gives a real answer the script doesn't know ("Estou cansado"), Gui replies to it, using a language model through your
                  speech proxy. Only the words go, never audio, and the child's name is left out. Right now it's on in the "Como estás?" scene.
                </Text>
                <Text style={ui.muted}>
                  {!smartRepliesAvailable ? 'Needs the speech proxy set up first.' : smartOn ? 'On.' : 'Off.'}
                </Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <SmallButton label={smartOn ? 'Turn off' : 'Turn on'} kind={smartOn ? 'plain' : 'blue'} onPress={() => void toggleSmart()} disabled={!smartRepliesAvailable} />
                </View>
              </Panel>
              <Panel title={`Your recordings · ${recorded} of ${slots.length}`} style={styles.cell}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${slots.length ? Math.round((recorded / slots.length) * 100) : 0}%` }]} />
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <SmallButton label="Record" kind="red" onPress={() => setSection('recordings')} />
                </View>
              </Panel>
            </View>
          </ScrollView>
        )}
        {section === 'missions' && <MissionsSection store={store} profiles={profiles} onChanged={changed} />}
        {section === 'recordings' && <RecordingsSection units={units} kids={kids} />}
        {section === 'children' && <ChildrenSection store={store} profiles={profiles} onChanged={changed} />}
        {section === 'guide' && <GuideSection start={guideCard} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: pz.bg },
  sidebar: { width: 240, backgroundColor: pz.sidebar, padding: 20 },
  brand: { color: colors.white, fontSize: 26, fontWeight: '900' },
  brandSub: { color: '#B9C3D1', fontSize: 14, fontWeight: '700' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 12 },
  navActive: { backgroundColor: colors.blue },
  navText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  badge: { color: colors.white, backgroundColor: colors.terracottaLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, fontWeight: '900', overflow: 'hidden' },
  back: { marginTop: 'auto', minHeight: TOUCH, borderWidth: 2, borderColor: '#5A6478', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14 },
  backText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  main: { flex: 1, padding: 28 },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
  track: { height: 10, borderRadius: 5, backgroundColor: '#E9E2D3', overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.teal },
});
