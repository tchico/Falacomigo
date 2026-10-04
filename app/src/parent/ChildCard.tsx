// One child's dashboard on the parent Overview (FR-27): spoken turns per day, phrases per rung, missions done,
// and the phrases worth a little help at home. Drawn with plain views, like the rest of the parent zone.
import { StyleSheet, Text, View } from 'react-native';
import type { StoredProfile } from '../store/store';
import { avatarFor } from '../ui/avatars';
import { colors } from '../ui/theme';
import { RUNG_NAMES, type ChildDashboard } from './dashboard';
import { Panel, styles as ui } from './ui';

/** Rung 1 (echo) to 5 (free), light to dark. */
const RUNG_COLORS = ['#CFE0F4', '#9DBFE6', '#5F95D3', colors.blue, colors.blueDark];
const BAR_HEIGHT = 64;

const weekday = (day: string) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${day}T00:00:00Z`).getUTCDay()];

export function ChildCard({ profile, coins, dash }: { profile: StoredProfile; coins: number; dash: ChildDashboard }) {
  const avatar = avatarFor(profile.avatar);
  const week = dash.days.slice(-7).reduce((n, d) => n + d.turns, 0);
  const most = Math.max(1, ...dash.days.map((d) => d.turns));
  const phrases = dash.perRung.reduce((a, b) => a + b, 0);

  return (
    <Panel style={styles.cell}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
          <Text style={{ fontSize: 28 }}>{avatar.emoji}</Text>
        </View>
        <Text style={ui.panelTitle}>
          {profile.name}, {profile.age}
        </Text>
        <Text style={[ui.muted, { marginLeft: 'auto' }]}>{coins} moedas</Text>
      </View>

      <View>
        <Text style={styles.big}>{week}</Text>
        <Text style={ui.muted}>spoken turns in the last 7 days</Text>
      </View>
      <View style={styles.chart} accessibilityLabel={`Spoken turns per day: ${dash.days.map((d) => d.turns).join(', ')}`}>
        {dash.days.map((d) => (
          <View key={d.day} style={styles.barCol}>
            <View style={styles.barArea}>
              {d.turns ? <View style={[styles.bar, { height: Math.max(3, (d.turns / most) * BAR_HEIGHT) }]} /> : <View style={styles.zero} />}
            </View>
            <Text style={styles.tick}>{weekday(d.day)}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{phrases} phrases on the ladder</Text>
        <View style={styles.stack} accessibilityLabel={RUNG_NAMES.map((n, i) => `${n}: ${dash.perRung[i]}`).join(', ')}>
          {phrases ? dash.perRung.map((n, i) => (n ? <View key={i} style={{ flex: n, backgroundColor: RUNG_COLORS[i] }} /> : null)) : <View style={{ flex: 1, backgroundColor: '#EEE7DA' }} />}
        </View>
        <View style={styles.legend}>
          {RUNG_NAMES.map((name, i) => (
            <View key={name} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: RUNG_COLORS[i] }]} />
              <Text style={ui.muted}>
                {name} {dash.perRung[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={ui.body}>
        Missions to Dad: {dash.missionsDone} done{dash.averageStars !== null ? `, ${dash.averageStars} ★ on average` : ''}
        {dash.missionsOpen ? ` · ${dash.missionsOpen} waiting` : ''}
      </Text>

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Could use a little help</Text>
        {dash.struggling.length ? (
          dash.struggling.map((s) => (
            <View key={s.phraseId} style={styles.struggle}>
              <Text style={styles.pt}>{s.text}</Text>
              <Text style={ui.muted}>{s.en}</Text>
            </View>
          ))
        ) : (
          <Text style={ui.muted}>Nothing stuck right now.</Text>
        )}
        {dash.struggling.length ? <Text style={ui.muted}>Use one of these at home this week, in a real moment. Hearing it from you helps most.</Text> : null}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 44, fontWeight: '900', color: colors.ink },
  label: { fontSize: 15, fontWeight: '800', color: colors.ink },
  chart: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barArea: { height: BAR_HEIGHT, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.teal, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  zero: { width: '70%', height: 2, backgroundColor: '#E2D9C6' },
  tick: { fontSize: 11, color: colors.inkSoft },
  stack: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  struggle: { backgroundColor: colors.cream, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  pt: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
