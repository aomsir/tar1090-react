import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@/i18n';
import { LoginPage } from '@/ui/LoginPage/LoginPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
);
