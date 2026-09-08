import {
  IconAlertCircle,
  IconClock,
  IconUserCheck,
  IconUsers,
} from '../icons/AdminIcons';
import { KpiCard } from './KpiCard';

type DashboardStats = {
  total: number;
  active: number;
  pending: number;
  expired: number;
  expiringSoon: number;
  expiredToday: number;
};

type DashboardKpiGridProps = {
  stats: DashboardStats;
  pendingHint?: string;
};

export function DashboardKpiGrid({ stats, pendingHint }: DashboardKpiGridProps) {
  return (
    <section className="dash-kpi-grid" aria-label="مؤشرات الأداء">
      <KpiCard
        label="إجمالي المزودين"
        value={stats.total}
        description="جميع حسابات مزودي الخدمة المسجلة في المنصة."
        to="/providers"
        linkLabel="عرض المزودين"
        tone="blue"
        icon={<IconUsers size={24} />}
      />

      <KpiCard
        label="المزودون النشطون"
        value={stats.active}
        description="حسابات مفعّلة وتعمل حالياً على المنصة."
        to="/providers?filter=active"
        linkLabel="عرض النشطين"
        tone="green"
        icon={<IconUserCheck size={24} />}
      />

      <KpiCard
        label="قيد المراجعة"
        value={stats.pending}
        description={pendingHint || 'طلبات انضمام بانتظار موافقة الإدارة.'}
        to="/providers?filter=pending"
        linkLabel="مراجعة الطلبات"
        tone="orange"
        icon={<IconClock size={24} />}
      />

      <KpiCard
        label="اشتراكات تحتاج متابعة"
        value={stats.expired}
        description="اشتراكات منتهية أو قريبة من الانتهاء."
        to="/providers?filter=expired"
        linkLabel="عرض الاشتراكات"
        tone="red"
        icon={<IconAlertCircle size={24} />}
        secondary={
          <>
            <span className="dash-kpi-chip dash-kpi-chip--warning">
              ينتهي قريباً: {stats.expiringSoon.toLocaleString('ar')}
            </span>
            <span className="dash-kpi-chip dash-kpi-chip--danger">
              منتهي اليوم: {stats.expiredToday.toLocaleString('ar')}
            </span>
          </>
        }
      />
    </section>
  );
}
