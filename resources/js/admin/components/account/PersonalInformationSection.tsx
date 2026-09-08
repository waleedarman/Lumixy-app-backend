import type { FormEvent } from 'react';
import { FormField } from '../ui/FormField';
import { Button } from '../ui/Button';
import { FormActionBar } from './FormActionBar';

type PersonalInformationSectionProps = {
  fullName: string;
  email: string;
  loading: boolean;
  error: string | null;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function PersonalInformationSection({
  fullName,
  email,
  loading,
  error,
  onFullNameChange,
  onEmailChange,
  onSubmit,
}: PersonalInformationSectionProps) {
  return (
    <section className="account-settings-section" aria-labelledby="account-personal-title">
      <header className="account-settings-section__header">
        <h2 id="account-personal-title" className="account-settings-section__title">
          المعلومات الشخصية
        </h2>
        <p className="account-settings-section__desc">
          تحديث الاسم والبريد الإلكتروني المرتبطين بالحساب.
        </p>
      </header>

      <div className="account-settings-section__divider" aria-hidden />

      <form className="account-settings-form" onSubmit={onSubmit} noValidate>
        <div className="account-settings-form__grid account-settings-form__grid--2">
          <FormField
            label="الاسم الكامل"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            required
            autoComplete="name"
          />
          <FormField
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {error ? <div className="account-settings-form__alert alert alert-error">{error}</div> : null}

        <FormActionBar>
          <Button type="submit" variant="primary" loading={loading} disabled={loading}>
            حفظ التغييرات
          </Button>
        </FormActionBar>
      </form>
    </section>
  );
}
