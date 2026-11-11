import { BarChart3, Megaphone, Nfc, Package, ScanLine, ScrollText, Settings, ShoppingBag, Tags, TriangleAlert, Users, Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AppShell, { type ShellLink } from '@/components/app/AppShell';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import type { StoreDashboard } from '../lib/stats';
import { useAuthStore, useRole, type StoreRole } from '../store/useAuthStore';

const ROLE_LABEL: Record<StoreRole, [uz: string, ru: string]> = {
  owner: ['Egasi', 'Владелец'],
  manager: ['Menejer', 'Менеджер'],
  seller: ['Sotuvchi', 'Продавец'],
  warehouse: ['Omborchi', 'Склад'],
  master: ['Usta', 'Мастер'],
};

export function useRoleLabel() {
  const t = useT();
  return (role: StoreRole) => t(...ROLE_LABEL[role]);
}

/** The role table of section 2 decides what is in the menu. */
export default function Layout() {
  const t = useT();
  const { pathname } = useLocation();
  const { role, sells } = useRole();
  const store = useAuthStore((s) => s.store);
  const member = useAuthStore((s) => s.member);
  const email = useAuthStore((s) => s.session?.user.email);
  const logout = useAuthStore((s) => s.logout);
  const roleLabel = useRoleLabel();

  // Read on every page change, so the counters follow the work done in the pages.
  const { data } = useLoad(() => rpc<StoreDashboard>('store_dashboard'), [pathname]);

  const all: (ShellLink & { roles: StoreRole[] })[] = [
    { to: '/', icon: BarChart3, label: t('Panel', 'Панель'), end: true, roles: ['owner', 'manager', 'seller'] },
    { to: '/activate', icon: Nfc, label: t('Faollashtirish', 'Активация'), roles: ['owner', 'manager', 'seller'] },
    { to: '/passports', icon: ScrollText, label: t('Pasportlar', 'Паспорта'), roles: ['owner', 'manager', 'seller'] },
    { to: '/tags', icon: Tags, label: t('Metkalar', 'Метки'), roles: ['owner', 'manager', 'seller'] },
    { to: '/products', icon: Package, label: t('Mahsulotlar', 'Товары'), roles: ['owner', 'manager', 'seller', 'warehouse'] },
    { to: '/customers', icon: Users, label: t('Mijozlar', 'Клиенты'), roles: ['owner', 'manager', 'seller'] },
    { to: '/requests', icon: Wrench, label: t('Arizalar', 'Заявки'), badge: data?.requests_new, roles: ['owner', 'manager', 'seller', 'master'] },
    { to: '/orders', icon: ShoppingBag, label: t('Buyurtmalar', 'Заказы'), badge: data?.orders_new, roles: ['owner', 'manager', 'seller'] },
    { to: '/marketing', icon: Megaphone, label: t('Marketing', 'Маркетинг'), roles: ['owner', 'manager'] },
    { to: '/settings', icon: Settings, label: t('Sozlamalar', 'Настройки'), roles: ['owner', 'manager', 'seller', 'warehouse', 'master'] },
  ];

  const closed = store && store.status !== 'active';

  return (
    <AppShell
      zone={store?.name ?? ''}
      links={all.filter((l) => role !== null && l.roles.includes(role))}
      userName={member?.full_name || email?.split('@')[0] || ''}
      userMeta={role ? roleLabel(role) : ''}
      onLogout={() => void logout()}
      headerAction={
        sells && pathname !== '/activate' ? (
          <Button asChild size="sm" className="mr-1">
            <Link to="/activate">
              <ScanLine />
              {t('Skan', 'Скан')}
            </Link>
          </Button>
        ) : null
      }
      banner={
        closed ? (
          <div className="flex items-start gap-2 border-b bg-muted px-4 py-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              {store.status === 'pending'
                ? t("Do'kon hali faollashtirilmagan: pasportlarni faollashtirib bo'lmaydi.", 'Магазин ещё не активирован: активировать паспорта пока нельзя.')
                : t("Do'kon to'xtatilgan: yangi pasport va buyurtmalar yopiq. Platformaga murojaat qiling.", 'Магазин приостановлен: новые паспорта и заказы закрыты. Свяжитесь с платформой.')}
            </p>
          </div>
        ) : null
      }
    />
  );
}
