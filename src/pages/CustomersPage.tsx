import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FormField, FormModal, LoadState, PageHeader, StatusBadge } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatPhone, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { LoadMore } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { homeOf, useRole } from '../store/useAuthStore';

interface CustomerRow {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  in_app: boolean;
  passports_count: number;
  purchases_total: number;
  last_purchase_at: string | null;
}

export default function CustomersPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <Customers />;
}

function Customers() {
  const t = useT();
  const navigate = useNavigate();
  const { manages } = useRole();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // A seller finds one customer by search and never lists the whole base: section 2.
  const mustSearch = !manages && search.length < 3;

  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<CustomerRow>(
    (last) =>
      mustSearch
        ? Promise.resolve([])
        : rpc<CustomerRow[]>('crm_customers', { p_search: search || null, p_before_created_at: last?.created_at ?? null, p_before_id: last?.id ?? null, p_limit: 50 }),
    [search, mustSearch],
  );

  return (
    <>
      <PageHeader
        title={t('Mijozlar', 'Клиенты')}
        action={
          manages ? (
            <Button onClick={() => setAdding(true)}>
              <Plus />
              {t('Yangi mijoz', 'Новый клиент')}
            </Button>
          ) : null
        }
      />
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Ism yoki telefon', 'Имя или телефон')} />
      </div>

      {mustSearch ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyDescription>{t('Mijozni topish uchun ismi yoki telefonining kamida 3 ta belgisini kiriting.', 'Чтобы найти клиента, введите не меньше 3 символов имени или телефона.')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Mijozlar topilmadi', 'Клиенты не найдены')} onRetry={() => void reload()}>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Mijoz', 'Клиент')}</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">{t('Pasportlar', 'Паспорта')}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{t('Xaridlar', 'Покупки')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Oxirgi xarid', 'Последняя покупка')}</TableHead>
                  <TableHead>Telegram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                    <TableCell>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{c.passports_count}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{formatSom(c.purchases_total)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(c.last_purchase_at)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={c.in_app ? 'good' : 'neutral'} label={c.in_app ? t('Ulangan', 'Подключён') : t("Yo'q", 'Нет')} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} />
        </LoadState>
      )}

      {adding ? <NewCustomer onClose={() => setAdding(false)} onDone={(id) => navigate(`/customers/${id}`)} /> : null}
    </>
  );
}

function NewCustomer({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const t = useT();
  const [form, setForm] = useState({ phone: '', full_name: '', note: '' });

  return (
    <FormModal
      title={t('Yangi mijoz', 'Новый клиент')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        const id = await rpc<string>('crm_upsert_customer', { p_id: null, p_phone: form.phone, p_full_name: form.full_name, p_note: form.note || null });
        onDone(id);
      }}
    >
      <FormField label={t('Telefon', 'Телефон')} htmlFor="c-phone">
        <Input id="c-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+998 90 123 45 67" />
      </FormField>
      <FormField label={t('Ism', 'Имя')} htmlFor="c-name">
        <Input id="c-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </FormField>
      <FormField label={t('Izoh', 'Заметка')} htmlFor="c-note">
        <Textarea id="c-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </FormField>
    </FormModal>
  );
}
