import { Link } from 'react-router-dom';
import type { ProviderProfile } from '../../types';
import { EmptyState } from '../EmptyState';
import { IconArrowLeft } from '../icons/AdminIcons';
import { ProviderRow } from './ProviderRow';

type LatestProvidersSectionProps = {
  providers: ProviderProfile[];
};

export function LatestProvidersSection({ providers }: LatestProvidersSectionProps) {
  return (
    <section className="dash-latest" aria-labelledby="dash-latest-title">
      <header className="dash-latest__header">
        <div>
          <h2 id="dash-latest-title" className="dash-latest__title">
            أحدث المزودين
          </h2>
          <p className="dash-latest__subtitle">
            آخر الحسابات التي انضمت إلى المنصة
          </p>
        </div>
        <Link to="/providers" className="btn btn-secondary btn-sm dash-latest__all">
          عرض الكل
          <IconArrowLeft size={14} aria-hidden />
        </Link>
      </header>

      {providers.length === 0 ? (
        <EmptyState title="لا يوجد مزودون بعد." />
      ) : (
        <div className="dash-latest__table-wrap">
          <table className="dash-provider-table">
            <thead>
              <tr>
                <th>المزود</th>
                <th>التصنيف والموقع</th>
                <th>حالة الحساب</th>
                <th>الاشتراك</th>
                <th>تاريخ الانضمام</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <ProviderRow key={provider.id} provider={provider} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
