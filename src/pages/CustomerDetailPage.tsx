import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EntityStatus, FormField, FormModal, LoadState, PageHeader, StatusBadge } from '@/components/app/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { DetailRow, DetailRows, PhoneLink, ProductThumb } from '../components/bits';
import { homeOf, useRole } from '../store/useAuthStore';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  note: string | null;
  labels: string[] | null;
  in_app: boolean;
  passports_count: number;
  purchases_total: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  account_phone: string | null;
  passports: { id: string; status: string; title_uz: string; title_ru: string; model: string; image_path: string | null; warranty_until: string }[];
  orders: { id: string; order_no: number; status: string; total: number; created_at: string }[];
  requests: { id: string; request_no: number; status: string; type: string; created_at: string }[];
}

export default function CustomerDetailPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <CustomerDetail />;
}

function CustomerDetail() {
  const t = useT();
  const { id } = useParams();
  const { manages } = useRole();
  const [editing, setEditing] = useState(false);
  const { data: c, error, loading, reload } = useLoad(() => rpc<Customer>('crm_customer', { p_customer_id: id }), [id]);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/customers">
          <ArrowLeft />
          {t('Mijozlar', 'Клиенты')}
        </Link>
      </Button>
      <LoadState loading={loading} error={error} empty={!c} emptyText={t('Mijoz topilmadi', 'Клиент не найден')} onRetry={() => void reload()}>
        {c ? (
          <>
            <PageHeader
              title={c.full_name}
              action={
                manages ? (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil />
                    {t('Tahrirlash', 'Изменить')}
                  </Button>
                ) : null
              }
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('Karta', 'Карточка')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRows>
                    <DetailRow label={t('Telefon', 'Телефон')}>
                      <PhoneLink phone={c.phone} />
                    </DetailRow>
                    {c.account_phone ? (
                      <DetailRow label={t('Telegram raqami', 'Номер в Telegram')}>
                        <PhoneLink phone={c.account_phone} />
                      </DetailRow>
                    ) : null}
                    <DetailRow label="Telegram">
                      <StatusBadge tone={c.in_app ? 'good' : 'neutral'} label={c.in_app ? t('Ulangan', 'Подключён') : t("Yo'q", 'Нет')} />
                    </DetailRow>
                    <DetailRow label={t('Xaridlar', 'Покупки')}>{formatSom(c.purchases_total)}</DetailRow>
                    <DetailRow label={t('Oxirgi xarid', 'Последняя покупка')}>{formatDate(c.last_purchase_at)}</DetailRow>
                    {c.labels?.length ? (
                      <DetailRow label={t('Belgilar', 'Метки')}>
                        <span className="flex flex-wrap justify-end gap-1">
                          {c.labels.map((label) => (
                            <Badge key={label} variant="secondary">
                              {label}
                            </Badge>
                          ))}
                        </span>
                      </DetailRow>
                    ) : null}
                    {c.note ? <DetailRow label={t('Izoh', 'Заметка')}>{c.note}</DetailRow> : null}
                  </DetailRows>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Pasportlar', 'Паспорта')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {c.passports.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hali yo'q", 'Пока нет')}</p> : null}
                  {c.passports.map((p) => (
                    <Link key={p.id} to={`/passports/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
                      <ProductThumb path={p.image_path} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t(p.title_uz, p.title_ru)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.model} · {t('kafolat', 'гарантия до')} {formatDate(p.warranty_until)}
                        </p>
                      </div>
                      <EntityStatus kind="passport" status={p.status} />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Buyurtmalar', 'Заказы')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {c.orders.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hali yo'q", 'Пока нет')}</p> : null}
                  {c.orders.map((o) => (
                    <Link key={o.id} to={`/orders/${o.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-accent">
                      <span>
                        №{o.order_no} · {formatSom(o.total)}
                      </span>
                      <EntityStatus kind="order" status={o.status} />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Arizalar', 'Заявки')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {c.requests.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hali yo'q", 'Пока нет')}</p> : null}
                  {c.requests.map((r) => (
                    <Link key={r.id} to={`/requests/${r.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-accent">
                      <span>
                        №{r.request_no} · {formatDate(r.created_at)}
                      </span>
                      <EntityStatus kind="request" status={r.status} />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>

            {editing ? <EditCustomer customer={c} onClose={() => setEditing(false)} onDone={() => void reload()} /> : null}
          </>
        ) : null}
      </LoadState>
    </>
  );
}

function EditCustomer({ customer, onClose, onDone }: { customer: Customer; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [name, setName] = useState(customer.full_name);
  const [note, setNote] = useState(customer.note ?? '');
  const [labels, setLabels] = useState((customer.labels ?? []).join(', '));

  return (
    <FormModal
      title={t('Mijozni tahrirlash', 'Изменить клиента')}
      description={t("Telefon mijozni aniqlaydi, shuning uchun bu yerda o'zgarmaydi.", 'Телефон определяет клиента, поэтому здесь не меняется.')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('crm_upsert_customer', {
          p_id: customer.id,
          p_phone: customer.phone,
          p_full_name: name,
          p_note: note,
          p_labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
        });
        onDone();
      }}
    >
      <FormField label={t('Ism', 'Имя')} htmlFor="edit-name">
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label={t('Belgilar', 'Метки')} htmlFor="edit-labels" hint={t('Vergul bilan ajrating', 'Через запятую')}>
        <Input id="edit-labels" value={labels} onChange={(e) => setLabels(e.target.value)} />
      </FormField>
      <FormField label={t('Izoh', 'Заметка')} htmlFor="edit-note">
        <Textarea id="edit-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </FormModal>
  );
}
