import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import i18n from './index';
import type { SupportedLanguage } from './types';

export async function setTestLanguage(language: SupportedLanguage = 'en'): Promise<void> {
  await i18n.changeLanguage(language);
}

export async function renderWithI18n(
  ui: ReactElement,
  options?: RenderOptions & { language?: SupportedLanguage },
) {
  await setTestLanguage(options?.language ?? 'en');
  return render(ui, options);
}
