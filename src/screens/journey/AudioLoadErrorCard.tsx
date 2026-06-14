import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import {
  getAudioLoadErrorCopy,
  type AudioPlaybackSurface,
} from '@/screens/journey/audioPlaybackError';
import { color, space, type } from '@/theme';

interface AudioLoadErrorCardProps {
  loading?: boolean;
  onRetry: () => void;
  onSecondaryPress?: () => void;
  secondaryLabel?: string;
  surface: AudioPlaybackSurface;
}

export function AudioLoadErrorCard({
  loading = false,
  onRetry,
  onSecondaryPress,
  secondaryLabel,
  surface,
}: AudioLoadErrorCardProps) {
  const copy = getAudioLoadErrorCopy(surface);

  return (
    <Card level={2} padding="lg" variant="glass">
      <View style={styles.stack}>
        <View style={styles.copy}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
        </View>
        <Button fullWidth label={copy.retryLabel} loading={loading} onPress={onRetry} variant="secondary" />
        {onSecondaryPress && secondaryLabel ? (
          <Button fullWidth label={secondaryLabel} onPress={onSecondaryPress} variant="ghost" />
        ) : null}
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
  copy: {
    gap: space.xs,
  },
  stack: {
    gap: space.md,
  },
  title: {
    color: color.text.primary,
    fontFamily: type.h3.family,
    fontSize: type.h3.size,
    fontWeight: type.h3.weight,
    lineHeight: type.h3.lineHeight,
  },
});
