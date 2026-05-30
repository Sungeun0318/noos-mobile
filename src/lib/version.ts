function parseSemver(version: string) {
  const [major = '0', minor = '0', patch = '0'] = version.trim().split('.');

  return [major, minor, patch].map((part) => {
    const value = Number.parseInt(part, 10);

    return Number.isNaN(value) ? 0 : value;
  });
}

export function compareSemver(a: string, b: string) {
  const left = parseSemver(a);
  const right = parseSemver(b);

  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] > right[index] ? 1 : -1;
    }
  }

  return 0;
}

export function isVersionBelowMinimum(appVersion: string, minAppVersion: string | null | undefined) {
  if (!minAppVersion) {
    return false;
  }

  return compareSemver(appVersion, minAppVersion) < 0;
}
