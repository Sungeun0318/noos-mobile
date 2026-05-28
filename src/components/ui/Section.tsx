import { StyleSheet, Text, View } from 'react-native';

import { color, space, type } from '@/theme';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.xs,
  },
  container: {
    gap: space.sm,
  },
  title: {
    color: color.text.secondary,
    fontFamily: type.caption.family,
    fontSize: type.caption.size,
    fontWeight: type.caption.weight,
    letterSpacing: 0.4,
    lineHeight: type.caption.lineHeight,
    paddingHorizontal: space.xs,
  },
});
