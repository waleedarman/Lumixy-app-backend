import { useToast } from '../feedback/ToastProvider';
import { animateListRemoval } from '../utils/animatedRemoval';
import { compareSubscriptionUrgency, matchesExpiringSoonFilter } from '../utils/subscription';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  approveProvider,
  deleteProvider,
  CACHE_KEYS,
  fetchAdminCategories,
  fetchAdminCities,
  fetchAdminProviders,
  fetchAdminProvidersPage,
  prefetchAdminProvidersPage,
  renewProviderSubscription,
  suspendProvider,
  updateProviderSubscription,
} from '../api/adminService';
import { ApiError } from '../api/client';
import { flattenCities } from '../api/mappers';
import { readWarmCache } from '../hooks/useStaleResource';
import { writePageSnapshot } from '../utils/pageSnapshot';
import { ActiveFilterChips } from '../components/providers/ActiveFilterChips';
import type { ProviderFilterDraft } from '../components/providers/ProviderFilterDrawer';
import { ProviderFilterDrawer } from '../components/providers/ProviderFilterDrawer';
import {
  ProviderManagementToolbar,
  type ProviderSort,
} from '../components/providers/ProviderManagementToolbar';
import { ProviderPageHeader } from '../components/providers/ProviderPageHeader';
import { ProviderStatusTabs } from '../components/providers/ProviderStatusTabs';
import { ProvidersTable } from '../components/providers/ProvidersTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/feedback/Skeleton';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useAdminSync } from '../hooks/useAdminSync';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AppCategory, AppCityOption, ProviderFilter, ProviderProfile } from '../types';
import { getCityDescendantIds } from '../utils/cityTree';
import {
  matchesProviderFilter,
  matchesProviderSearch,
  matchesSubscriptionDrawerFilter,
  PROVIDER_STATUS_TABS,
  type SubscriptionDrawerFilter,
} from '../utils/providerFilters';

import { LIST_PAGE_SIZE } from '../constants/pagination';

function createFilterDraft(
  values: Partial<ProviderFilterDraft> = {},
): ProviderFilterDraft {
  return {
    cityId: '',
    categoryId: '',
    subService: '',
    featuredOnly: false,
    accountStatus: 'all',
    subscriptionStatus: 'all',
    ...values,
  };
}

function accountStatusFromFilter(filter: ProviderFilter): ProviderFilter | 'all' {
  if (filter === 'pending' || filter === 'active' || filter === 'deactivated') {
    return filter;
  }
  return 'all';
}

function subscriptionStatusFromFilter(
  filter: ProviderFilter,
  subscriptionFilter: SubscriptionDrawerFilter,
): SubscriptionDrawerFilter {
  if (subscriptionFilter !== 'all') return subscriptionFilter;
  if (filter === 'expired') return 'expired';
  if (filter === 'expiringSoon') return 'expiringSoon';
  return 'all';
}

function needsFullProviderDataset(params: {
  search: string;
  cityId: string;
  categoryId: string;
  subService: string;
  featuredOnly: boolean;
  subscriptionFilter: SubscriptionDrawerFilter;
  filter: ProviderFilter;
}): boolean {
  return Boolean(
    params.search.trim() ||
      params.cityId ||
      params.categoryId ||
      params.subService ||
      params.featuredOnly ||
      params.subscriptionFilter !== 'all' ||
      params.filter !== 'all',
  );
}

