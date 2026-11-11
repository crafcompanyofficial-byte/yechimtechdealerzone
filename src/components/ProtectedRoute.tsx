import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoading } from '@/components/app/common';
import { useAuthStore } from '../store/useAuthStore';

/** Remembers the address: a button from Telegram or the Mini App must survive the sign-in. */
export default function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'loading') return <PageLoading />;
  if (status === 'signed_out') return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}
