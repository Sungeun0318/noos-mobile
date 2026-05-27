export type TelemetryProps = Record<string, string | number | boolean | null>;

export interface NoosTelemetry {
  track(event: string, props?: TelemetryProps): void;
}

class ConsoleTelemetry implements NoosTelemetry {
  track(event: string, props?: TelemetryProps) {
    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

    if (isDev) {
      console.log(`[telemetry] ${event}`, props ?? {});
    }
  }
}

export const noosTelemetry: NoosTelemetry = new ConsoleTelemetry();
