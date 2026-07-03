import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile, isMobileViewport, MOBILE_MEDIA_QUERY } from '@/app/useIsMobile';

type ChangeListener = (e: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  let matches = initialMatches;
  const mql = {
    get matches() {
      return matches;
    },
    media: MOBILE_MEDIA_QUERY,
    addEventListener: (_type: string, cb: ChangeListener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: ChangeListener) => listeners.delete(cb),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
    listeners,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isMobileViewport', () => {
  it('returns false when matchMedia is unavailable (jsdom default)', () => {
    expect(isMobileViewport()).toBe(false);
  });

  it('returns matchMedia result when available', () => {
    stubMatchMedia(true);
    expect(isMobileViewport()).toBe(true);
  });
});

describe('useIsMobile', () => {
  it('returns false when matchMedia is unavailable', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns initial match state', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => media.setMatches(true));
    expect(result.current).toBe(true);
  });

  it('removes the change listener on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
