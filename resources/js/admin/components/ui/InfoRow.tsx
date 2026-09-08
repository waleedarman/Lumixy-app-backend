import type { ReactNode } from 'react';

type InfoRowProps = {
  label: string;
  value: ReactNode;
  mono?: boolean;
};

export function InfoRow({ label, value, mono = false }: InfoRowProps) {
  return (
    <div className="ui-info-row">
      <span className="ui-info-row__label">{label}</span>
      <span className={`ui-info-row__value ${mono ? 'ui-info-row__value--mono' : ''}`.trim()}>
        {value}
      </span>
    </div>
  );
}
