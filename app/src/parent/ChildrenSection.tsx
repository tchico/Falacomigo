import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AgeBand } from '../content/types';
import type { Store, StoredProfile } from '../store/store';
import { AVATARS } from '../ui/avatars';
import { colors, TOUCH } from '../ui/theme';
import { Panel, SmallButton, styles as ui } from './ui';

/**
 * FR-01: each child's name, age band and avatar. Their name and sibling fill in the phrases
 * ("Chamo-me …", "Este é o meu …"). Progress stays with the profile when it's renamed.
 */
export function ChildrenSection({ store, profiles, onChanged }: { store: Store; profiles: StoredProfile[]; onChanged: () => void }) {
  const [drafts, setDrafts] = useState<StoredProfile[]>(profiles);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => setDrafts(profiles), [profiles]);

  const edit = (i: number, change: Partial<StoredProfile>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...change } : d)));

  const save = async (p: StoredProfile, i: number) => {
    await store.saveProfile({ ...p, name: p.name.trim() || profiles[i].name, sibling: p.sibling.trim() || profiles[i].sibling }, i);
    setSaved(p.id);
    onChanged();
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={ui.h1}>Children</Text>
        <Text style={ui.sub}>Each child has their own progress and coins. The 6-year-old gets pictures and audio only, and a gentler match.</Text>
      </View>
      {drafts.map((p, i) => (
        <Panel key={p.id} title={`Child ${i + 1}`}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput value={p.name} onChangeText={(name) => edit(i, { name })} style={styles.input} accessibilityLabel={`Child ${i + 1} name`} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Age band</Text>
            {([6, 8] as AgeBand[]).map((age) => (
              <Pressable key={age} accessibilityRole="radio" accessibilityState={{ checked: p.age === age }} onPress={() => edit(i, { age })} style={[styles.choice, p.age === age && styles.chosen]}>
                <Text style={[styles.choiceText, p.age === age && { color: colors.white }]}>{age}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Avatar</Text>
            {AVATARS.map((a) => (
              <Pressable key={a.key} accessibilityRole="radio" accessibilityLabel={a.label} accessibilityState={{ checked: p.avatar === a.key }} onPress={() => edit(i, { avatar: a.key })} style={[styles.avatar, { backgroundColor: a.color }, p.avatar === a.key && styles.avatarChosen]}>
                <Text style={{ fontSize: 32 }}>{a.emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Their sibling</Text>
            <TextInput value={p.sibling} onChangeText={(sibling) => edit(i, { sibling })} style={styles.input} placeholder="irmão, irmã, or a name" accessibilityLabel={`How child ${i + 1} names their sibling`} />
          </View>
          <View style={[styles.field, { justifyContent: 'flex-end' }]}>
            {saved === p.id ? <Text style={ui.muted}>Saved ✓</Text> : null}
            <SmallButton label="Save" onPress={() => void save(p, i)} />
          </View>
        </Panel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { width: 120, fontSize: 15, fontWeight: '800', color: colors.inkSoft },
  input: { flex: 1, minHeight: TOUCH, borderWidth: 2, borderColor: '#E2D9C6', borderRadius: 12, paddingHorizontal: 14, fontSize: 18, color: colors.ink },
  choice: { minWidth: TOUCH, minHeight: TOUCH, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  chosen: { backgroundColor: colors.ink },
  choiceText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  avatar: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarChosen: { borderColor: colors.ink, borderWidth: 4 },
});
