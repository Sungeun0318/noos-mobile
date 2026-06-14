import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Toast } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import { museGateway } from '@/screens/measure/museGateway';
import type { SimulatedMuseDevice } from '@/screens/measure/museSimulator';
import { useDeviceStore } from '@/stores/deviceStore';
import { color, space, type } from '@/theme';

interface MuseConnectSheetProps {
  visible: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export function MuseConnectSheet({ visible, onClose, onConnected }: MuseConnectSheetProps) {
  const setMuseStatus = useDeviceStore((state) => state.setMuseStatus);
  const setMuseConnection = useDeviceStore((state) => state.setMuseConnection);
  const [devices, setDevices] = useState<SimulatedMuseDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      void scan();
    }
  }, [visible]);

  async function scan() {
    setScanning(true);
    setError(null);
    setMuseStatus('scanning');
    noosTelemetry.track('adaptive_muse_scan_start');

    try {
      const nextDevices = await museGateway.scan();
      setDevices(getVisibleDevices(nextDevices));
      setMuseStatus('idle');
    } catch (scanError) {
      const mapped = mapMuseError(scanError, 'SCAN_FAILED');
      setError(mapped.message);
      setMuseConnection({ error: { code: mapped.code, message: mapped.message }, status: 'error' });
      noosTelemetry.track('adaptive_muse_connect_fail', { code: mapped.code });
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
      noosTelemetry.track('adaptive_muse_connect_success', { rssi: connection.rssi });
      onConnected?.();
      onClose();
    } catch (connectError) {
      const mapped = mapMuseError(connectError, 'CONNECT_FAILED');
      setError(mapped.message);
      setMuseConnection({ error: { code: mapped.code, message: mapped.message }, status: 'error' });
      noosTelemetry.track('adaptive_muse_connect_fail', { code: mapped.code });
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Card level={3} padding="xl" variant="glass">
          <View style={styles.sheetStack}>
            {error ? <Toast message={error} variant="danger" /> : null}
            <View style={styles.headerRow}>
              <View style={styles.copyStack}>
                <Text style={styles.eyebrow}>Muse</Text>
                <Text style={styles.title}>Muse 연결</Text>
                <Text style={styles.body}>Bluetooth로 Muse 후보를 찾아 적응형 세션에 연결합니다.</Text>
              </View>
              <Button label="닫기" onPress={onClose} size="sm" variant="ghost" />
            </View>

            <View style={styles.headerRow}>
              <View style={styles.copyStack}>
                <Text style={styles.sectionTitle}>검색 결과</Text>
                <Text style={styles.meta}>{scanning ? '검색 중' : `${devices.length}개 표시 중`}</Text>
              </View>
              <Button label={scanning ? '검색 중' : '다시 검색'} loading={scanning} onPress={() => void scan()} size="sm" />
            </View>

            {devices.length === 0 && !scanning ? (
              <Text style={styles.body}>주변에 Muse가 없어요. 전원이 켜져 있는지 확인하고 다시 시도해 주세요.</Text>
            ) : null}

            <ScrollView contentContainerStyle={styles.deviceList}>
              {devices.map((device) => (
                <Card key={device.deviceId} level={device.isMuseCandidate ? 2 : 1} padding="lg" variant={device.isMuseCandidate ? 'hero' : 'glass'}>
                  <View style={styles.deviceRow}>
                    <View style={styles.copyStack}>
                      <Text style={device.isMuseCandidate ? styles.deviceName : styles.secondaryDeviceName}>{device.name}</Text>
                      <Text style={styles.meta}>
                        RSSI {device.rssi} · {device.isMuseCandidate ? 'Muse 후보' : 'BLE 장치'}
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
            </ScrollView>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function getVisibleDevices(devices: SimulatedMuseDevice[]) {
  const museCandidates = devices.filter((device) => device.isMuseCandidate);
  return museCandidates.length > 0 ? museCandidates : devices;
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
  backdrop: {
    backgroundColor: color.bg.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.xl,
  },
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  copyStack: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  deviceList: {
    gap: space.md,
    paddingBottom: space.md,
  },
  deviceName: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
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
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  meta: {
    color: color.text.tertiary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  secondaryDeviceName: {
    color: color.text.secondary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
  sectionTitle: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
  sheetStack: {
    gap: space.lg,
    maxHeight: '82%',
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h2.family,
    fontSize: type.h2.size,
    fontWeight: type.h2.weight,
    lineHeight: type.h2.lineHeight,
  },
});
