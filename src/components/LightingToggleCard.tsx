import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { color, space, type } from '@/theme';

export function LightingToggleCard({
  available,
  onChange,
  unavailableText,
  value,
}: {
  available: boolean;
  onChange: (value: boolean) => void;
  unavailableText: string;
  value: boolean;
}) {
  const on = available && value;
  const body = !available
    ? unavailableText
    : on
      ? '음악이 만들어지면 곡에 맞춰 조명 색이 바뀌어요.'
      : '조명 없이 음악만 재생해요.';

  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.row}>
        <View style={styles.stack}>
          <Text style={styles.title}>조명</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Switch
          accessibilityLabel="조명 사용"
          disabled={!available}
          onValueChange={onChange}
          value={on}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    color: color.text.secondary,
    fontFamily: type.body.family,
    fontSize: type.body.size,
    fontWeight: type.body.weight,
    lineHeight: type.body.lineHeight,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
    justifyContent: 'space-between',
  },
  stack: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.bodyMd.family,
    fontSize: type.bodyMd.size,
    fontWeight: type.bodyMd.weight,
    lineHeight: type.bodyMd.lineHeight,
  },
});
