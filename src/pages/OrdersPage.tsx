import { useState } from 'react';
import { CheckCircle2, PackageCheck, Phone, XCircle } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EntityStatus, LoadState, PageHeader, ReasonModal, SelectField, useStatusLabel } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatPhone, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { DetailRow, DetailRows, LoadMore, ProductThumb } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { homeOf, useRole } from '../store/useAuthStore';

interface OrderItem {
  product_id: string;
  name_uz: string;
  name_ru: string;
  image_path: string | null;
  quantity: number;
  price: number;
}

interface OrderRow {
  id: string;
  order_no: number;
  status: string;
  total: number;
  comment: string | null;
  cancel_reason: string | null;
  created_at: string;
  customer_id?: string;
  customer_name: string;
  client_phone: string;
  items: OrderItem[];
}

const STATUSES = ['new', 'confirmed', 'completed', 'cancelled'];

export default function OrdersPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <Orders />;
}

function Orders() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams();
  const statusLabel = useStatusLabel();
  const [status, setStatus] = useState('');

  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<OrderRow>(
    (last) => rpc<OrderRow[]>('store_orders', { p_status: status || null, p_before_created_at: last?.created_at ?? null, p_before_id: last?.id ?? null, p_limit: 50 }),
    [status],
  );

  return (
    <>
      <PageHeader title={t('Buyurtmalar', 'Заказы')} description={t("Mijozga qo'ng'iroq qiling, tasdiqlang va yetkazishni kelishib oling.", 'Позвоните клиенту, подтвердите заказ и договоритесь о доставке.')} />
      <SelectField
        className="sm:w-56"
        value={status}
        onChange={setStatus}
        options={[{ value: '', label: t('Barcha holatlar', 'Все статусы') }, ...STATUSES.map((s) => ({ value: s, label: statusLabel('order', s) }))]}
      />
      <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Buyurtmalar topilmadi', 'Заказы не найдены')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Buyurtma', 'Заказ')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Mijoz', 'Клиент')}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t('Summa', 'Сумма')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                  <TableCell className="max-w-0 min-w-44 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <ProductThumb path={o.items[0]?.image_path} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          №{o.order_no} · {t(o.items[0]?.name_uz ?? '', o.items[0]?.name_ru ?? '')}
                          {o.items.length > 1 ? ` +${o.items.length - 1}` : ''}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(o.client_phone)}</p>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatSom(o.total)}</TableCell>
                  <TableCell>
                    <EntityStatus kind="order" status={o.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} />
      </LoadState>

      {id ? <OrderSheet id={id} onClose={() => navigate('/orders')} onChanged={() => void reload()} /> : null}
    </>
  );
}

function OrderSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { data: o, error, loading, reload } = useLoad(() => rpc<OrderRow>('store_order', { p_order_id: id }), [id]);

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await rpc('set_order_status', { p_order_id: id, p_status: status });
      await reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{o ? `${t('Buyurtma', 'Заказ')} №${o.order_no}` : t('Buyurtma', 'Заказ')}</SheetTitle>
          <SheetDescription>{o ? formatDate(o.created_at) : ''}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <LoadState loading={loading} error={error} empty={!o} emptyText={t('Buyurtma topilmadi', 'Заказ не найден')} onRetry={() => void reload()}>
            {o ? (
              <>
                <div className="flex flex-col gap-2">
                  {o.items.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3">
                      <ProductThumb path={item.image_path} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t(item.name_uz, item.name_ru)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatSom(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <DetailRows>
                  <DetailRow label={t('Holat', 'Статус')}>
                    <EntityStatus kind="order" status={o.status} />
                  </DetailRow>
                  <DetailRow label={t('Summa', 'Сумма')}>
                    <span className="font-medium">{formatSom(o.total)}</span>
                  </DetailRow>
                  <DetailRow label={t('Mijoz', 'Клиент')}>
                    {o.customer_id ? (
                      <Link className="underline-offset-4 hover:underline" to={`/customers/${o.customer_id}`}>
                        {o.customer_name}
                      </Link>
                    ) : (
                      o.customer_name
                    )}
                  </DetailRow>
                  {o.comment ? <DetailRow label={t('Izoh', 'Комментарий')}>{o.comment}</DetailRow> : null}
                  {o.cancel_reason ? <DetailRow label={t('Bekor qilish sababi', 'Причина отмены')}>{o.cancel_reason}</DetailRow> : null}
                </DetailRows>

                <Button asChild variant="outline">
                  <a href={`tel:+${o.client_phone}`}>
                    <Phone />
                    {formatPhone(o.client_phone)}
                  </a>
                </Button>

                {o.status === 'new' ? (
                  <Button disabled={busy} onClick={() => void setStatus('confirmed')}>
                    <CheckCircle2 />
                    {t('Tasdiqlash', 'Подтвердить')}
                  </Button>
                ) : null}
                {o.status === 'confirmed' ? (
                  <Button disabled={busy} onClick={() => void setStatus('completed')}>
                    <PackageCheck />
                    {t('Bajarildi', 'Выполнен')}
                  </Button>
                ) : null}
                {o.status === 'new' || o.status === 'confirmed' ? (
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelling(true)}>
                    <XCircle />
                    {t('Bekor qilish', 'Отменить заказ')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </LoadState>
        </div>
      </SheetContent>
      {cancelling ? (
        <ReasonModal
          title={t('Buyurtmani bekor qilish', 'Отмена заказа')}
          submitLabel={t('Bekor qilish', 'Отменить заказ')}
          onClose={() => setCancelling(false)}
          onSubmit={async (reason) => {
            await rpc('set_order_status', { p_order_id: id, p_status: 'cancelled', p_reason: reason });
            await reload();
            onChanged();
          }}
        />
      ) : null}
    </Sheet>
  );
}
