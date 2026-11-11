import { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PageLoading } from '@/components/app/common';
import { Toaster } from '@/components/ui/sonner';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './store/useAuthStore';

// Lazy, so a seller on mobile internet does not download the chart library to scan a tag.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ActivatePage = lazy(() => import('./pages/ActivatePage'));
const PassportsPage = lazy(() => import('./pages/PassportsPage'));
const PassportDetailPage = lazy(() => import('./pages/PassportDetailPage'));
const TalonPage = lazy(() => import('./pages/TalonPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <ThemeProvider attribute="class" storageKey="ys-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {/* Outside the shell: this page goes to the printer. */}
            <Route
              path="/passports/:id/talon"
              element={
                <Suspense fallback={<PageLoading />}>
                  <TalonPage />
                </Suspense>
              }
            />
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/activate" element={<ActivatePage />} />
              <Route path="/passports" element={<PassportsPage />} />
              <Route path="/passports/:id" element={<PassportDetailPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/requests/:id" element={<RequestsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrdersPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
