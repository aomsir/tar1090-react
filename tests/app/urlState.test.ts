import { describe, it, expect } from 'vitest';
import { parseQuery, buildQuery } from '@/app/urlState';

describe('urlState', () => {
  it('parses ?icao= from a query string', () => {
    expect(parseQuery('?icao=781860')).toEqual({ icao: '781860', mode: 'live' });
  });

  it('returns null icao when absent', () => {
    expect(parseQuery('')).toEqual({ icao: null, mode: 'live' });
    expect(parseQuery('?foo=bar')).toEqual({ icao: null, mode: 'live' });
  });

  it('builds a query string with icao', () => {
    expect(buildQuery({ icao: '781860', mode: 'live' })).toBe('?icao=781860');
  });

  it('builds an empty string when icao is null', () => {
    expect(buildQuery({ icao: null, mode: 'live' })).toBe('');
  });
});

describe('mode parameter', () => {
  it('parseQuery reads mode=history', () => {
    expect(parseQuery('?mode=history').mode).toBe('history');
  });

  it('parseQuery defaults mode to live', () => {
    expect(parseQuery('').mode).toBe('live');
  });

  it('buildQuery includes mode=history', () => {
    expect(buildQuery({ icao: null, mode: 'history' })).toBe('?mode=history');
  });

  it('buildQuery omits mode when live', () => {
    expect(buildQuery({ icao: null, mode: 'live' })).toBe('');
  });

  it('buildQuery combines icao and mode', () => {
    const q = buildQuery({ icao: 'abc123', mode: 'history' });
    expect(q).toContain('icao=abc123');
    expect(q).toContain('mode=history');
  });
});
