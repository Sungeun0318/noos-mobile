import { describe, expect, it } from 'vitest';

import { PLANET_COLORS, type PlanetId } from '@/theme';

const planetIds: PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

describe('planet theme tokens', () => {
  it('defines all nine planet palettes', () => {
    expect(Object.keys(PLANET_COLORS).sort()).toEqual([...planetIds].sort());
  });

  it('defines primary, secondary, and accent colors for every planet', () => {
    for (const id of planetIds) {
      expect(PLANET_COLORS[id]).toEqual({
        primary: expect.any(String),
        secondary: expect.any(String),
        accent: expect.any(String),
      });
    }
  });
});
