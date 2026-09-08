import type { FormEvent } from 'react';
import { FormField } from '../ui/FormField';
import { Button } from '../ui/Button';
import { FormActionBar } from './FormActionBar';

type WhatsAppMessagesSectionProps = {
  activationMessage: string;
  renewalMessage: string;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  onActivationMessageChange: (value: string) => void;
  onRenewalMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function WhatsAppMessagesSection({
  activationMessage,
  renewalMessage,
  loading,
  initialLoading,
  error,
  onActivationMessageChange,
  onRenewalMessageChange,
  onSubmit,
}: WhatsAppMessagesSectionProps) {
  return (
    <section className="account-settings-section" aria-labelledby="account-whatsapp-title">
      <header className="account-settings-section__header">
        <h2 id="account-whatsapp-title" className="account-settings-section__title">
          رسائل واتساب
        </h2>
        <p className="account-settings-section__desc">
          حدّد نص الرسائل التي تُرسل لمزودي الخدمات عند الضغط على زر واتساب من لوحة الإدارة.
        </p>
      </header>

      <div className="account-settings-section__divider" aria-hidden />

      {initialLoading ? (
        <p className="account-settings-section__desc">جاري تحميل رسائل واتساب...</p>
      ) : (
        <form className="account-settings-form account-settings-form--narrow" onSubmit={onSubmit} noValidate>
          <FormField
            as="textarea"
            label="رسالة تفعيل الحساب"
            value={activationMessage}
            onChange={(event) => onActivationMessageChange(event.target.value)}
            required
            rows={4}
            hint="تُستخدم عند إرسال إشعار تفعيل حساب مزود خدمة جديد."
          />
          <FormField
            as="textarea"
            label="رسالة تذكير بتجديد الاشتراك"
            value={renewalMessage}
            onChange={(event) => onRenewalMessageChange(event.target.value)}
            required
            rows={4}
            hint="تُستخدم عند تذكير المزود باقتراب انتهاء اشتراكه."
          />

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
