import { View } from 'react-native';

type SharedValue<T> = {
  value: T;
};

export const Easing = {
  accel() {
    return 'accel';
  },
  bezier() {
    return 'bezier';
  },
  decel() {
    return 'decel';
  },
  standard() {
    return 'standard';
  },
};

export function useSharedValue<T>(initialValue: T): SharedValue<T> {
  return { value: initialValue };
}

export function useAnimatedStyle<T extends object>(factory: () => T): T {
  return factory();
}

export function withTiming<T>(toValue: T): T {
  return toValue;
}

export function withRepeat<T>(animation: T): T {
  return animation;
}

export function withDelay<T>(_delayMs: number, animation: T): T {
  return animation;
}

export default {
  View,
};
