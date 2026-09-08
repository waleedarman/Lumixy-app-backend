import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initThemeFromStorage } from './theme/theme';
import './admin.css';

function getAdminBasename(): string {
  const configured = document.querySelector('meta[name="admin-base-path"]')?.getAttribute('content')?.trim();

  if (configured) {
    try {
      return new URL(configured).pathname.replace(/\/+$/, '') || '/admin';
    } catch {
      return configured.replace(/\/+$/, '') || '/admin';
    }
  }

  const path = window.location.pathname;
  const adminIndex = path.indexOf('/admin');
  if (adminIndex >= 0) {
    return path.slice(0, adminIndex + '/admin'.length);
  }

  return '/admin';
}

const rootElement = document.getElementById('admin-root');

if (rootElement) {
  initThemeFromStorage();

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename={getAdminBasename()}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  document.body.innerHTML =
    '<div style="padding:24px;font-family:Cairo,sans-serif;direction:rtl">تعذر تحميل لوحة التحكم.</div>';
}