export function ProvidersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState<ProviderProfile[]>(() => {
    const cached = readWarmCache<{ providers: ProviderProfile[] }>(
      `${CACHE_KEYS.providersPage}:1:${LIST_PAGE_SIZE}`,
      `providers-page-1-${LIST_PAGE_SIZE}`,
    );
    return cached?.providers ?? [];
  });
  const [categories, setCategories] = useState<AppCategory[]>(
    () => readWarmCache<AppCategory[]>(CACHE_KEYS.categories, 'categories') ?? [],
  );
  const [cities, setCities] = useState<AppCityOption[]>(
    () => readWarmCache<AppCityOption[]>(CACHE_KEYS.cities, 'cities') ?? [],
  );
  const [metaLoading, setMetaLoading] = useState(
    () => !readWarmCache(CACHE_KEYS.categories, 'categories') || !readWarmCache(CACHE_KEYS.cities, 'cities'),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(
    () =>
      !readWarmCache<{ providers: ProviderProfile[] }>(
        `${CACHE_KEYS.providersPage}:1:${LIST_PAGE_SIZE}`,
        `providers-page-1-${LIST_PAGE_SIZE}`,
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subService, setSubService] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionDrawerFilter>('all');
  const [filter, setFilter] = useState<ProviderFilter>('all');
  const [sort, setSort] = useState<ProviderSort>('featured');
  const [page, setPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'deactivate'; id: string } | null>(null);
  const [whatsappProvider, setWhatsappProvider] = useState<ProviderProfile | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<ProviderFilterDraft>(() => createFilterDraft());
  const toast = useToast();

  const debouncedSearch = useDebouncedValue(search, 300);

  const usesFullDataset = useMemo(
    () =>
      needsFullProviderDataset({
        search: debouncedSearch,
        cityId,
        categoryId,
        subService,
        featuredOnly,
        subscriptionFilter,
        filter,
      }),
    [debouncedSearch, cityId, categoryId, subService, featuredOnly, subscriptionFilter, filter],
  );

  const loadMeta = useCallback(async (force = false) => {
    const hasCache = Boolean(
      readWarmCache(CACHE_KEYS.categories, 'categories') && readWarmCache(CACHE_KEYS.cities, 'cities'),
    );
    if (!hasCache) setMetaLoading(true);

    try {
      const [categoryData, cityData] = await Promise.all([
        fetchAdminCategories(force ? { force: true } : undefined),
        fetchAdminCities(force ? { force: true } : undefined),
      ]);
      setCategories(categoryData);
      setCities(cityData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات التصفية.');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadProviders = useCallback(
    async (force = false) => {
      const pageCacheKey = `${CACHE_KEYS.providersPage}:${page}:${LIST_PAGE_SIZE}`;
      const hasCache = Boolean(readWarmCache(pageCacheKey, `providers-page-${page}-${LIST_PAGE_SIZE}`));
      if (!hasCache) setProvidersLoading(true);
      setError(null);

      try {
        if (usesFullDataset) {
          const providerData = await fetchAdminProviders(force ? { force: true } : undefined);
          setProviders(providerData);
          setServerTotal(providerData.length);
          return;
        }

        const response = await fetchAdminProvidersPage(page, {
          force: force,
          perPage: LIST_PAGE_SIZE,
        });
        setProviders(response.providers);
        setServerTotal(response.total);
        writePageSnapshot(`providers-page-${page}-${LIST_PAGE_SIZE}`, response);
        if (page < response.lastPage) {
          prefetchAdminProvidersPage(page + 1, LIST_PAGE_SIZE);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل المزودين.');
      } finally {
        setProvidersLoading(false);
      }
    },
    [page, usesFullDataset],
  );

  useEffect(() => {
    void loadMeta(false);
  }, [loadMeta]);

  useEffect(() => {
    void loadProviders(false);
  }, [loadProviders]);

  useAdminSync(['providers', 'dashboard'], () => {
    void loadMeta(true);
    void loadProviders(true);
  });

  useRefreshOnFocus(() => {
    void loadMeta(true);
    void loadProviders(true);
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadMeta(true), loadProviders(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadMeta, loadProviders]);

  useEffect(() => {
    const paramFilter = searchParams.get('filter') as ProviderFilter | null;
    if (paramFilter && PROVIDER_STATUS_TABS.some((item) => item.key === paramFilter)) {
      setFilter(paramFilter);
    }
    setCategoryId(searchParams.get('categoryId') || '');
    setSubService(searchParams.get('subService') || '');
    setSearch(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, cityId, categoryId, subService, featuredOnly, subscriptionFilter, filter, sort]);

  const cityOptions = useMemo(() => flattenCities(cities), [cities]);
  const activeCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) || null,
    [categories, categoryId],
  );
  const draftCategory = useMemo(
    () => categories.find((item) => item.id === filterDraft.categoryId) || null,
    [categories, filterDraft.categoryId],
  );
  const cityDescendantIds = useMemo(
    () => new Set(cityId ? getCityDescendantIds(cities, cityId) : []),
    [cities, cityId],
  );

  const preStatusProviders = useMemo(() => {
    if (!usesFullDataset) {
      return providers;
    }

    return providers.filter((provider) => {
      if (featuredOnly && !provider.isFeatured) return false;
      if (cityId && (!provider.cityId || !cityDescendantIds.has(provider.cityId))) return false;
      if (categoryId && provider.categoryId !== categoryId) return false;
      if (subService && !provider.subServices.includes(subService)) return false;
      if (!matchesProviderSearch(provider, debouncedSearch)) return false;
      if (!matchesSubscriptionDrawerFilter(provider, subscriptionFilter)) return false;
      return true;
    });
  }, [
    providers,
    usesFullDataset,
    featuredOnly,
    cityId,
    cityDescendantIds,
    categoryId,
    subService,
    debouncedSearch,
    subscriptionFilter,
  ]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<ProviderFilter, number>> = {
      all: usesFullDataset ? preStatusProviders.length : serverTotal,
      pending: 0,
      active: 0,
      featured: 0,
      expiringSoon: 0,
      expired: 0,
      deactivated: 0,
    };

    for (const provider of preStatusProviders) {
      if (provider.status === 'PENDING') counts.pending = (counts.pending ?? 0) + 1;
      if (provider.status === 'ACTIVE') counts.active = (counts.active ?? 0) + 1;
      if (provider.status === 'DEACTIVATED') counts.deactivated = (counts.deactivated ?? 0) + 1;
      if (provider.isFeatured) counts.featured = (counts.featured ?? 0) + 1;
      if (provider.isSubscriptionExpired) counts.expired = (counts.expired ?? 0) + 1;
      if (matchesExpiringSoonFilter(provider)) {
        counts.expiringSoon = (counts.expiringSoon ?? 0) + 1;
      }
    }

    return counts;
  }, [preStatusProviders, serverTotal, usesFullDataset]);

  const filteredProviders = useMemo(() => {
    const sorted = preStatusProviders
      .filter((provider) => (usesFullDataset ? matchesProviderFilter(provider, filter) : true))
      .sort((a, b) => {
        if (sort === 'name') {
          return a.fullName.localeCompare(b.fullName, 'ar');
        }

        if (sort === 'subscription') {
          const urgency = compareSubscriptionUrgency(a, b);
          if (urgency !== 0) return urgency;

          const aTime = a.subscriptionEndsAt ? new Date(a.subscriptionEndsAt).getTime() : 0;
          const bTime = b.subscriptionEndsAt ? new Date(b.subscriptionEndsAt).getTime() : 0;
          return aTime - bTime;
        }

        const urgency = compareSubscriptionUrgency(a, b);
        if (urgency !== 0) return urgency;

        return Number(b.isFeatured) - Number(a.isFeatured);
      });

    return sorted;
  }, [preStatusProviders, filter, sort, usesFullDataset]);

  const totalPages = usesFullDataset
    ? Math.max(1, Math.ceil(filteredProviders.length / LIST_PAGE_SIZE))
    : Math.max(1, Math.ceil(serverTotal / LIST_PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const paginatedProviders = useMemo(() => {
    if (!usesFullDataset) {
      return filteredProviders;
    }

    const start = (currentPage - 1) * LIST_PAGE_SIZE;
    return filteredProviders.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredProviders, currentPage, usesFullDataset]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cityId) count += 1;
    if (categoryId) count += 1;
    if (subService) count += 1;
    if (featuredOnly) count += 1;
    if (subscriptionFilter !== 'all') count += 1;
    if (filter === 'pending' || filter === 'active' || filter === 'deactivated') count += 1;
    return count;
  }, [cityId, categoryId, subService, featuredOnly, subscriptionFilter, filter]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (cityId) {
      const city = cityOptions.find((item) => item.id === cityId);
      chips.push({
        key: 'city',
        label: city?.name || 'مدينة',
        onRemove: () => setCityId(''),
      });
    }

    if (categoryId) {
      const category = categories.find((item) => item.id === categoryId);
      chips.push({
        key: 'category',
        label: category?.name || 'فئة',
        onRemove: () => {
          setCategoryId('');
          setSubService('');
        },
      });
    }

    if (subService) {
      chips.push({
        key: 'subService',
        label: subService,
        onRemove: () => setSubService(''),
      });
    }

    if (filter === 'pending' || filter === 'active' || filter === 'deactivated') {
      const label =
        filter === 'pending' ? 'قيد المراجعة' : filter === 'active' ? 'نشط' : 'معطل';
      chips.push({
        key: 'account',
        label,
        onRemove: () => {
          setFilter('all');
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete('filter');
            return next;
          });
        },
      });
    }

    if (subscriptionFilter === 'active') {
      chips.push({
        key: 'subscription-active',
        label: 'اشتراك فعّال',
        onRemove: () => setSubscriptionFilter('all'),
      });
    } else if (subscriptionFilter === 'expired') {
      chips.push({
        key: 'subscription-expired',
        label: 'منتهي',
        onRemove: () => setSubscriptionFilter('all'),
      });
    } else if (subscriptionFilter === 'expiringSoon') {
      chips.push({
        key: 'subscription-expiring',
        label: 'ينتهي قريباً',
        onRemove: () => setSubscriptionFilter('all'),
      });
    } else if (subscriptionFilter === 'not_subscribed') {
      chips.push({
        key: 'subscription-none',
        label: 'غير مشترك',
        onRemove: () => setSubscriptionFilter('all'),
      });
    }

    if (featuredOnly) {
      chips.push({
        key: 'featured',
        label: 'مميز',
        onRemove: () => setFeaturedOnly(false),
      });
    }

    return chips;
  }, [
    cityId,
    categoryId,
    subService,
    filter,
    subscriptionFilter,
    featuredOnly,
    cityOptions,
    categories,
    setSearchParams,
  ]);

  const updateProviderInList = (updated: ProviderProfile) => {
    setProviders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const removeProviderFromList = (id: string) => {
    setProviders((current) => current.filter((item) => item.id !== id));
    setServerTotal((current) => Math.max(0, current - 1));
  };

  const runAction = async (id: string, action: () => Promise<void>, successMessage?: string) => {
    setBusyId(id);

    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (actionFailure) {
      toast.error(
        actionFailure instanceof ApiError
          ? actionFailure.message
          : actionFailure instanceof Error
            ? actionFailure.message
            : 'تعذر تنفيذ العملية.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = (id: string) =>
    void runAction(
      id,
      async () => updateProviderInList(await approveProvider(id)),
      'تم تفعيل المزود.',
    );

  const handleDeactivateRequest = (id: string) => setConfirm({ type: 'deactivate', id });

  const handleDeactivate = (id: string) =>
    void runAction(
      id,
      async () => {
        updateProviderInList(await suspendProvider(id));
        setConfirm(null);
      },
      'تم تعطيل المزود.',
    );

  const handleDeleteRequest = (id: string) => setConfirm({ type: 'delete', id });

  const handleDelete = (id: string) =>
    void runAction(
      id,
      async () => {
        await animateListRemoval(
          id,
          setExitingIds,
          () => deleteProvider(id),
          () => removeProviderFromList(id),
        );
        setConfirm(null);
      },
      'تم حذف المزود.',
    );

  const handleToggleFeatured = (provider: ProviderProfile, nextFeatured: boolean) => {
    const previous = provider.isFeatured;
    updateProviderInList({ ...provider, isFeatured: nextFeatured });
    void runAction(
      provider.id,
      async () => {
        try {
          updateProviderInList(await updateProviderSubscription(provider.id, nextFeatured));
        } catch (toggleError) {
          updateProviderInList({ ...provider, isFeatured: previous });
          throw toggleError;
        }
      },
      nextFeatured ? 'تم تمييز المزود.' : 'تم إلغاء التمييز.',
    );
  };

  const handleRenew = (id: string) =>
    void runAction(id, async () => updateProviderInList(await renewProviderSubscription(id)), 'تم تجديد الاشتراك.');

  const handleStatusChange = (value: ProviderFilter) => {
    setFilter(value);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === 'all') next.delete('filter');
      else next.set('filter', value);
      return next;
    });
  };

  const openFilters = () => {
    setFilterDraft(
      createFilterDraft({
        cityId,
        categoryId,
        subService,
        featuredOnly,
        accountStatus: accountStatusFromFilter(filter),
        subscriptionStatus: subscriptionStatusFromFilter(filter, subscriptionFilter),
      }),
    );
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setCityId(filterDraft.cityId);
    setCategoryId(filterDraft.categoryId);
    setSubService(filterDraft.subService);
    setFeaturedOnly(filterDraft.featuredOnly);
    setSubscriptionFilter(filterDraft.subscriptionStatus);

    if (filterDraft.accountStatus === 'all') {
      if (['pending', 'active', 'deactivated'].includes(filter)) {
        handleStatusChange('all');
      }
    } else {
      handleStatusChange(filterDraft.accountStatus);
    }

    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setSearch('');
    setCityId('');
    setCategoryId('');
    setSubService('');
    setFeaturedOnly(false);
    setSubscriptionFilter('all');
    setFilter('all');
    setFilterDraft(createFilterDraft());
    setSearchParams({});
    setFiltersOpen(false);
  };

  const resultCount = usesFullDataset ? filteredProviders.length : serverTotal;

  return (
    <div className="mgmt-page">
      <ProviderPageHeader />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <ProviderStatusTabs
        value={filter}
        counts={statusCounts}
        onChange={handleStatusChange}
      />

      <ProviderManagementToolbar
        search={search}
        onSearchChange={setSearch}
        resultCount={resultCount}
        onOpenFilters={openFilters}
        activeFilterCount={activeFilterCount}
        sort={sort}
        onSortChange={setSort}
        refreshing={refreshing}
        onRefresh={() => void handleRefresh()}
      />

      <ActiveFilterChips chips={activeChips} />

      {metaLoading || providersLoading ? (
        <Skeleton className="providers-table-skeleton" aria-busy="true" aria-label="جاري تحميل الجدول" />
      ) : filteredProviders.length === 0 ? (
        <EmptyState
          title="لا توجد نتائج"
          description={activeChips.length > 0 || filter !== 'all' ? 'جرّب تعديل عوامل التصفية.' : undefined}
        />
      ) : (
        <>
          <ProvidersTable
            providers={paginatedProviders}
            busyId={busyId}
            exitingIds={exitingIds}
            pagination={{
              page: currentPage,
              totalPages,
              totalItems: resultCount,
              pageSize: LIST_PAGE_SIZE,
              onPageChange: setPage,
            }}
            onToggleFeatured={handleToggleFeatured}
            onActivate={handleActivate}
            onDeactivate={handleDeactivateRequest}
            onRenew={handleRenew}
            onDelete={handleDeleteRequest}
            onWhatsApp={setWhatsappProvider}
          />
        </>
      )}

      <ProviderFilterDrawer
        open={filtersOpen}
        draft={filterDraft}
        cityOptions={cityOptions}
        categories={categories}
        subServices={draftCategory?.subServices || []}
        onDraftChange={setFilterDraft}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="تأكيد الحذف"
        message="هل أنت متأكد أنك تريد حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        danger
        loading={Boolean(busyId)}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && handleDelete(confirm.id)}
      />

      <ConfirmDialog
        open={confirm?.type === 'deactivate'}
        title="تعطيل الحساب"
        message="هل أنت متأكد أنك تريد تعطيل هذا الحساب؟"
        confirmLabel="تعطيل"
        danger
        loading={Boolean(busyId)}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && handleDeactivate(confirm.id)}
      />

      <WhatsAppModal
        open={Boolean(whatsappProvider)}
        providerName={whatsappProvider?.fullName || ''}
        phone={whatsappProvider?.phone || ''}
        onClose={() => setWhatsappProvider(null)}
      />
    </div>
  );
}
