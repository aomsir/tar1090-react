import { describe, it, expect, vi } from 'vitest'
import { withCacheBust, apiUrl } from '@/config/api'

describe('api config', () => {
  it('appends a cache-bust _ param using epoch ms', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1781626493693)
    expect(withCacheBust('/data/aircraft.json')).toBe('/data/aircraft.json?_=1781626493693')
  })

  it('preserves existing query params', () => {
    vi.spyOn(Date, 'now').mockReturnValue(42)
    expect(withCacheBust('/data/x.json?a=1')).toBe('/data/x.json?a=1&_=42')
  })

  it('apiUrl joins base and path', () => {
    expect(apiUrl('/data/receiver.json', 'https://example.com')).toBe(
      'https://example.com/data/receiver.json',
    )
  })

  it('apiUrl returns path unchanged when base is empty', () => {
    expect(apiUrl('/data/receiver.json', '')).toBe('/data/receiver.json')
  })

  it('apiUrl strips a trailing slash from base', () => {
    expect(apiUrl('/data/x.json', 'https://example.com/')).toBe(
      'https://example.com/data/x.json',
    )
  })
})
