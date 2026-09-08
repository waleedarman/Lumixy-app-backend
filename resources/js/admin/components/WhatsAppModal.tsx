import { useEffect, useState } from 'react';
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  fetchWhatsAppTemplates,
  type WhatsAppTemplates,
} from '../api/whatsappTemplateService';

type WhatsAppModalProps = {
  open: boolean;
  providerName: string;
  phone: string;
  onClose: () => void;
};

const EXIT_MS = 240;

function buildWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppModal({ open, providerName, phone, onClose }: WhatsAppModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplates>(DEFAULT_WHATSAPP_TEMPLATES);
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase('enter');
      return;
    }

    if (!mounted) return;

    setPhase('exit');
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      try {
        const response = await fetchWhatsAppTemplates();
        if (!cancelled) {
          setTemplates(response);
        }
      } catch {
        if (!cancelled) {
          setTemplates(DEFAULT_WHATSAPP_TEMPLATES);
        }
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!mounted) return null;

  const overlayClass = phase === 'enter' ? 'is-entering' : 'is-exiting';
  const cardClass = phase === 'enter' ? 'is-entering' : 'is-exiting';

  return (
    <div className={`modal-overlay ${overlayClass}`} role="presentation" onClick={onClose}>
      <div
        className={`modal-card ${cardClass}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>إرسال إشعار WhatsApp</h2>
        <p>اختر قالب الرسالة لـ {providerName}</p>
        <div className="whatsapp-actions">
          <a
            className="btn btn-primary btn-block"
            href={buildWhatsAppUrl(phone, templates.activation_message)}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
          >
            إشعار تفعيل الحساب
          </a>
          <a
            className="btn btn-secondary btn-block"
            href={buildWhatsAppUrl(phone, templates.renewal_message)}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
          >
            تذكير بتجديد الاشتراك
          </a>
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
