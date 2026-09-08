import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { GuestRoute, ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { AuthRouteFallback, RouteFallback } from './components/RouteFallback';
import { ToastProvider } from './feedback/ToastProvider';
import {
  AdminsPage,
  CategoriesPage,
  CategoryDetailPage,
  CitiesPage,
  DashboardPage,
  LoginPage,
  NotificationsPage,
  ProfilePage,
  ProviderDetailPage,
  ProvidersPage,
  SearchPage,
  SubscriptionsPage,
  PromotionsPage,
  PromotionFormPage,
} from './routes/lazyPages';
import { ThemeProvider } from './theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route
                path="login"
                element={
                  <Suspense fallback={<AuthRouteFallback />}>
                    <LoginPage />
                  </Suspense>
                }
              />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="providers"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ProvidersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="providers/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ProviderDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="search"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <SearchPage />
                    </Suspense>
                  }
                />
                <Route
                  path="notifications"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="subscriptions"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <SubscriptionsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <CategoriesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="categories/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <CategoryDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="promotions/new"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <PromotionFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="promotions/:id/edit"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <PromotionFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="promotions"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <PromotionsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="cities"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <CitiesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="account"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ProfilePage />
                    </Suspense>
                  }
                />
                <Route
                  path="admins"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <AdminsPage />
                    </Suspense>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="login" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
