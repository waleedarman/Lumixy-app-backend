import type { ReactNode } from 'react';
import { Button } from './Button';
import { LtrText } from './LtrText';

type ContactRowProps = {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  onCopy?: () => void;
  external?: boolean;
};

export function ContactRow({ icon, label, value, href, onCopy, external }: ContactRowProps) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className="ui-contact-row">
      <div className="ui-contact-row__icon">{icon}</div>
      <div className="ui-contact-row__body">
        <span className="ui-contact-row__label">{label}</span>
        {hasValue ? (
          <span className="ui-contact-row__value">
            {href ? (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
              >
                <LtrText>{value}</LtrText>
              </a>
            ) : (
              <LtrText>{value}</LtrText>
            )}
          </span>
        ) : (
          <span className="ui-contact-row__empty">غير متوفر</span>
        )}
      </div>
      {hasValue ? (
        <div className="ui-contact-row__actions">
          {onCopy ? (
            <Button variant="ghost" size="sm" onClick={onCopy}>
              نسخ
            </Button>
          ) : null}
          {href ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(href, external ? '_blank' : '_self')}
            >
              {external ? 'فتح' : 'اتصال'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
