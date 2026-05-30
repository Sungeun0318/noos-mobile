import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { SettingsStackParamList } from '@/navigation/SettingsStack';
import { Row, Section } from '@/components/ui';
import { appVersion } from '@/lib/appInfo';
import { noosTelemetry } from '@/lib/telemetry';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, space, type } from '@/theme';

type SettingsNavigation = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsHomeScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const backendBaseUrl = useSettingsStore((state) => state.backendBaseUrl);
  const simulationMode = useSettingsStore((state) => state.simulationMode);
  const setSimulationMode = useSettingsStore((state) => state.setSimulationMode);
  const mode = useAuthStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    noosTelemetry.track('settings_view');
  }, []);

  function trackRow(row: string) {
    noosTelemetry.track('settings_row_tap', { row });
  }

  function openAuth(screen: 'Auth/Login' | 'Auth/Signup') {
    trackRow(screen === 'Auth/Login' ? 'login' : 'signup');
    navigation.getParent()?.navigate('Auth', { screen });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Section title="계정">
        {mode === 'authed' && user ? (
          <Row
            hint={user.loginId}
            label={user.displayName}
            onPress={() => {
              trackRow('account');
              navigation.navigate('Settings/Account');
            }}
            value="계정"
          />
        ) : (
          <>
            <Row label="로그인" onPress={() => openAuth('Auth/Login')} />
            <Row label="회원가입" onPress={() => openAuth('Auth/Signup')} />
          </>
        )}
      </Section>

      <Section title="연결">
        <Row
          label="Backend URL"
          onPress={() => {
            trackRow('backend_url');
            navigation.navigate('Settings/BackendUrl');
          }}
          value={backendBaseUrl || '미설정'}
        />
        <Row disabled hint="준비 중" label="Muse 상태" value="미연결" />
        <Row
          disabled
          hint="조명 미연결"
          label="조명 사용"
          right={<Switch disabled value={false} />}
        />
      </Section>

      <Section title="앱">
        <Row disabled hint="준비 중" label="알림" value="꺼짐" />
        <Row disabled hint="준비 중" label="언어" value="한국어" />
        <Row disabled hint="준비 중" label="개인정보/약관" />
      </Section>

      <Section title="개발자">
        <Row
          label="Simulation mode"
          right={
            <Switch
              onValueChange={(value) => {
                trackRow('simulation_mode');
                setSimulationMode(value);
              }}
              value={simulationMode}
            />
          }
        />
        <Row
          label="개발자 도구"
          onPress={() => {
            trackRow('debug');
            navigation.navigate('Settings/Debug');
          }}
        />
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>버전</Text>
          <Text style={styles.versionValue}>{appVersion}</Text>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.bg.base,
  },
  content: {
    gap: space['2xl'],
    padding: space.xl,
  },
  versionLabel: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
  },
  versionValue: {
    color: color.text.tertiary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
});
