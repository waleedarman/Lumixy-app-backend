import { lazy } from 'react';

export const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
export const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const ProvidersPage = lazy(() =>
  import('../pages/ProvidersPage').then((m) => ({ default: m.ProvidersPage })),
);
export const ProviderDetailPage = lazy(() =>
  import('../pages/ProviderDetailPage').then((m) => ({ default: m.ProviderDetailPage })),
);
export const SearchPage = lazy(() =>
  import('../pages/SearchPage').then((m) => ({ default: m.SearchPage })),
);
export const NotificationsPage = lazy(() =>
  import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
export const SubscriptionsPage = lazy(() =>
  import('../pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })),
);
export const CategoriesPage = lazy(() =>
  import('../pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
export const CategoryDetailPage = lazy(() =>
  import('../pages/CategoryDetailPage').then((m) => ({ default: m.CategoryDetailPage })),
);
export const PromotionsPage = lazy(() =>
  import('../pages/PromotionsPage').then((m) => ({ default: m.PromotionsPage })),
);
export const PromotionFormPage = lazy(() =>
  import('../pages/PromotionFormPage').then((m) => ({ default: m.PromotionFormPage })),
);
export const CitiesPage = lazy(() =>
  import('../pages/CitiesPage').then((m) => ({ default: m.CitiesPage })),
);
export const ProfilePage = lazy(() =>
  import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
export const AdminsPage = lazy(() =>
  import('../pages/AdminsPage').then((m) => ({ default: m.AdminsPage })),
);
