export const qk = {
  health: () => ['health'] as const,
  measure: () => ['state', 'measure'] as const,
  sessionEnqueue: () => ['session', 'enqueue'] as const,
  session: (id: string) => ['session', id] as const,
  sessionList: () => ['session', 'list'] as const,
  audio: (id: string) => ['audio', id] as const,
};
