import { useState } from 'react';
import { ClipboardList, ShoppingBag, TriangleAlert } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { PeriodToggle, RankedCard, StatCard, TrendCard } from '@/components/app/charts';
import { LoadState, PageHeader, useStatusLabel } from '@/components/app/common';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { loadStats, type StoreDashboard } from '../lib/stats';
import { homeOf, useRole } from '../store/useAuthStore';

export default function DashboardPage() {
  const { role, sells } = useRole();
  // A master and a warehouse keeper have no figures of the store: section 2.
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <Dashboard />;
}

function Dashboard() {
  const t = useT();
  const statusLabel = useStatusLabel();
  const { manages } = useRole();
  const [days, setDays] = useState(30);

  const { data, error, loading, reload } = useLoad(async () => {
    const [totals, stats] = await Promise.all([rpc<StoreDashboard>('store_dashboard'), loadStats(days)]);
    return { totals, stats };
  }, [days]);

  const totals = data?.totals;
  const stats = data?.stats;
  const series = stats?.series ?? [];
  const period = t(`${days} kunda`, `за ${days} дней`);
  const added = (key: 'activated' | 'claimed' | 'requests' | 'orders' | 'clients') => series.reduce((sum, p) => sum + p[key], 0);

  const claimTotal = totals ? totals.passports_claimed + totals.passports_pending : 0;
  const claimRate = totals && claimTotal > 0 ? Math.round((totals.passports_claimed / claimTotal) * 100) : null;
  const balanceLow = manages && totals?.passport_balance !== undefined && totals.passport_balance <= 5;

  return (
    <>
      <PageHeader title={t('Panel', 'Панель')} action={<PeriodToggle value={days} onChange={setDays} />} />
      <LoadState loading={loading} error={error} empty={!data} emptyText="" onRetry={() => void reload()}>
        {totals && stats ? (
          <>
            {balanceLow ? (
              <Alert>
                <TriangleAlert />
                <AlertTitle>{t('Pasport balansi kam qoldi', 'Паспортов на балансе мало')}</AlertTitle>
                <AlertDescription>
                  {t(
                    `Qoldi: ${totals.passport_balance}. Yangi partiya uchun platformaga murojaat qiling.`,
                    `Осталось: ${totals.passport_balance}. За новой партией обратитесь к платформе.`,
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {totals.requests_new > 0 || totals.orders_new > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {totals.requests_new > 0 ? (
                  <Button asChild variant="outline" className="h-auto justify-start py-3">
                    <Link to="/requests">
                      <ClipboardList />
                      <span className="truncate">
                        {t(`Yangi arizalar: ${totals.requests_new}`, `Новых заявок: ${totals.requests_new}`)}
                        {totals.requests_overdue > 0 ? t(`, muddati o'tgan: ${totals.requests_overdue}`, `, просрочено: ${totals.requests_overdue}`) : ''}
                      </span>
                    </Link>
                  </Button>
                ) : null}
                {totals.orders_new > 0 ? (
                  <Button asChild variant="outline" className="h-auto justify-start py-3">
                    <Link to="/orders">
                      <ShoppingBag />
                      {t(`Yangi buyurtmalar: ${totals.orders_new}`, `Новых заказов: ${totals.orders_new}`)}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {manages ? (
                <StatCard
                  label={t('Pasport balansi', 'Баланс паспортов')}
                  value={totals.passport_balance ?? 0}
                  hint={t(`Bo'sh metkalar: ${totals.tags_free ?? 0}`, `Свободных меток: ${totals.tags_free ?? 0}`)}
                  trend={{ data: series, key: 'balance' }}
                  mode="last"
                />
              ) : null}
              <StatCard
                label={t('Faollashtirilgan', 'Активировано')}
                value={added('activated')}
                hint={period}
                trend={{ data: series, key: 'activated' }}
                previous={stats.previous.activated}
              />
              <StatCard
                label={t('Mijoz ulagan', 'Подключено клиентами')}
                value={totals.passports_claimed}
                hint={
                  claimRate === null
                    ? t('Hali pasportlar yo\'q', 'Паспортов пока нет')
                    : t(`Ulanish ulushi: ${claimRate}%. Kutmoqda: ${totals.passports_pending}`, `Доля подключения: ${claimRate}%. Ожидают: ${totals.passports_pending}`)
                }
                trend={{ data: series, key: 'claimed' }}
                previous={stats.previous.claimed}
              />
              <StatCard
                label={t('Yangi mijozlar', 'Новые клиенты')}
                value={added('clients')}
                hint={period}
                trend={{ data: series, key: 'clients' }}
                previous={stats.previous.clients}
              />
              {manages ? null : (
                <StatCard
                  label={t('Buyurtmalar', 'Заказы')}
                  value={added('orders')}
                  hint={period}
                  trend={{ data: series, key: 'orders' }}
                  previous={stats.previous.orders}
                />
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <TrendCard
                className="xl:col-span-2"
                title={t('Faollashtirish va ulanish', 'Активации и подключения')}
                description={t('Siz faollashtirgan va mijozlar ulagan pasportlar', 'Сколько паспортов вы активировали и сколько подключили клиенты')}
                data={series}
                series={[
                  { key: 'activated', label: t('Faollashtirilgan', 'Активировано'), color: 'var(--chart-1)' },
                  { key: 'claimed', label: t('Ulangan', 'Подключено'), color: 'var(--chart-2)' },
                ]}
              />
              <RankedCard
                title={t('Pasportlar holati', 'Паспорта по статусам')}
                description={t('Hozirgi holat', 'На сегодня')}
                items={stats.passports_by_status.map((s) => ({ key: s.status, label: statusLabel('passport', s.status), value: s.count }))}
                emptyText={t("Hali pasportlar yo'q", 'Паспортов пока нет')}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <TrendCard
                className="xl:col-span-2"
                title={t('Arizalar va buyurtmalar', 'Заявки и заказы')}
                data={series}
                kind="bar"
                series={[
                  { key: 'requests', label: t('Arizalar', 'Заявки'), color: 'var(--chart-1)' },
                  { key: 'orders', label: t('Buyurtmalar', 'Заказы'), color: 'var(--chart-2)' },
                ]}
              />
              <RankedCard
                title={t('Arizalar holati', 'Заявки по статусам')}
                description={period}
                items={stats.requests_by_status.map((s) => ({ key: s.status, label: statusLabel('request', s.status), value: s.count }))}
                emptyText={t("Bu davrda arizalar yo'q", 'За этот период заявок нет')}
              />
            </div>
          </>
        ) : null}
      </LoadState>
    </>
  );
}
