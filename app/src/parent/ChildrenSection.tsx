import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { guiLines } from '../content';
import type { AgeBand } from '../content/types';
import { readSettings, SESSION_CHOICES, settingsKey, type ChildSettings } from '../settings/childSettings';
import type { Store, StoredProfile } from '../store/store';
import { AVATARS } from '../ui/avatars';
import { colors, TOUCH } from '../ui/theme';
import { Panel, SmallButton, styles as ui } from './ui';

/**
 * FR-01: each child's name, age band and avatar. Their name and sibling fill in the phrases
 * ("Chamo-me …", "Este é o meu …"). Progress stays with the profile when it's renamed.
 * FR-29: subtitles, session length and listen back, per child.
 */
export function ChildrenSection({ store, profiles, onChanged }: { store: Store; profiles: StoredProfile[]; onChanged: () => void }) {
  const [drafts, setDrafts] = useState<StoredProfile[]>(profiles);
  const [saved, setSaved] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, ChildSettings>>({});
  useEffect(() => setDrafts(profiles), [profiles]);
  useEffect(() => {
    let live = true;
    void Promise.all(profiles.map(async (p) => [p.id, readSettings(await store.getSetting(settingsKey(p.id)), p.age, guiLines.session.aimMinutes)] as const)).then(
      (pairs) => live && setSettings(Object.fromEntries(pairs)),
    );
    return () => {
      live = false;
    };
  }, [profiles, store]);
  const editSettings = (id: string, change: Partial<ChildSettings>) => setSettings((all) => ({ ...all, [id]: { ...all[id], ...change } }));

  const edit = (i: number, change: Partial<StoredProfile>) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...change } : d)));

  const save = async (p: StoredProfile, i: number) => {
    await store.saveProfile({ ...p, name: p.name.trim() || profiles[i].name, sibling: p.sibling.trim() || profiles[i].sibling }, i);
    if (settings[p.id]) await store.setSetting(settingsKey(p.id), JSON.stringify(settings[p.id]));
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
          {settings[p.id] ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>English subtitles</Text>
                <OnOff value={settings[p.id].subtitles} onChange={(subtitles) => editSettings(p.id, { subtitles })} label={`English subtitles for child ${i + 1}`} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Session length</Text>
                {SESSION_CHOICES.map((m) => (
                  <Pressable key={m} accessibilityRole="radio" accessibilityLabel={`${m} minutes`} accessibilityState={{ checked: settings[p.id].sessionMinutes === m }} onPress={() => editSettings(p.id, { sessionMinutes: m })} style={[styles.choice, settings[p.id].sessionMinutes === m && styles.chosen]}>
                    <Text style={[styles.choiceText, settings[p.id].sessionMinutes === m && { color: colors.white }]}>{m}</Text>
                  </Pressable>
                ))}
                <Text style={ui.muted}>minutes, then Gui gets sleepy</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Listen back</Text>
                <OnOff value={settings[p.id].listenBack} onChange={(listenBack) => editSettings(p.id, { listenBack })} label={`Listen back for child ${i + 1}`} />
                <Text style={[ui.muted, { flex: 1 }]}>They hear their own turn played back. The recording is only kept long enough to play it.</Text>
              </View>
            </>
          ) : null}
          <View style={[styles.field, { justifyContent: 'flex-end' }]}>
            {saved === p.id ? <Text style={ui.muted}>Saved ✓</Text> : null}
            <SmallButton label="Save" onPress={() => void save(p, i)} />
          </View>
        </Panel>
      ))}
    </ScrollView>
  );
}

function OnOff({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <>
      {[true, false].map((v) => (
        <Pressable key={String(v)} accessibilityRole="radio" accessibilityLabel={`${label}: ${v ? 'on' : 'off'}`} accessibilityState={{ checked: value === v }} onPress={() => onChange(v)} style={[styles.choice, styles.wide, value === v && styles.chosen]}>
          <Text style={[styles.choiceText, value === v && { color: colors.white }]}>{v ? 'On' : 'Off'}</Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { width: 120, fontSize: 15, fontWeight: '800', color: colors.inkSoft },
  input: { flex: 1, minHeight: TOUCH, borderWidth: 2, borderColor: '#E2D9C6', borderRadius: 12, paddingHorizontal: 14, fontSize: 18, color: colors.ink },
  choice: { minWidth: TOUCH, minHeight: TOUCH, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  wide: { paddingHorizontal: 14 },
  chosen: { backgroundColor: colors.ink },
  choiceText: { fontSize: 20, fontWeight: '800', color: colors.ink },
  avatar: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  avatarChosen: { borderColor: colors.ink, borderWidth: 4 },
});
