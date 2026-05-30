import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import {
  getGuestPromptHiddenUntil,
  hideGuestPromptForSevenDays,
  shouldShowGuestPrompt,
} from '@/components/guestPromptState';
import { noosTelemetry } from '@/lib/telemetry';
import { useAuthStore } from '@/stores/authStore';
import { color, space, type } from '@/theme';

type RootAuthNavigation = {
  navigate: (screen: 'Auth', params: { screen: 'Auth/Signup' }) => void;
};

export function GuestPromptCard() {
  const navigation = useNavigation<RootAuthNavigation>();
  const mode = useAuthStore((state) => state.mode);
  const [hiddenUntil, setHiddenUntil] = useState<number | null>(() => getGuestPromptHiddenUntil());

  useEffect(() => {
    setHiddenUntil(getGuestPromptHiddenUntil());
  }, [mode]);

  if (!shouldShowGuestPrompt(mode, hiddenUntil)) {
    return null;
  }

  function dismiss() {
    setHiddenUntil(hideGuestPromptForSevenDays());
  }

  function handleSignupTap() {
    noosTelemetry.track('today_signup_prompt_tap');
    dismiss();
    navigation.navigate('Auth', { screen: 'Auth/Signup' });
  }

  return (
    <Card level={2} padding="lg">
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>기록을 안전하게 보관하려면 가입하세요</Text>
          <Text style={styles.description}>게스트 기록은 이 기기에만 남아요.</Text>
        </View>
        <View style={styles.actions}>
          <Button label="나중에" onPress={dismiss} size="sm" variant="ghost" />
          <Button label="가입하기" onPress={handleSignupTap} size="sm" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
  content: {
    gap: space.lg,
  },
  copy: {
    gap: space.xs,
  },
  description: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
});
