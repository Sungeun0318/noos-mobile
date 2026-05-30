import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import type { MeasureStackParamList } from '@/navigation/MeasureStack';
import { museSimulator, type SimulatedMuseDevice } from '@/screens/measure/museSimulator';
import { useDeviceStore } from '@/stores/deviceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, space, type } from '@/theme';

type MuseConnectNavigation = NativeStackNavigationProp<MeasureStackParamList, 'Measure/MuseConnect'>;

export function MuseConnectScreen() {
  const navigation = useNavigation<MuseConnectNavigation>();
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const setMuseStatus = useDeviceStore((state) => state.setMuseStatus);
  const setMuseConnection = useDeviceStore((state) => state.setMuseConnection);
  const [devices, setDevices] = useState<SimulatedMuseDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    setMuseStatus('scanning');
    noosTelemetry.track('muse_scan_start');

    try {
      const nextDevices = await museSimulator.scan();
      setDevices(nextDevices);
      setMuseStatus('idle');
    } catch {
      setError('Muse를 찾지 못했어요. 다시 시도해 주세요.');
      setMuseConnection({ error: { code: 'SCAN_FAILED', message: 'scan failed' }, status: 'error' });
      noosTelemetry.track('muse_connect_fail', { code: 'SCAN_FAILED' });
    } finally {
      setScanning(false);
    }
  }

  async function connect(device: SimulatedMuseDevice) {
    setConnectingId(device.deviceId);
    setError(null);
    setMuseStatus('connecting');

    try {
      const connection = await museSimulator.connect(device.deviceId);
      setMuseConnection({ ...connection, status: 'connected' });
      noosTelemetry.track('muse_connect_success', { rssi: connection.rssi });
      navigation.navigate('Measure/Manual');
    } catch {
      setError('Muse 연결에 실패했어요. 다시 시도해 주세요.');
      setMuseConnection({ error: { code: 'CONNECT_FAILED', message: 'connect failed' }, status: 'error' });
      noosTelemetry.track('muse_connect_fail', { code: 'CONNECT_FAILED' });
    } finally {
      setConnectingId(null);
    }
  }

  useEffect(() => {
    void scan();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {error ? <Toast message={error} variant="danger" /> : null}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Muse</Text>
        <Text style={styles.title}>Muse를 연결해</Text>
        <Text style={styles.description}>현재는 Muse-SIM으로 실제 연결 흐름을 검증해.</Text>
      </View>

      <Card level={1} padding="lg">
        <View style={styles.stack}>
          <Text style={styles.cardTitle}>권한</Text>
          <Text style={styles.description}>시뮬레이션 모드라 Bluetooth 권한은 자동 허용으로 처리해.</Text>
        </View>
      </Card>

      <Card level={1} padding="lg">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.cardTitle}>Simulation EEG</Text>
            <Text style={styles.metaText}>
              실제 BLE는 FE-13b에서 연결해. 현재 설정: {simulationMode ? '앱 시뮬레이션' : '실세션 모드'}
            </Text>
          </View>
          {/* TODO FE-13b: enable real BLE mode after react-native-ble-plx approval. */}
          <Switch disabled value />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>검색 결과</Text>
        <Button label={scanning ? '검색 중' : '다시 검색'} loading={scanning} onPress={() => void scan()} size="sm" />
      </View>

      {devices.length === 0 && !scanning ? (
        <Text style={styles.description}>주변에 Muse가 없어요. 켜져 있는지 확인하고 다시 시도해 주세요.</Text>
      ) : null}

      <View style={styles.stack}>
        {devices.map((device) => (
          <Card key={device.deviceId} level={2} padding="lg">
            <View style={styles.deviceRow}>
              <View style={styles.switchText}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.metaText}>RSSI {device.rssi}</Text>
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
});
