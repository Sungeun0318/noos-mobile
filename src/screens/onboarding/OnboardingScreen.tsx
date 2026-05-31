import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandBackdrop } from '@/components/backdrop/BrandBackdrop';
import { NoosLogo } from '@/components/brand/NoosLogo';
import { Button, Card } from '@/components/ui';
import { noosTelemetry } from '@/lib/telemetry';
import { getPostBootRoute } from '@/navigation/postBootRoute';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { color, space, type } from '@/theme';

type OnboardingProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type AuthRoute = 'Auth/Login' | 'Auth/Signup';

export function OnboardingScreen({ navigation }: OnboardingProps) {
  const mode = useAuthStore((state) => state.mode);
  const backendBaseUrl = useSettingsStore((state) => state.backendBaseUrl);
  const setHasOnboarded = useSettingsStore((state) => state.setHasOnboarded);
  const proceededRef = useRef(false);

  useEffect(() => {
    noosTelemetry.track('onboarding_view');
  }, []);

  function proceed() {
    if (proceededRef.current) {
      return;
    }

    proceededRef.current = true;
    setHasOnboarded(true);
    navigation.replace(getPostBootRoute(true, backendBaseUrl));
  }

  useEffect(() => {
    if (mode === 'authed') {
      proceed();
    }
  }, [mode]);

  function openAuth(screen: AuthRoute) {
    noosTelemetry.track(screen === 'Auth/Signup' ? 'onboarding_signup_tap' : 'onboarding_login_tap');
    navigation.navigate('Auth', { screen });
  }

  function continueAsGuest() {
    noosTelemetry.track('onboarding_guest_tap');
    proceed();
  }

  return (
    <BrandBackdrop>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <NoosLogo size={logoSize} />
            <View style={styles.copy}>
              <Text style={styles.title}>NOOS</Text>
              <Text style={styles.tagline}>오늘의 컨디션에 맞는 행성 사운드</Text>
            </View>
          </View>

          <Card level={2} padding="xl" variant="glass">
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>기록을 이어가려면 계정을 연결하세요</Text>
              <Text style={styles.description}>
                가입하지 않아도 바로 둘러볼 수 있고, 나중에 계정으로 기록을 이어받을 수 있어요.
              </Text>
            </View>
          </Card>

          <View style={styles.actions}>
            <Button fullWidth label="회원가입" onPress={() => openAuth('Auth/Signup')} size="lg" />
            <Button
              fullWidth
              label="로그인"
              onPress={() => openAuth('Auth/Login')}
              size="lg"
              variant="secondary"
            />
            <Button label="게스트로 둘러보기" onPress={continueAsGuest} variant="ghost" />
          </View>
        </View>
      </SafeAreaView>
    </BrandBackdrop>
  );
}

const logoSize = space['6xl'] + space.sm;

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: space['3xl'],
    justifyContent: 'center',
    padding: space.xl,
  },
  copy: {
    alignItems: 'center',
    gap: space.sm,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: space['2xl'],
  },
  panel: {
    alignItems: 'center',
    gap: space.sm,
  },
  panelTitle: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
    textAlign: 'center',
  },
  tagline: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
    textAlign: 'center',
  },
  title: {
    color: color.brand.noos,
    fontFamily: type.display.family,
    fontSize: type.display.size,
    fontWeight: type.display.weight,
    letterSpacing: 0,
    lineHeight: type.display.lineHeight,
  },
});
