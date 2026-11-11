import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { EntityStatus, LoadState, PageHeader, SelectField, useStatusLabel } from '@/components/app/common';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatPhone } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { LoadMore, ProductThumb } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { homeOf, useRole } from '../store/useAuthStore';

interface PassportRow {
  id: string;
  status: string;
  tag_code: string;
  warranty_code: string;
  title_uz: string;
  title_ru: string;
  brand_name: string;
  model: string;
  serial_number: string | null;
  image_path: string | null;
  client_phone: string;
  customer_name: string;
  warranty_until: string;
  warranty_state: string;
  activated_at: string;
}

const STATUSES = ['pending_claim', 'active', 'returned', 'voided', 'blocked'];

export default function PassportsPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <Passports />;
}

function Passports() {
  const t = useT();
  const navigate = useNavigate();
  const statusLabel = useStatusLabel();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [search, setSearch] = useState(query);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<PassportRow>(
    (last) =>
      rpc<PassportRow[]>('store_passports', {
        p_search: search || null,
        p_status: status || null,
        p_before_activated_at: last?.activated_at ?? null,
        p_before_id: last?.id ?? null,
        p_limit: 50,
      }),
    [search, status],
  );

  return (
    <>
      <PageHeader title={t('Pasportlar', 'Паспорта')} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Mijoz, telefon, seriya, kod yoki metka', 'Клиент, телефон, серийный номер, код или метка')} />
        </div>
        <SelectField
          className="sm:w-48"
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: t('Barcha holatlar', 'Все статусы') }, ...STATUSES.map((s) => ({ value: s, label: statusLabel('passport', s) }))]}
        />
      </div>

      <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Pasportlar topilmadi', 'Паспорта не найдены')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Texnika', 'Техника')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Mijoz', 'Клиент')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Kafolat kodi', 'Гарантийный код')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Kafolat', 'Гарантия')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/passports/${p.id}`)}>
                  <TableCell className="max-w-0 min-w-44 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <ProductThumb path={p.image_path} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t(p.title_uz, p.title_ru)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.brand_name} {p.model}
                        </p>
                        <p className="truncate text-xs text-muted-foreground md:hidden">{p.customer_name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{p.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(p.client_phone)}</p>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">
                    <p>{p.warranty_code}</p>
                    <p className="text-muted-foreground">{p.tag_code}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(p.warranty_until)}</TableCell>
                  <TableCell>
                    <EntityStatus kind="passport" status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} />
      </LoadState>
    </>
  );
}
