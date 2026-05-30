import type { ImageSourcePropType } from 'react-native';

import type { PlanetId } from './planets';

declare const require: (path: string) => ImageSourcePropType;

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const isVitest = env?.VITEST === 'true';

function testAsset(name: PlanetId): ImageSourcePropType {
  return { uri: `test-planet-${name}` };
}

export const PLANET_IMAGES: Record<PlanetId, ImageSourcePropType> = {
  earth: isVitest ? testAsset('earth') : require('../../assets/planets/earth.png'),
  jupiter: isVitest ? testAsset('jupiter') : require('../../assets/planets/jupiter.png'),
  mars: isVitest ? testAsset('mars') : require('../../assets/planets/mars.png'),
  mercury: isVitest ? testAsset('mercury') : require('../../assets/planets/mercury.png'),
  neptune: isVitest ? testAsset('neptune') : require('../../assets/planets/neptune.png'),
  pluto: isVitest ? testAsset('pluto') : require('../../assets/planets/pluto.png'),
  saturn: isVitest ? testAsset('saturn') : require('../../assets/planets/saturn.png'),
  uranus: isVitest ? testAsset('uranus') : require('../../assets/planets/uranus.png'),
  venus: isVitest ? testAsset('venus') : require('../../assets/planets/venus.png'),
};
