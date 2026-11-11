import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { RankedCard } from '@/components/app/charts';
import { EntityStatus, LoadState, PageHeader, SelectField, useStatusLabel } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rows, supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { LoadMore } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { homeOf, useRole } from '../store/useAuthStore';

interface TagRow {
  id: string;
  tag_code: string;
  status: string;
  assigned_at: string | null;
  activated_at: string | null;
}

const STATUSES = ['assigned', 'activated', 'blocked'];

export default function TagsPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <Tags />;
}

function Tags() {
  const t = useT();
  const statusLabel = useStatusLabel();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // Row level security keeps these to the store's own tags.
  const { data: counts } = useLoad(
    () =>
      Promise.all(
        STATUSES.map(async (s) => {
          const { count, error } = await supabase.from('tags').select('id', { count: 'exact', head: true }).eq('status', s);
          if (error) throw error;
          return { key: s, label: statusLabel('tag', s), value: count ?? 0 };
        }),
      ),
    [],
  );

  // Tags of one batch share a timestamp, so the unique code is what orders the pages.
  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<TagRow>(
    async (last) => {
      let q = supabase.from('tags').select('id, tag_code, status, assigned_at, activated_at').order('tag_code').limit(50);
      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('tag_code', `%${search}%`);
      if (last) q = q.gt('tag_code', last.tag_code);
      return rows<TagRow>(await q);
    },
    [search, status],
  );

  return (
    <>
      <PageHeader title={t('Metkalar', 'Метки')} description={t("Do'koningizga berilgan metkalar", 'Метки, переданные вашему магазину')} />
      <RankedCard
        title={t('Metkalar holati', 'Метки по статусам')}
        items={(counts ?? []).filter((c) => c.value > 0)}
        emptyText={t("Hali metkalar yo'q. Partiya uchun platformaga murojaat qiling.", 'Меток пока нет. За партией обратитесь к платформе.')}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Metka kodi', 'Код метки')} />
        </div>
        <SelectField
          className="sm:w-48"
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: t('Barcha holatlar', 'Все статусы') }, ...STATUSES.map((s) => ({ value: s, label: statusLabel('tag', s) }))]}
        />
      </div>
      <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Metkalar topilmadi', 'Метки не найдены')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Kod', 'Код')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('Faollashtirilgan', 'Активирована')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-mono text-xs">{tag.tag_code}</TableCell>
                  <TableCell>
                    <EntityStatus kind="tag" status={tag.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(tag.activated_at)}</TableCell>
                  <TableCell className="text-right">
                    {tag.status === 'activated' ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/passports?q=${encodeURIComponent(tag.tag_code)}`}>{t('Pasport', 'Паспорт')}</Link>
                      </Button>
                    ) : null}
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
