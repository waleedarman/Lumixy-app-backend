import type { FormEvent } from 'react';
import { FormField } from '../ui/FormField';
import { Button } from '../ui/Button';
import { FormActionBar } from './FormActionBar';

type ContactSettingsSectionProps = {
  whatsappNumber: string;
  phoneNumber: string;
  instagramUsername: string;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  onWhatsappNumberChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onInstagramUsernameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function ContactSettingsSection({
  whatsappNumber,
  phoneNumber,
  instagramUsername,
  loading,
  initialLoading,
  error,
  onWhatsappNumberChange,
  onPhoneNumberChange,
  onInstagramUsernameChange,
  onSubmit,
}: ContactSettingsSectionProps) {
  return (
    <section className="account-settings-section" aria-labelledby="account-contact-title">
      <header className="account-settings-section__header">
        <h2 id="account-contact-title" className="account-settings-section__title">
          التواصل
        </h2>
        <p className="account-settings-section__desc">
          تحديث معلومات التواصل التي تظهر في صفحة «تواصل معنا» داخل التطبيق — مثل واتساب، الهاتف، وانستغرام.
        </p>
      </header>

      <div className="account-settings-section__divider" aria-hidden />

      {initialLoading ? (
        <p className="account-settings-section__desc">جاري تحميل معلومات التواصل...</p>
      ) : (
        <form className="account-settings-form" onSubmit={onSubmit} noValidate>
          <div className="account-settings-form__grid account-settings-form__grid--2">
            <FormField
              label="رقم واتساب"
              value={whatsappNumber}
              onChange={(event) => onWhatsappNumberChange(event.target.value)}
              required
              placeholder="+970599000000"
              hint="أدخل الرقم مع رمز الدولة، مثل +970..."
              autoComplete="tel"
            />
            <FormField
              label="رقم الهاتف"
              value={phoneNumber}
              onChange={(event) => onPhoneNumberChange(event.target.value)}
              required
              placeholder="0599000000"
              hint="يُستخدم لزر الاتصال داخل التطبيق"
              autoComplete="tel"
            />
            <FormField
              label="اسم مستخدم انستغرام"
              value={instagramUsername}
              onChange={(event) => onInstagramUsernameChange(event.target.value)}
              required
              placeholder="lumixy.app"
              hint="بدون @ في البداية"
              autoComplete="off"
            />
          </div>

          {error ? <div className="account-settings-form__alert alert alert-error">{error}</div> : null}

          <FormActionBar>
            <Button type="submit" variant="primary" loading={loading} disabled={loading || initialLoading}>
              حفظ التغييرات
            </Button>
          </FormActionBar>
        </form>
      )}
    </section>
  );
}
