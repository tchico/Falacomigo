import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { applyFamilyEdits, originalAccept, units } from '../content';
import { editedAccept, emptyEdits, FAMILY_SETTING, nextCustomId, readEdits, type FamilyEdits, type FamilyNames } from '../engine/family';
import { normalize } from '../engine/normalize';
import type { Store } from '../store/store';
import { colors, TOUCH } from '../ui/theme';
import { Panel, SmallButton, styles as ui } from './ui';

const NAME_FIELDS: { key: keyof FamilyNames; label: string; placeholder: string }[] = [
  { key: 'granny', label: 'Granny', placeholder: 'avó Rosa' },
  { key: 'grandad', label: 'Grandad', placeholder: 'avô Zé' },
  { key: 'village', label: 'Their village', placeholder: 'Tomar' },
];

/**
 * FR-28: the family's own names, Dad's own phrases, and the answers that count for each phrase. Everything is saved
 * on the tablet straight away and laid over the content packs; the packs themselves never change.
 */
export function FamilySection({ store, onChanged }: { store: Store; onChanged: () => void }) {
  const [edits, setEdits] = useState<FamilyEdits>(emptyEdits);
  const [names, setNames] = useState<FamilyNames>(emptyEdits().names);
  const [savedNames, setSavedNames] = useState(false);
  const [draft, setDraft] = useState({ text: '', en: '', other: '' });
  const [unitId, setUnitId] = useState(units[0].id);
  const [phraseId, setPhraseId] = useState<string | null>(null);
  const [extra, setExtra] = useState('');

  useEffect(() => {
    void store.getSetting(FAMILY_SETTING).then((v) => {
      const e = readEdits(v);
      setEdits(e);
      setNames(e.names);
    });
  }, [store]);

  const save = async (next: FamilyEdits) => {
    setEdits(next);
    await store.setSetting(FAMILY_SETTING, JSON.stringify(next));
    applyFamilyEdits(next);
    onChanged();
  };

  const saveNames = async () => {
    const clean = Object.fromEntries(NAME_FIELDS.map(({ key }) => [key, names[key].trim() || emptyEdits().names[key]])) as unknown as FamilyNames;
    setNames(clean);
    await save({ ...edits, names: clean });
    setSavedNames(true);
  };

  const addPhrase = async () => {
    if (!draft.text.trim()) return;
    const other = draft.other.split(/[,;\n]/).map(normalize).filter(Boolean);
    await save({ ...edits, phrases: [...edits.phrases, { id: nextCustomId(edits.phrases), text: draft.text.trim(), en: draft.en.trim(), accept: other }] });
    setDraft({ text: '', en: '', other: '' });
  };

  const unit = units.find((u) => u.id === unitId)!;
  const phrase = unit.phrases.find((p) => p.id === phraseId) ?? null;
  const builtIn = phrase ? originalAccept(unit.id, phrase.id) : [];
  const edit = phrase ? edits.accept[phrase.id] ?? { add: [], remove: [] } : { add: [], remove: [] };
  const setEdit = (id: string, e: { add: string[]; remove: string[] }) => {
    const accept = { ...edits.accept };
    if (e.add.length || e.remove.length) accept[id] = e;
    else delete accept[id];
    return save({ ...edits, accept });
  };
  const toggleBuiltIn = (a: string) => phrase && a !== builtIn[0] && setEdit(phrase.id, { ...edit, remove: edit.remove.includes(a) ? edit.remove.filter((x) => x !== a) : [...edit.remove, a] });
  const addExtra = async () => {
    const a = normalize(extra);
    if (!phrase || !a || editedAccept(builtIn, edit).includes(a)) return setExtra('');
    await setEdit(phrase.id, { add: [...edit.add, a], remove: edit.remove.filter((x) => x !== a) });
    setExtra('');
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={ui.h1}>Family words</Text>
        <Text style={ui.sub}>Make the game sound like your family: real names, your own phrases, and the way your children really say things.</Text>
      </View>

      <Panel title="Names">
        <Text style={ui.muted}>Used in the missions ("Liga à avó Rosa!") and on the journey map.</Text>
        {NAME_FIELDS.map(({ key, label, placeholder }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={names[key]}
              onChangeText={(v) => {
                setNames({ ...names, [key]: v });
                setSavedNames(false);
              }}
              placeholder={placeholder}
              placeholderTextColor="#A39B8C"
              style={styles.input}
              accessibilityLabel={label}
            />
          </View>
        ))}
        <View style={[styles.field, { justifyContent: 'flex-end' }]}>
          {savedNames ? <Text style={ui.muted}>Saved ✓</Text> : null}
          <SmallButton label="Save names" onPress={() => void saveNames()} />
        </View>
      </Panel>

      <Panel title="Your own phrases">
        <Text style={ui.muted}>Things you say at home that you want them to say back. Gui brings in two new ones per warm-up, and you can record them in My recordings.</Text>
        {edits.phrases.map((p) => (
          <View key={p.id} style={styles.custom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pt}>{p.text}</Text>
              {p.en ? <Text style={ui.muted}>{p.en}</Text> : null}
              {p.accept.length ? <Text style={ui.muted}>Also counts: {p.accept.join(' · ')}</Text> : null}
            </View>
            <SmallButton label="Remove" kind="plain" onPress={() => void save({ ...edits, phrases: edits.phrases.filter((x) => x.id !== p.id) })} accessibilityLabel={`Remove ${p.text}`} />
          </View>
        ))}
        <View style={styles.field}>
          <Text style={styles.label}>Portuguese</Text>
          <TextInput value={draft.text} onChangeText={(text) => setDraft({ ...draft, text })} placeholder="Anda jantar!" placeholderTextColor="#A39B8C" style={styles.input} accessibilityLabel="New phrase in Portuguese" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>English</Text>
          <TextInput value={draft.en} onChangeText={(en) => setDraft({ ...draft, en })} placeholder="Come and have dinner!" placeholderTextColor="#A39B8C" style={styles.input} accessibilityLabel="New phrase in English" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Also counts</Text>
          <TextInput value={draft.other} onChangeText={(other) => setDraft({ ...draft, other })} placeholder="Other ways to say it, separated by commas" placeholderTextColor="#A39B8C" style={styles.input} accessibilityLabel="Other ways to say it" />
        </View>
        <View style={[styles.field, { justifyContent: 'flex-end' }]}>
          <SmallButton label="Add phrase" onPress={() => void addPhrase()} disabled={!draft.text.trim()} />
        </View>
      </Panel>

      <Panel title="Answers that count">
        <Text style={ui.muted}>Pick a phrase to see what Gui accepts. Add the way your child really says it, or tap one to stop accepting it.</Text>
        <View style={styles.row}>
          {units.map((u) => (
            <Pressable key={u.id} accessibilityRole="tab" accessibilityState={{ selected: u.id === unitId }} onPress={() => { setUnitId(u.id); setPhraseId(null); }} style={[styles.chip, u.id === unitId && styles.chipOn]}>
              <Text style={[styles.chipText, u.id === unitId && { color: colors.white }]}>
                {u.unit}. {u.titleEn ?? u.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          {unit.phrases.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: p.id === phraseId }} onPress={() => setPhraseId(p.id === phraseId ? null : p.id)} style={[styles.phrase, p.id === phraseId && styles.chipOn]}>
              <Text style={[styles.chipText, p.id === phraseId && { color: colors.white }]}>{p.text.split(' / ')[0]}</Text>
              {edits.accept[p.id] ? <Text style={[ui.muted, p.id === phraseId && { color: colors.white }]}> ✎</Text> : null}
            </Pressable>
          ))}
        </View>
        {phrase ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.pt}>
              {phrase.text} <Text style={ui.muted}>· {phrase.en}</Text>
            </Text>
            <View style={styles.row}>
              {builtIn.map((a, i) => {
                const off = edit.remove.includes(a);
                // The phrase itself always counts, so there's always a way through.
                if (i === 0) {
                  return (
                    <View key={a} style={styles.answer}>
                      <Text style={styles.answerText}>{a}</Text>
                    </View>
                  );
                }
                return (
                  <Pressable key={a} accessibilityRole="button" accessibilityLabel={off ? `Accept "${a}" again` : `Stop accepting "${a}"`} onPress={() => void toggleBuiltIn(a)} style={[styles.answer, off && styles.answerOff]}>
                    <Text style={[styles.answerText, off && styles.answerTextOff]}>{a}</Text>
                    <Text style={styles.answerIcon}>{off ? '↺' : '×'}</Text>
                  </Pressable>
                );
              })}
              {edit.add.map((a) => (
                <Pressable key={a} accessibilityRole="button" accessibilityLabel={`Remove "${a}"`} onPress={() => void setEdit(phrase.id, { ...edit, add: edit.add.filter((x) => x !== a) })} style={[styles.answer, styles.answerMine]}>
                  <Text style={styles.answerText}>{a}</Text>
                  <Text style={styles.answerIcon}>×</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.field}>
              <TextInput value={extra} onChangeText={setExtra} onSubmitEditing={() => void addExtra()} placeholder="Another way that should count, e.g. tou com fome" placeholderTextColor="#A39B8C" style={styles.input} accessibilityLabel="Another accepted answer" />
              <SmallButton label="Add" onPress={() => void addExtra()} disabled={!extra.trim()} />
            </View>
          </View>
        ) : null}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { width: 130, fontSize: 15, fontWeight: '800', color: colors.inkSoft },
  input: { flex: 1, minWidth: 220, minHeight: TOUCH, borderWidth: 2, borderColor: '#E2D9C6', borderRadius: 12, paddingHorizontal: 14, fontSize: 18, color: colors.ink },
  custom: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream, borderRadius: 12, padding: 12 },
  pt: { fontSize: 17, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: colors.ink, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontSize: 15, fontWeight: '800', color: colors.ink },
  phrase: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: '#E2D9C6' },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.blueTint },
  answerMine: { backgroundColor: '#DDF0E8' },
  answerOff: { backgroundColor: '#F1ECE2' },
  answerText: { fontSize: 15, color: colors.ink },
  answerTextOff: { color: colors.inkSoft, textDecorationLine: 'line-through' },
  answerIcon: { fontSize: 16, fontWeight: '900', color: colors.inkSoft },
});
