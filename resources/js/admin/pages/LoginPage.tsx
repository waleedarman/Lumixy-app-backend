import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLogo } from '../components/ui/AppLogo';
import { getFriendlyLoginErrorMessage } from '../utils/loginErrors';
import { normalizeLoginEmail, validateLoginInput } from '../utils/loginValidation';

type SetupStatus = {
  has_active_admins: boolean;
  active_admin_count: number;
  total_users: number;
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  const from = (location.state as { from?: string } | null)?.from || 'dashboard';

  useEffect(() => {
    void (async () => {
      try {
        const status = await apiRequest<SetupStatus>('/admin/setup-status');
        setSetupStatus(status);
      } catch {
        setSetupStatus(null);
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationErrors = validateLoginInput(email, password);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      await login(normalizeLoginEmail(email), password);
      navigate(from, { replace: true });
    } catch (submitError) {
      if (setupStatus && !setupStatus.has_active_admins) {
        setError(
          'لا يوجد أي حساب مشرف (Admin) في قاعدة البيانات المحلية. أنشئ حساباً عبر: php artisan admin:create your@email.com --password="YourPass123!" --super',
        );
      } else {
        setError(getFriendlyLoginErrorMessage(submitError));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-panel">
        <header className="auth-panel__head">
          <AppLogo size="lg" className="auth-panel__logo" />
          <div className="auth-panel__titles">
            <h1>Lumixy</h1>
            <p>لوحة تحكم المشرف</p>
          </div>
        </header>

        {setupStatus && !setupStatus.has_active_admins ? (
          <div className="alert alert-warning auth-panel__alert">
            <strong>لا يوجد مشرف في قاعدة البيانات المحلية.</strong>
            <p className="auth-panel__setup-note">
              أنشئ حساباً من PowerShell:
              <code className="auth-panel__setup-code">
                php artisan admin:create admin@lumixy.test --password=&quot;LumixyAdmin123!&quot; --super
              </code>
            </p>
          </div>
        ) : null}

        <form className="auth-panel__form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field auth-field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
              placeholder="admin@example.com"
            />
            {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
          </label>

          <label className="field auth-field">
            <span>كلمة المرور</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
          </label>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary btn-block auth-panel__submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="auth-panel__footnote">حساب مشرف فقط</p>
      </div>
    </AuthLayout>
  );
}
