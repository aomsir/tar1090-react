import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField, Input, FieldError, Spinner } from '@heroui/react';
import { Radar } from 'lucide-react';

const COOKIE_MAX_AGE = 604800; // 7 days

function setAuthCookie(value: string): void {
  document.cookie = `tar1090_auth=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

function clearAuthCookie(): void {
  document.cookie = 'tar1090_auth=; max-age=0; path=/';
}

async function verifyAuth(): Promise<boolean> {
  const res = await fetch('/data/receiver.json');
  return res.ok;
}

export function LoginPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle ?token= in URL — auto-login attempt before showing the form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    // Clean URL immediately
    params.delete('token');
    const clean = params.toString();
    const url = window.location.pathname + (clean ? `?${clean}` : '');
    history.replaceState(null, '', url);

    // Attempt token login. setState calls live inside the async callback
    // (after the first await) so they don't run synchronously in the effect
    // body, which would trigger cascading renders.
    let active = true;
    setAuthCookie(token);
    (async () => {
      await Promise.resolve();
      if (!active) return;
      setPending(true);
      try {
        const ok = await verifyAuth();
        if (!active) return;
        if (ok) {
          window.location.href = '/';
        } else {
          clearAuthCookie();
          setError(t('auth.error.expired'));
          setPending(false);
        }
      } catch {
        if (!active) return;
        clearAuthCookie();
        setError(t('auth.error.network'));
        setPending(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    const trimmed = password.trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);
    setAuthCookie(trimmed);

    try {
      const ok = await verifyAuth();
      if (ok) {
        window.location.href = '/';
      } else {
        clearAuthCookie();
        setError(t('auth.error.wrong'));
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      clearAuthCookie();
      setError(t('auth.error.network'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1622]">
      {/* Radar range rings — extend to screen edges */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 50% 50%, rgba(56,189,248,0.06) 0%, transparent 60%)',
            ...[80, 160, 240, 320, 400, 480, 560, 640].map(
              (r) =>
                `radial-gradient(circle at 50% 50%, transparent ${r - 1}px, rgba(56,189,248,0.035) ${r}px, transparent ${r + 2}px)`,
            ),
            'linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(56,189,248,0.05) 50%, transparent calc(50% + 0.5px))',
            'linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(56,189,248,0.05) 50%, transparent calc(50% + 0.5px))',
          ].join(', '),
        }}
      />

      {/* Dot grid spanning the full background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(56,189,248,0.25) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.04,
        }}
      />

      {/* Slow radar sweep */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{
          width: '150vmax',
          height: '150vmax',
          borderRadius: '50%',
          background:
            'conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.04) 15deg, transparent 50deg)',
          animation: 'spin 10s linear infinite',
        }}
      />

      {/* Corner readouts */}
      <span
        className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] tracking-widest text-sky-500/20"
        aria-hidden="true"
      >
        ADS-B 1090 MHz
      </span>
      <span
        className="pointer-events-none absolute bottom-5 right-5 font-mono text-[10px] tracking-widest text-sky-500/20"
        aria-hidden="true"
      >
        MODE-S
      </span>

      {/* Login card */}
      <div className="glass relative z-10 mx-4 w-full max-w-sm border-t-sky-500/20 p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Radar className="h-6 w-6 text-sky-400/50" strokeWidth={1.5} />
          <h1 className="text-xl font-semibold tracking-[0.2em] text-white">tar1090</h1>
          <div className="h-px w-10 bg-sky-400/20" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <TextField
            name="password"
            type="password"
            isInvalid={!!error}
            value={password}
            onChange={setPassword}
            autoFocus
          >
            <Input ref={inputRef} placeholder={t('auth.passwordPlaceholder')} />
            {error && <FieldError>{error}</FieldError>}
          </TextField>
          <Button
            type="submit"
            fullWidth
            isPending={pending}
            isDisabled={!password.trim() && !pending}
            className="mt-5"
          >
            {({ isPending: p }) => (
              <>
                {p && <Spinner color="current" size="sm" />}
                {t('auth.submit')}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
