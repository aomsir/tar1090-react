import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/ui/LoginPage/LoginPage';
import { renderWithI18n } from '@/i18n/testUtils';

describe('LoginPage', () => {
  beforeEach(() => {
    document.cookie = 'tar1090_auth=; max-age=0; path=/';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Stub window.location with a controllable `href` setter.
   * Uses vi.stubGlobal for per-test isolation (restored automatically).
   */
  function stubLocation(overrides: { pathname?: string; search?: string } = {}) {
    const hrefSpy = vi.fn();
    vi.stubGlobal('location', {
      href: '',
      pathname: window.location.pathname,
      search: window.location.search,
      set href(v: string) {
        hrefSpy(v);
      },
      ...overrides,
    });
    return hrefSpy;
  }

  it('renders password input and submit button', async () => {
    await renderWithI18n(<LoginPage />, { language: 'en' });
    expect(screen.getByText('tar1090')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders in Chinese', async () => {
    await renderWithI18n(<LoginPage />, { language: 'zh-CN' });
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('disables submit when password is empty', async () => {
    await renderWithI18n(<LoginPage />, { language: 'en' });
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
  });

  it('sets cookie and redirects on successful login', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
    const hrefSpy = stubLocation();

    await renderWithI18n(<LoginPage />, { language: 'en' });
    const input = screen.getByPlaceholderText('Enter password');
    await user.type(input, 'mypassword');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(document.cookie).toContain('tar1090_auth=mypassword');
      expect(hrefSpy).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on failed login and clears input', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Unauthorized', { status: 401 })),
    );

    await renderWithI18n(<LoginPage />, { language: 'en' });
    const input = screen.getByPlaceholderText('Enter password');
    await user.type(input, 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    });
    expect(input).toHaveValue('');
    expect(document.cookie).not.toContain('tar1090_auth=wrongpass');
  });

  it('shows network error on fetch exception', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network');
      }),
    );

    await renderWithI18n(<LoginPage />, { language: 'en' });
    const input = screen.getByPlaceholderText('Enter password');
    await user.type(input, 'test');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Network error, please try again')).toBeInTheDocument();
    });
    expect(document.cookie).not.toContain('tar1090_auth=test');
    expect(input).toHaveValue('');
  });

  it('submits on Enter key', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
    const hrefSpy = stubLocation();

    await renderWithI18n(<LoginPage />, { language: 'en' });
    const input = screen.getByPlaceholderText('Enter password');
    await user.type(input, 'mypassword{Enter}');

    await waitFor(() => {
      expect(hrefSpy).toHaveBeenCalledWith('/');
    });
  });

  it('handles token from URL search params', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
    const hrefSpy = stubLocation({ pathname: '/login.html', search: '?token=tk_abc123' });
    const replaceSpy = vi.spyOn(history, 'replaceState');

    await renderWithI18n(<LoginPage />, { language: 'en' });

    await waitFor(() => {
      expect(document.cookie).toContain('tar1090_auth=tk_abc123');
      expect(hrefSpy).toHaveBeenCalledWith('/');
      expect(replaceSpy).toHaveBeenCalled();
    });
  });

  it('shows expired error when token is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Unauthorized', { status: 401 })),
    );
    stubLocation({
      pathname: '/login.html',
      search: '?token=tk_expired',
    });
    vi.spyOn(history, 'replaceState').mockImplementation(() => {});

    await renderWithI18n(<LoginPage />, { language: 'en' });

    await waitFor(() => {
      expect(screen.getByText('Link expired, please enter password')).toBeInTheDocument();
    });
  });
});
