export type TelemetryProps = Record<string, string | number | boolean | null>;

export interface TelemetryEvent {
  at: string;
  event: string;
  props: TelemetryProps;
}

export interface NoosTelemetry {
  track(event: string, props?: TelemetryProps): void;
  recentEvents(): TelemetryEvent[];
  clear(): void;
}

const maxEvents = 100;
const ring: TelemetryEvent[] = [];

function append(entry: TelemetryEvent) {
  ring.push(entry);

  if (ring.length > maxEvents) {
    ring.shift();
  }
}

class ConsoleTelemetry implements NoosTelemetry {
  track(event: string, props?: TelemetryProps) {
    append({ at: new Date().toISOString(), event, props: props ?? {} });

    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

    if (isDev) {
      console.log(`[telemetry] ${event}`, props ?? {});
    }
  }

  recentEvents() {
    return [...ring];
  }

  clear() {
    ring.length = 0;
  }
}

export const noosTelemetry: NoosTelemetry = new ConsoleTelemetry();

function redactSensitiveValue(key: string, value: unknown) {
  const lower = key.toLowerCase();

  if (
    lower.includes('token') ||
    lower.includes('password') ||
    lower.includes('secret') ||
    lower === 'authorization'
  ) {
    return '[redacted]';
  }

  return value;
}

export function formatTelemetryEvent(entry: TelemetryEvent) {
  return `${entry.at} ${entry.event} ${JSON.stringify(entry.props, redactSensitiveValue)}`;
}
