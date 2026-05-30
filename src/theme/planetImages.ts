import type { ImageSourcePropType } from 'react-native';

import earth from '../../assets/planets/earth.png';
import jupiter from '../../assets/planets/jupiter.png';
import mars from '../../assets/planets/mars.png';
import mercury from '../../assets/planets/mercury.png';
import neptune from '../../assets/planets/neptune.png';
import pluto from '../../assets/planets/pluto.png';
import saturn from '../../assets/planets/saturn.png';
import uranus from '../../assets/planets/uranus.png';
import venus from '../../assets/planets/venus.png';

import type { PlanetId } from './planets';

export const PLANET_IMAGES: Record<PlanetId, ImageSourcePropType> = {
  earth,
  jupiter,
  mars,
  mercury,
  neptune,
  pluto,
  saturn,
  uranus,
  venus,
};
