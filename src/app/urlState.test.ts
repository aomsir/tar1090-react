import { describe, it, expect } from 'vitest';
import { parseQuery, buildQuery } from './urlState';

describe('urlState', () => {
  it('parses ?icao= from a query string', () => {
    expect(parseQuery('?icao=781860')).toEqual({ icao: '781860' });
  });

  it('returns null icao when absent', () => {
    expect(parseQuery('')).toEqual({ icao: null });
    expect(parseQuery('?foo=bar')).toEqual({ icao: null });
  });

  it('builds a query string with icao', () => {
    expect(buildQuery({ icao: '781860' })).toBe('?icao=781860');
  });

  it('builds an empty string when icao is null', () => {
    expect(buildQuery({ icao: null })).toBe('');
  });
});
