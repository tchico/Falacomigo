import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { units } from '../content';
import { addDays } from '../engine/ladder';
import { localDay } from '../engine/episode';
import { hasRecording } from '../audio/recordings';
import { toChildProfile, type Store, type StoredProfile } from '../store/store';
import { avatarFor } from '../ui/avatars';
import { colors, TOUCH } from '../ui/theme';
import { ChildrenSection } from './ChildrenSection';
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
  turnsThisWeek: number;
  phrases: number;
}

/** The parent zone, reached through the hold gate on the profile screen. In English, for Dad. */
export function ParentZone({ store, profiles, onProfilesChanged, onExit }: { store: Store; profiles: StoredProfile[]; onProfilesChanged: () => void; onExit: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const [openMissions, setOpenMissions] = useState(0);
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);
  const [version, setVersion] = useState(0);
  const kids = useMemo(() => profiles.map(toChildProfile), [profiles]);
  const slots = useMemo(() => recordingList(units, kids), [kids]);

  useEffect(() => {
    void (async () => {
      setOpenMissions((await store.openMissions()).length);
      const weekAgo = addDays(localDay(), -6);
      setSummaries(
        await Promise.all(
          profiles.map(async (profile) => ({
            profile,
            coins: await store.getCoins(profile.id),
            turnsThisWeek: (await store.turnsPerDay(profile.id, weekAgo)).reduce((n, d) => n + d.turns, 0),
            phrases: Object.keys(await store.getProgress(profile.id)).length,
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
            <View style={styles.grid}>
              {summaries.map((s) => {
                const avatar = avatarFor(s.profile.avatar);
                return (
                  <Panel key={s.profile.id} style={styles.cell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                        <Text style={{ fontSize: 28 }}>{avatar.emoji}</Text>
                      </View>
                      <Text style={ui.panelTitle}>
                        {s.profile.name}, {s.profile.age}
                      </Text>
                    </View>
                    <Text style={styles.big}>{s.turnsThisWeek}</Text>
                    <Text style={ui.muted}>spoken turns in the last 7 days</Text>
                    <Text style={ui.body}>
                      {s.phrases} phrases practised · {s.coins} moedas
                    </Text>
                  </Panel>
                );
              })}
            </View>
            <View style={styles.grid}>
              <Panel title="Missions to Dad" style={styles.cell}>
                <Text style={ui.body}>{openMissions ? `${openMissions} waiting for your stars.` : 'Nothing waiting.'}</Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <SmallButton label="Give stars" onPress={() => setSection('missions')} disabled={!openMissions} />
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
        {section === 'guide' && <GuideSection />}
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
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 44, fontWeight: '900', color: colors.ink },
  track: { height: 10, borderRadius: 5, backgroundColor: '#E9E2D3', overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.teal },
});
