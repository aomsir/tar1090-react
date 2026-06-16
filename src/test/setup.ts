import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Default fallback for render tests that do not explicitly mock fetch.
// Tests that assert network behavior should override fetch themselves.
if (!('fetch' in globalThis) || true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}
