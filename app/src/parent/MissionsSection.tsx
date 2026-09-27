import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getUnit } from '../content';
import { coinsForStars } from '../engine/rewards';
import { fill } from '../engine/template';
import type { MissionRow, Store, StoredProfile } from '../store/store';
import { toChildProfile } from '../store/store';
import { colors } from '../ui/theme';
import { Panel, SmallButton, styles as ui } from './ui';

const ago = (ms: number) => {
  const h = Math.round((Date.now() - ms) / 3_600_000);
  return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

/** Missions the children left for later: Dad gives the stars here once they've done it (FR-18, FR-20). */
export function MissionsSection({ store, profiles, onChanged }: { store: Store; profiles: StoredProfile[]; onChanged: () => void }) {
  const [open, setOpen] = useState<MissionRow[]>([]);
  const load = useCallback(() => void store.openMissions().then(setOpen), [store]);
  useEffect(load, [load]);

  const give = async (row: MissionRow, stars: number) => {
    await store.approveMission(row.id, stars, coinsForStars(stars));
    load();
    onChanged();
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={ui.h1}>Missions to Dad</Text>
        <Text style={ui.sub}>Give the stars straight after they've said it to you. That's when it means the most.</Text>
      </View>
      {open.length === 0 ? <Text style={ui.body}>No missions waiting. 🎉</Text> : null}
      {open.map((row) => {
        const profile = profiles.find((p) => p.id === row.childId);
        const mission = getUnit(row.unitId).missions.find((m) => m.id === row.missionId);
        if (!profile || !mission) return null;
        const child = toChildProfile(profile);
        return (
          <Panel key={row.id} style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.say}>{fill(mission.say[String(child.age) as '6' | '8'], child)}</Text>
              <Text style={ui.muted}>
                {child.name} · {mission.card.en} · {mission.when} · waiting since {ago(row.createdAt)}
              </Text>
            </View>
            {[1, 2, 3].map((n) => (
              <SmallButton key={n} label={'★'.repeat(n)} onPress={() => void give(row, n)} accessibilityLabel={`${n} star${n > 1 ? 's' : ''} for ${child.name}`} />
            ))}
          </Panel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  say: { fontSize: 20, fontWeight: '800', color: colors.ink },
});
