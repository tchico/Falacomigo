import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';
import type { ChildProfile, Unit } from '../content/types';
import { deleteRecording, hasRecording, saveRecording } from '../audio/recordings';
import { play, recordingFile, stop } from '../audio/voice';
import { colors } from '../ui/theme';
import { recordingList } from './recordings';
import { Panel, SmallButton, styles as ui } from './ui';

/** A take stops by itself after this long, in case Dad forgets to tap stop. */
const MAX_TAKE_MS = 10_000;

/**
 * FR-26: Dad records, plays back and re-records his voice for every phrase and mission line.
 * Recordings stay on the tablet and are used instead of text-to-speech straight away (FR-05).
 */
export function RecordingsSection({ units, kids }: { units: Unit[]; kids: ChildProfile[] }) {
  const slots = useMemo(() => recordingList(units, kids), [units, kids]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(() => new Set(slots.filter((s) => hasRecording(s.key)).map((s) => s.key)));
  const [error, setError] = useState<string | null>(null);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDone(new Set(slots.filter((s) => hasRecording(s.key)).map((s) => s.key))), [slots]);
  useEffect(
    () => () => {
      if (autoStop.current) clearTimeout(autoStop.current);
      void stop();
    },
    [],
  );

  const finish = async (key: string) => {
    if (autoStop.current) clearTimeout(autoStop.current);
    autoStop.current = null;
    try {
      await recorder.stop();
      if (recorder.uri) {
        saveRecording(key, recorder.uri);
        setDone((d) => new Set(d).add(key));
      }
    } catch (e) {
      setError(`Couldn't save that take: ${String(e)}`);
    }
    setRecordingKey(null);
  };

  const start = async (key: string) => {
    setError(null);
    if (recordingKey) await finish(recordingKey);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Fala Comigo needs the microphone to record you. Allow it in the tablet settings.');
      return;
    }
    await stop();
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingKey(key);
    autoStop.current = setTimeout(() => void finish(key), MAX_TAKE_MS);
  };

  const remove = (key: string) => {
    deleteRecording(key);
    setDone((d) => {
      const next = new Set(d);
      next.delete(key);
      return next;
    });
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={ui.h1}>My recordings</Text>
        <Text style={ui.sub}>
          {done.size} of {slots.length} recorded · Say each one naturally, a little slower than normal, about 20 cm from the tablet. Anything you
          haven't recorded is read by a Portuguese text-to-speech voice.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={slots}
        keyExtractor={(s) => s.key}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isRecording = recordingKey === item.key;
          const has = done.has(item.key);
          return (
            <Panel style={[styles.row, isRecording && { borderColor: colors.terracotta }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>{item.text}</Text>
                <Text style={ui.muted}>
                  {item.en}
                  {item.forWho ? ` · for ${item.forWho}` : ''} · {has ? '✓ your voice' : 'text-to-speech'}
                </Text>
              </View>
              {isRecording ? (
                <SmallButton label="■ Stop" kind="red" onPress={() => void finish(item.key)} />
              ) : (
                <SmallButton label={has ? '● Re-record' : '● Record'} kind="red" onPress={() => void start(item.key)} disabled={!!recordingKey} />
              )}
              <SmallButton
                label="▶ Play"
                kind="plain"
                disabled={!has || isRecording}
                onPress={() => void play({ kind: 'recording', uri: recordingFile(item.key).uri })}
              />
              <SmallButton label="Delete" kind="plain" disabled={!has || isRecording} onPress={() => remove(item.key)} accessibilityLabel={`Delete recording of ${item.text}`} />
            </Panel>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  text: { fontSize: 18, fontWeight: '800', color: colors.ink },
  error: { color: colors.terracotta, fontWeight: '800' },
});
