import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { noosApi } from '@/api/noosApi';
import { queryClient } from '@/api/queryClient';
import { ScreenBackdrop } from '@/components/backdrop/ScreenBackdrop';
import { Button, Card, Row, Section } from '@/components/ui';
import { formatLogLine, logger } from '@/lib/logger';
import { formatTelemetryEvent, noosTelemetry } from '@/lib/telemetry';
import { useHealth } from '@/queries/useHealth';
import { useAuthStore } from '@/stores/authStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStateStore } from '@/stores/stateStore';
import { color, radius, space, type } from '@/theme';

const log = logger.create('DebugScreen');

function formatDump(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function HealthBlock() {
  const health = useHealth({ refetchInterval: 5000 });

  if (!health.data) {
    return <Text style={styles.bodyText}>{health.isFetching ? '확인 중' : '데이터 없음'}</Text>;
  }

  return (
    <View style={styles.grid}>
      {(['backend', 'ai', 'aceStep', 'lighting'] as const).map((key) => (
        <View key={key} style={styles.statusRow}>
          <Text style={styles.statusLabel}>{key}</Text>
          <Text style={styles.statusValue}>{health.data[key]}</Text>
        </View>
      ))}
      <Text style={styles.caption}>server {health.data.version} · min {health.data.minAppVersion}</Text>
    </View>
  );
}

function useSafeStoreDump() {
  const auth = useAuthStore();
  const appState = useStateStore();
  const session = useSessionStore();
  const device = useDeviceStore();
  const settings = useSettingsStore();
  const historyCount = useHistoryStore((state) => state.sessions.length);

  return useMemo(
    () => ({
      auth: {
        mode: auth.mode,
        deviceIdPresent: !!auth.deviceId,
        user: auth.user
          ? {
              displayName: auth.user.displayName,
              loginId: auth.user.loginId,
              userId: auth.user.userId,
            }
          : null,
      },
      state: {
        confidence: appState.confidence,
        hasCurrentState: !!appState.currentState,
        measuredAt: appState.measuredAt,
        recommendedPlanet: appState.recommendedPlanet,
        source: appState.source,
        stateLabel: appState.stateLabel,
      },
      session: {
        active: session.active
          ? {
              planet: session.active.planet,
              sessionId: session.active.sessionId,
              status: session.active.status,
            }
          : null,
        pendingCount: session.pending.length,
      },
      device: {
        muse: {
          batteryPct: device.muse.batteryPct,
          deviceName: device.muse.deviceName,
          signalQuality: device.muse.signalQuality,
          status: device.muse.status,
        },
      },
      settings: {
        adaptiveBackendReal: settings.adaptiveBackendReal,
        backendBaseUrl: settings.backendBaseUrl,
        hasOnboarded: settings.hasOnboarded,
        locale: settings.locale,
        notificationsEnabled: settings.notificationsEnabled,
        simulationMode: settings.simulationMode,
      },
      history: {
        count: historyCount,
      },
    }),
    [auth, appState, session, device, settings, historyCount],
  );
}

export function DebugScreen() {
  const adaptiveBackendReal = useSettingsStore((state) => state.adaptiveBackendReal);
  const setAdaptiveBackendReal = useSettingsStore((state) => state.setAdaptiveBackendReal);
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const setSimulationMode = useSettingsStore((state) => state.setSimulationMode);
  const storeDump = useSafeStoreDump();
  const [diagnostics, setDiagnostics] = useState<string>('대기 중');
  const [running, setRunning] = useState(false);
  const logLines = logger.lines().slice(-80).map(formatLogLine);
  const telemetryLines = noosTelemetry.recentEvents().slice(-80).map(formatTelemetryEvent);

  useEffect(() => {
    noosTelemetry.track('debug_view');
  }, []);

  async function runDiagnostics() {
    setRunning(true);
    noosTelemetry.track('debug_diagnostics_run');

    try {
      const [health, sessions] = await Promise.all([
        noosApi.health(),
        noosApi.sessions.list({ limit: 1 }),
      ]);
      setDiagnostics(
        formatDump({
          health: {
            aceStep: health.aceStep,
            ai: health.ai,
            backend: health.backend,
            lighting: health.lighting,
            minAppVersion: health.minAppVersion,
          },
          sessions: {
            count: sessions.items.length,
            hasMore: sessions.hasMore,
          },
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      log.warn('diagnostics failed', { message });
      setDiagnostics(`실패: ${message}`);
    } finally {
      setRunning(false);
    }
  }

  function clearCache() {
    Alert.alert('캐시 정리', 'Query 캐시와 로컬 히스토리만 정리할게.', [
      { style: 'cancel', text: '취소' },
      {
        style: 'destructive',
        text: '정리',
        onPress: () => {
          queryClient.clear();
          useHistoryStore.getState().clear();
          log.info('debug cache cleared');
        },
      },
    ]);
  }

  async function exportLogs() {
    const message = [
      '[NOOS logs]',
      ...logger.lines().map(formatLogLine),
      '',
      '[NOOS telemetry]',
      ...noosTelemetry.recentEvents().map(formatTelemetryEvent),
    ].join('\n');

    await Share.share({ message });
  }

  return (
    <ScreenBackdrop>
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <Section title="상태">
          <Card cardRadius="sm" variant="glass">
            <HealthBlock />
          </Card>
          <Row
            label="Simulation mode"
            right={<Switch onValueChange={setSimulationMode} value={simulationMode} />}
            value={simulationMode ? 'mock' : 'real'}
          />
          <Row
            label="적응 백엔드 실서버 사용"
            right={<Switch onValueChange={setAdaptiveBackendReal} value={adaptiveBackendReal} />}
            value={adaptiveBackendReal ? 'adaptive real' : 'simulation 설정 따름'}
          />
        </Section>

        <Section title="진단">
          <Card cardRadius="sm" variant="compact">
            <Text style={styles.mono}>{diagnostics}</Text>
          </Card>
          <Button label="Run diagnostics" loading={running} onPress={runDiagnostics} />
          <Button label="Clear cache" onPress={clearCache} variant="secondary" />
          <Button label="Export logs" onPress={exportLogs} variant="secondary" />
        </Section>

        <Section title="Store dump">
          <Card cardRadius="sm" variant="compact">
            <Text style={styles.mono}>{formatDump(storeDump)}</Text>
          </Card>
        </Section>

        <Section title="Log tail">
          <Card cardRadius="sm" variant="compact">
            <Text style={styles.mono}>{logLines.join('\n') || '로그 없음'}</Text>
          </Card>
        </Section>

        <Section title="Telemetry tail">
          <Card cardRadius="sm" variant="compact">
            <Text style={styles.mono}>{telemetryLines.join('\n') || '이벤트 없음'}</Text>
          </Card>
        </Section>
      </ScrollView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  caption: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  container: {
    backgroundColor: 'transparent',
  },
  content: {
    gap: space['2xl'],
    padding: space.xl,
  },
  grid: {
    gap: space.sm,
  },
  mono: {
    color: color.text.secondary,
    fontFamily: type.tabular.family,
    fontSize: type.caption.size,
    fontWeight: type.tabular.weight,
    lineHeight: type.caption.lineHeight,
  },
  statusLabel: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  statusRow: {
    alignItems: 'center',
    backgroundColor: color.bg.surfaceAlt,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: space.sm,
  },
  statusValue: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
});
