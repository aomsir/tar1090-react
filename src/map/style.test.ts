import { describe, it, expect } from 'vitest';
import { aircraftFillColor, aircraftRotationRad } from './style';
import { Aircraft } from '@/domain/Aircraft';

describe('map style helpers', () => {
  it('derives fill color from altitude', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', altitude: 2000 }, 1);
    expect(aircraftFillColor(ac)).toBe('hsl(32.5, 88%, 53.875%)');
  });

  it('uses the unknown color when altitude is missing', () => {
    const ac = new Aircraft('a');
    expect(aircraftFillColor(ac)).toBe('hsl(0, 0%, 20%)');
  });

  it('converts track degrees to radians', () => {
    const ac = new Aircraft('a');
    ac.update({ hex: 'a', track: 180 }, 1);
    expect(aircraftRotationRad(ac)).toBeCloseTo(Math.PI, 6);
  });

  it('defaults rotation to 0 when track is missing', () => {
    expect(aircraftRotationRad(new Aircraft('a'))).toBe(0);
  });
});
