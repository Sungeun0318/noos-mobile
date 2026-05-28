import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { noosApi } from '@/api/noosApi';
import { Button, Card, TextInput, Toast } from '@/components/ui';
import type { SettingsStackParamList } from '@/navigation/SettingsStack';
import { noosTelemetry } from '@/lib/telemetry';
import { normalizeBackendUrl, useSettingsStore } from '@/stores/settingsStore';
import { color, radius, space, type } from '@/theme';

import {
  backendUrlPresets,
  isLocalhostUrl,
  normalizeDraftBackendUrl,
  type TestResult,
} from './backendUrlUtils';

type SettingsNavigation = NativeStackNavigationProp<SettingsStackParamList>;

export function BackendUrlScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const savedUrl = useSettingsStore((state) => state.backendBaseUrl);
  const setBackendBaseUrl = useSettingsStore((state) => state.setBackendBaseUrl);
  const [draftUrl, setDraftUrl] = useState(savedUrl);
  const [testResult, setTestResult] = useState<TestResult>('idle');
  const [testDetail, setTestDetail] = useState('');
  const [testing, setTesting] = useState(false);

  const normalizedDraftUrl = useMemo(() => normalizeDraftBackendUrl(draftUrl), [draftUrl]);
  const localhostWarning = normalizedDraftUrl ? isLocalhostUrl(normalizedDraftUrl) : false;

  async function testConnection() {
    const baseUrl = normalizeDraftBackendUrl(draftUrl);

    setDraftUrl(baseUrl);
    setTesting(true);
    setTestResult('idle');
    setTestDetail('');

    try {
      const health = await noosApi.healthWithBaseUrl(baseUrl);
      setTestResult('ok');
      setTestDetail(`backend=${health.backend}, aceStep=${health.aceStep}`);
      noosTelemetry.track('backend_url_test', { ok: true });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setTestResult('fail');
      setTestDetail(code);
      noosTelemetry.track('backend_url_test', { ok: false });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    setBackendBaseUrl(normalizeBackendUrl(draftUrl));
    noosTelemetry.track('backend_url_save');
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {localhostWarning ? (
        <Toast message="실기기에서는 localhost 가 폰 자신을 가리켜요" variant="warning" />
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        label="Backend URL"
        onChangeText={(value) => {
          setDraftUrl(value);
          setTestResult('idle');
          setTestDetail('');
        }}
        placeholder="http://192.168.1.42:8080"
        value={draftUrl}
      />

      <View style={styles.actions}>
        <Button
          disabled={!normalizedDraftUrl}
          fullWidth
          label="연결 테스트"
          loading={testing}
          onPress={testConnection}
          variant="secondary"
        />
        <Button
          disabled={!normalizedDraftUrl}
          fullWidth
          label={testResult === 'ok' ? '저장' : '테스트 없이 저장'}
          onPress={save}
        />
      </View>

      {testResult !== 'idle' ? (
        <Card level={testResult === 'ok' ? 2 : 1}>
          <Text style={styles.resultTitle}>{testResult === 'ok' ? '연결됨' : '연결 실패'}</Text>
          <Text style={styles.resultDetail}>{testDetail}</Text>
        </Card>
      ) : null}

      <View style={styles.presets}>
        <Text style={styles.presetsTitle}>Preset</Text>
        {backendUrlPresets.map((url) => (
          <Pressable
            accessibilityRole="button"
            key={url}
            onPress={() => {
              setDraftUrl(url);
              setTestResult('idle');
              setTestDetail('');
            }}
            style={({ pressed }) => [styles.preset, pressed && styles.pressed]}
          >
            <Text style={styles.presetText}>{url}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.md,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  pressed: {
    opacity: 0.85,
  },
  preset: {
    backgroundColor: color.bg.surface,
    borderColor: color.border.subtle,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  presetText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  presets: {
    gap: space.sm,
  },
  presetsTitle: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  resultDetail: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  resultTitle: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
});
