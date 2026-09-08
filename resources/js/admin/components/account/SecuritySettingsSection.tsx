import type { FormEvent } from 'react';
import { PasswordField } from '../ui/PasswordField';
import { Button } from '../ui/Button';
import { FormActionBar } from './FormActionBar';

type SecuritySettingsSectionProps = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
  loading: boolean;
  error: string | null;
  onCurrentPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function SecuritySettingsSection({
  currentPassword,
  password,
  passwordConfirmation,
  loading,
  error,
  onCurrentPasswordChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onSubmit,
}: SecuritySettingsSectionProps) {
  return (
    <section className="account-settings-section" aria-labelledby="account-security-title">
      <header className="account-settings-section__header">
        <h2 id="account-security-title" className="account-settings-section__title">
          الأمان وكلمة المرور
        </h2>
        <p className="account-settings-section__desc">
          تحديث كلمة المرور وحماية حساب المشرف.
        </p>
      </header>

      <div className="account-settings-section__divider" aria-hidden />

      <form className="account-settings-form account-settings-form--narrow" onSubmit={onSubmit} noValidate>
        <PasswordField
          label="كلمة المرور الحالية"
          value={currentPassword}
          onChange={onCurrentPasswordChange}
          autoComplete="current-password"
        />
        <PasswordField
          label="كلمة المرور الجديدة"
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
        />
        <p className="account-settings-form__hint">
          استخدم 8 أحرف على الأقل، ويفضل الجمع بين الحروف والأرقام.
        </p>
        <PasswordField
          label="تأكيد كلمة المرور الجديدة"
          value={passwordConfirmation}
          onChange={onPasswordConfirmationChange}
          autoComplete="new-password"
        />

        {error ? <div className="account-settings-form__alert alert alert-error">{error}</div> : null}

        <FormActionBar>
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>
            تحديث كلمة المرور
          </Button>
        </FormActionBar>
      </form>
    </section>
  );
}
