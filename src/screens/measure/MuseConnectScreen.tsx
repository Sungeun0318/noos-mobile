import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { museGateway } from '@/screens/measure/museGateway';
import type { SimulatedMuseDevice } from '@/screens/measure/museSimulator';
import { useDeviceStore } from '@/stores/deviceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, space, type } from '@/theme';

type MuseConnectNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/MuseConnect'>;

export function MuseConnectScreen() {
  const navigation = useNavigation<MuseConnectNavigation>();
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const setSimulationMode = useSettingsStore((state) => state.setSimulationMode);
  const setMuseStatus = useDeviceStore((state) => state.setMuseStatus);
  const setMuseConnection = useDeviceStore((state) => state.setMuseConnection);
  const [devices, setDevices] = useState<SimulatedMuseDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasMuseCandidate = devices.some((device) => device.isMuseCandidate);
  const [showDiagnosticDevices, setShowDiagnosticDevices] = useState(false);
  const visibleDevices = getVisibleDevices(devices, showDiagnosticDevices);

  async function scan() {
    setScanning(true);
    setError(null);
    setMuseStatus('scanning');
    noosTelemetry.track('muse_scan_start');

    try {
      const nextDevices = await museGateway.scan();
      setDevices(nextDevices);
      setMuseStatus('idle');
    } catch (scanError) {
      const mapped = mapMuseError(scanError, 'SCAN_FAILED');
      setError(mapped.message);
      setMuseConnection({ error: { code: mapped.code, message: mapped.message }, status: 'error' });
      noosTelemetry.track('muse_connect_fail', { code: mapped.code });
    } finally {
      setScanning(false);
    }
  }

  async function connect(device: SimulatedMuseDevice) {
    setConnectingId(device.deviceId);
    setError(null);
    setMuseStatus('connecting');

    try {
      const connection = await museGateway.connect(device.deviceId);
      setMuseConnection({ ...connection, status: 'connected' });
      noosTelemetry.track('muse_connect_success', { rssi: connection.rssi });
      navigation.navigate('Measure/Manual');
    } catch (connectError) {
      const mapped = mapMuseError(connectError, 'CONNECT_FAILED');
      setError(mapped.message);
      setMuseConnection({ error: { code: mapped.code, message: mapped.message }, status: 'error' });
      noosTelemetry.track('muse_connect_fail', { code: mapped.code });
    } finally {
      setConnectingId(null);
    }
  }

  useEffect(() => {
    if (simulationMode) {
      void scan();
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {error ? <Toast message={error} variant="danger" /> : null}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Muse</Text>
        <Text style={styles.title}>Muse를 연결해</Text>
        <Text style={styles.description}>
          {simulationMode ? 'Muse-SIM으로 연결 흐름을 검증해.' : '실제 Muse 기기를 Bluetooth로 찾아 연결해.'}
        </Text>
      </View>

      <Card level={1} padding="lg">
        <View style={styles.stack}>
          <Text style={styles.cardTitle}>권한</Text>
          <Text style={styles.description}>
            {simulationMode
              ? '시뮬레이션 모드라 Bluetooth 권한은 자동 허용으로 처리해.'
              : '스캔을 시작하면 Muse 연결을 위해 Bluetooth 권한을 요청해.'}
          </Text>
        </View>
      </Card>

      <Card level={1} padding="lg">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.cardTitle}>Simulation EEG</Text>
            <Text style={styles.metaText}>
              {simulationMode
                ? 'Muse-SIM을 사용해. 실제 기기 없이 측정 흐름을 확인할 수 있어.'
                : '실제 Muse BLE를 사용해. EEG 디코딩은 FE-13b-2에서 연결해.'}
            </Text>
          </View>
          <Switch value={simulationMode} onValueChange={setSimulationMode} />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>검색 결과</Text>
        <Button label={scanning ? '검색 중' : '다시 검색'} loading={scanning} onPress={() => void scan()} size="sm" />
      </View>

      {devices.length === 0 && !scanning ? (
        <Text style={styles.description}>주변에 Muse가 없어요. 켜져 있는지 확인하고 다시 시도해 주세요.</Text>
      ) : null}

      {!simulationMode && devices.length > 0 && !hasMuseCandidate ? (
        <Card level={2} padding="lg">
          <Text style={styles.description}>
            주변에 Muse 후보가 안 보여서 주변 BLE 장치도 함께 표시 중이에요. 목록에서 Muse를 직접 선택할 수 있어요.
          </Text>
        </Card>
      ) : null}

      {!simulationMode && devices.length > 0 && hasMuseCandidate ? (
        <Button
          label={showDiagnosticDevices ? '진단용 BLE 전체 숨기기' : '진단용 BLE 전체 보기'}
          onPress={() => setShowDiagnosticDevices((value) => !value)}
          size="sm"
          variant="secondary"
        />
      ) : null}

      <View style={styles.stack}>
        {visibleDevices.map((device) => (
          <Card key={device.deviceId} level={2} padding="lg">
            <View style={styles.deviceRow}>
              <View style={styles.switchText}>
                <View style={styles.deviceTitleRow}>
                  <Text style={device.isMuseCandidate ? styles.deviceName : styles.secondaryDeviceName}>{device.name}</Text>
                  {device.isMuseCandidate ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Muse 후보</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.metaText}>
                  RSSI {device.rssi} · {device.isMuseCandidate ? 'Muse service/name match' : 'BLE device'}
                </Text>
              </View>
              <Button
                label="연결"
                loading={connectingId === device.deviceId}
                onPress={() => void connect(device)}
                size="sm"
              />
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function getVisibleDevices(devices: SimulatedMuseDevice[], showDiagnosticDevices: boolean) {
  const museCandidates = devices.filter((device) => device.isMuseCandidate);

  if (showDiagnosticDevices || museCandidates.length === 0) {
    return devices;
  }

  return museCandidates;
}

function mapMuseError(error: unknown, fallbackCode: 'SCAN_FAILED' | 'CONNECT_FAILED') {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);

    if (code === 'PERMISSION_DENIED') {
      return { code, message: 'Bluetooth 권한이 필요해요. 설정에서 허용해 주세요.' };
    }

    if (code === 'BLUETOOTH_OFF') {
      return { code, message: 'Bluetooth를 켜고 다시 시도해 주세요.' };
    }

    if (code === 'SCAN_FAILED') {
      return { code, message: 'Muse를 찾지 못했어요. 켜져 있는지 확인하고 다시 시도해 주세요.' };
    }

    if (code === 'CONNECT_FAILED') {
      return { code, message: 'Muse 연결에 실패했어요. 다시 시도해 주세요.' };
    }
  }

  return {
    code: fallbackCode,
    message:
      fallbackCode === 'SCAN_FAILED'
        ? 'Muse를 찾지 못했어요. 켜져 있는지 확인하고 다시 시도해 주세요.'
        : 'Muse 연결에 실패했어요. 다시 시도해 주세요.',
  };
}

const styles = StyleSheet.create({
  cardTitle: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space.xl,
    padding: space.xl,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  deviceName: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  deviceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  deviceTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  eyebrow: {
    color: color.text.tertiary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
  },
  header: {
    gap: space.sm,
  },
  metaText: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
  secondaryDeviceName: {
    color: color.text.secondary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  stack: {
    gap: space.md,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  switchText: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
  },
  badge: {
    backgroundColor: color.bg.elevated,
    borderColor: color.border.default,
    borderRadius: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  badgeText: {
    color: color.text.primary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
});
