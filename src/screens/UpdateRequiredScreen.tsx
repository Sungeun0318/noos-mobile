import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { appVersion } from '@/lib/appInfo';
import { color, radius, space, type } from '@/theme';

export function UpdateRequiredScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>업데이트 필요</Text>
        <Text style={styles.title}>NOOS를 업데이트해 주세요</Text>
        <Text style={styles.body}>
          현재 버전 {appVersion}에서는 일부 기능을 안정적으로 사용할 수 없어요.
        </Text>
        <Button
          label="스토어에서 업데이트"
          onPress={() => {
            // TODO: 스토어 링크 연결.
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
    textAlign: 'center',
  },
  container: {
    alignItems: 'center',
    backgroundColor: color.bg.base,
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
  },
  kicker: {
    color: color.state.warning,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    lineHeight: type.caption.lineHeight,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: color.bg.surface,
    borderColor: color.border.default,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.lg,
    padding: space['2xl'],
    width: '100%',
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h1.family,
    fontSize: type.h1.size,
    fontWeight: type.h1.weight,
    lineHeight: type.h1.lineHeight,
    textAlign: 'center',
  },
});
