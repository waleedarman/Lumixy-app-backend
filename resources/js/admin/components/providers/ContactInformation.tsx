import type { ReactNode } from 'react';
import { EmptyState } from '../EmptyState';
import {
  IconGlobe,
  IconInstagram,
  IconPhone,
  IconSend,
  IconWhatsApp,
} from '../icons/AdminIcons';
import { LtrText } from '../ui/LtrText';
import type { ProviderProfile } from '../../types';
import {
  buildEmailHref,
  buildInstagramHref,
  buildPhoneHref,
  buildWhatsAppHref,
  normalizeExternalUrl,
} from '../../utils/providerPresentation';

type ContactCardProps = {
  label: string;
  value: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
};

function ContactCard({ label, value, href, external, icon }: ContactCardProps) {
  return (
    <a
      className="provider-contact-card"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className="provider-contact-card__icon" aria-hidden>
        {icon}
      </span>
      <span className="provider-contact-card__body">
        <span className="provider-contact-card__label">{label}</span>
        <span className="provider-contact-card__value">
          <LtrText>{value}</LtrText>
        </span>
      </span>
    </a>
  );
}

function buildContactCards(provider: ProviderProfile): ContactCardProps[] {
  const cards: ContactCardProps[] = [];

  if (provider.phone?.trim()) {
    const href = buildPhoneHref(provider.phone);
    if (href) {
      cards.push({
        label: 'الهاتف',
        value: provider.phone,
        href,
        icon: <IconPhone size={18} />,
      });
    }
  }

  if (provider.email?.trim()) {
    const href = buildEmailHref(provider.email);
    if (href) {
      cards.push({
        label: 'البريد الإلكتروني',
        value: provider.email,
        href,
        icon: <IconSend size={18} />,
      });
    }
  }

  if (provider.whatsapp?.trim()) {
    const href = buildWhatsAppHref(provider.whatsapp);
    if (href) {
      cards.push({
        label: 'واتساب',
        value: provider.whatsapp,
        href,
        external: true,
        icon: <IconWhatsApp size={18} />,
      });
    }
  }

  if (provider.instagram?.trim()) {
    const href = buildInstagramHref(provider.instagram);
    if (href) {
      cards.push({
        label: 'إنستغرام',
        value: provider.instagram,
        href,
        external: true,
        icon: <IconInstagram size={18} />,
      });
    }
  }

  if (provider.website?.trim()) {
    const href = normalizeExternalUrl(provider.website);
    if (href) {
      cards.push({
        label: 'الموقع / فيسبوك',
        value: provider.website,
        href,
        external: true,
        icon: <IconGlobe size={18} />,
      });
    }
  }

  return cards;
}

type ContactInformationProps = {
  provider: ProviderProfile;
};

export function ContactInformation({ provider }: ContactInformationProps) {
  const cards = buildContactCards(provider);

  if (cards.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات تواصل"
        description="لم يضف المزود أي وسيلة تواصل بعد."
      />
    );
  }

  return (
    <div className="provider-contact-grid">
      {cards.map((card) => (
        <ContactCard key={card.label} {...card} />
      ))}
    </div>
  );
}
