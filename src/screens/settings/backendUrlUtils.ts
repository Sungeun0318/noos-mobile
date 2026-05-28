export type TestResult = 'idle' | 'ok' | 'fail';

export const backendUrlPresets = [
  'http://localhost:8080',
  'http://192.168.1.42:8080',
  'https://noos.example.com',
] as const;

export function normalizeDraftBackendUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

export function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?($|\/)/i.test(url.trim());
}
