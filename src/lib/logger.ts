export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogLine {
  at: string;
  module: string;
  level: LogLevel;
  message: string;
  meta?: unknown;
}

const maxLines = 500;
const ring: LogLine[] = [];

function isDev() {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}

function shouldWrite(level: LogLevel) {
  return isDev() || level === 'warn' || level === 'error';
}

function append(line: LogLine) {
  ring.push(line);

  if (ring.length > maxLines) {
    ring.shift();
  }
}

function write(level: LogLevel, module: string, message: string, meta?: unknown) {
  const line = { at: new Date().toISOString(), module, level, message, meta };
  append(line);

  if (!shouldWrite(level)) {
    return;
  }

  const prefix = `[${module}] ${message}`;

  if (level === 'error') {
    console.error(prefix, meta ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, meta ?? '');
  } else {
    console.log(prefix, meta ?? '');
  }
}

export const logger = {
  create(module: string) {
    return {
      debug: (message: string, meta?: unknown) => write('debug', module, message, meta),
      info: (message: string, meta?: unknown) => write('info', module, message, meta),
      warn: (message: string, meta?: unknown) => write('warn', module, message, meta),
      error: (message: string, meta?: unknown) => write('error', module, message, meta),
    };
  },
  lines() {
    return [...ring];
  },
  clear() {
    ring.length = 0;
  },
};
