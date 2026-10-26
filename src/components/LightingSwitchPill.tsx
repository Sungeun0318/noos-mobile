import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LIGHTING_SWITCH_LABEL, type LightingSwitchState } from '@/lighting/lightingState';
import { color, radius, space, type } from '@/theme';

export function LightingSwitchPill({
  busy = false,
  onPress,
  state,
}: {
  busy?: boolean;
  onPress: () => void;
  state: LightingSwitchState;
}) {
  const disabled = state === 'unavailable' || busy;

  return (
    <Pressable
      accessibilityLabel={state === 'off' ? '조명 켜기' : '조명 끄기'}
      accessibilityRole="switch"
      accessibilityState={{ busy, checked: state === 'on' || state === 'waiting', disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pill, state === 'on' && styles.pillOn, state === 'waiting' && styles.pillWaiting]}
    >
      {busy ? (
        <ActivityIndicator color={color.text.secondary} size="small" />
      ) : (
        <View style={[styles.dot, state === 'on' && styles.dotOn]} />
      )}
      <Text style={styles.label}>{LIGHTING_SWITCH_LABEL[state]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: color.text.disabled,
    borderRadius: radius.pill,
    height: space.sm,
    width: space.sm,
  },
  dotOn: {
    backgroundColor: color.state.success,
  },
  label: {
    color: color.text.secondary,
    fontFamily: type.small.family,
    fontSize: type.small.size,
    fontWeight: type.small.weight,
    lineHeight: type.small.lineHeight,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.bg.surfaceAlt,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  pillOn: {
    borderColor: color.state.success,
  },
  pillWaiting: {
    borderColor: color.brand.accent,
  },
});
