import { useState } from 'react';
import { Building2, CheckCircle2, Hammer, Pencil, Plus, UserCheck, XCircle } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EntityStatus, FormField, FormModal, LoadState, PageHeader, ReasonModal, SelectField, StatusBadge, useStatusLabel } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatPhone, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rows, rpc, supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { DetailRow, DetailRows, LoadMore, PhoneLink, ProductThumb } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { useRole } from '../store/useAuthStore';

interface RequestRow {
  id: string;
  request_no: number;
  status: string;
  type: 'repair' | 'maintenance';
  problem_key: string;
  description: string | null;
  preferred_time: string | null;
  in_warranty: boolean;
  overdue: boolean;
  assignee_id: string | null;
  provider_id: string | null;
  rating: number | null;
  created_at: string;
  passport_id: string;
  title_uz: string;
  title_ru: string;
  model: string;
  image_path: string | null;
  customer_name: string;
  client_phone: string;
}

interface RequestDetail extends RequestRow {
  serial_number: string | null;
  is_paid: boolean | null;
  amount: number | null;
  store_note: string | null;
  rating_comment: string | null;
}

interface Provider {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  is_active: boolean;
}

const STATUSES = ['new', 'accepted', 'assigned', 'in_progress', 'done', 'rejected', 'cancelled'];

function useProblemLabel() {
  const t = useT();
  const { data } = useLoad(async () => rows<{ key: string; label_uz: string; label_ru: string }>(await supabase.from('problem_types').select('key, label_uz, label_ru')), []);
  return (key: string) => {
    const found = data?.find((p) => p.key === key);
    return found ? t(found.label_uz, found.label_ru) : key;
  };
}

export default function RequestsPage() {
  const { role, is } = useRole();
  if (!is('owner', 'manager', 'seller', 'master')) return <Navigate to={role === 'warehouse' ? '/products' : '/'} replace />;
  return <Requests />;
}

function Requests() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams();
  const { manages, role } = useRole();
  const statusLabel = useStatusLabel();
  const problemLabel = useProblemLabel();
  const [status, setStatus] = useState('');
  const [providersOpen, setProvidersOpen] = useState(false);

  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<RequestRow>(
    (last) => rpc<RequestRow[]>('store_requests', { p_status: status || null, p_before_created_at: last?.created_at ?? null, p_before_id: last?.id ?? null, p_limit: 50 }),
    [status],
  );

  return (
    <>
      <PageHeader
        title={t('Arizalar', 'Заявки')}
        description={role === 'master' ? t('Sizga biriktirilgan arizalar', 'Заявки, назначенные вам') : undefined}
        action={
          manages ? (
            <Button variant="outline" onClick={() => setProvidersOpen(true)}>
              <Building2 />
              {t('Servis markazlari', 'Сервисные центры')}
            </Button>
          ) : null
        }
      />
      <SelectField
        className="sm:w-56"
        value={status}
        onChange={setStatus}
        options={[{ value: '', label: t('Barcha holatlar', 'Все статусы') }, ...STATUSES.map((s) => ({ value: s, label: statusLabel('request', s) }))]}
      />

      <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Arizalar topilmadi', 'Заявки не найдены')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Ariza', 'Заявка')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Mijoz', 'Клиент')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Sana', 'Дата')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/requests/${r.id}`)}>
                  <TableCell className="max-w-0 min-w-44 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <ProductThumb path={r.image_path} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          №{r.request_no} · {t(r.title_uz, r.title_ru)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{problemLabel(r.problem_key)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(r.client_phone)}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <EntityStatus kind="request" status={r.status} />
                      {r.overdue ? <StatusBadge tone="bad" label={t("Muddati o'tgan", 'Просрочена')} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} />
      </LoadState>

      {id ? <RequestSheet id={id} problemLabel={problemLabel} onClose={() => navigate('/requests')} onChanged={() => void reload()} /> : null}
      {providersOpen ? <ProvidersDialog onClose={() => setProvidersOpen(false)} /> : null}
    </>
  );
}

type Action = 'assign' | 'done' | 'reject' | null;

function RequestSheet({ id, problemLabel, onClose, onChanged }: { id: string; problemLabel: (key: string) => string; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { manages, role } = useRole();
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const { data: r, error, loading, reload } = useLoad(() => rpc<RequestDetail>('store_request', { p_request_id: id }), [id]);

  const changed = async () => {
    await reload();
    onChanged();
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await changed();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const open = r ? ['new', 'accepted', 'assigned', 'in_progress'].includes(r.status) : false;
  const works = manages || role === 'master';

  return (
    <Sheet open onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{r ? `${t('Ariza', 'Заявка')} №${r.request_no}` : t('Ariza', 'Заявка')}</SheetTitle>
          <SheetDescription>{r ? (r.type === 'maintenance' ? t('Rejali xizmat', 'Плановое обслуживание') : t("Ta'mirlash", 'Ремонт')) : ''}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <LoadState loading={loading} error={error} empty={!r} emptyText={t('Ariza topilmadi', 'Заявка не найдена')} onRetry={() => void reload()}>
            {r ? (
              <>
                <div className="flex items-center gap-3">
                  <ProductThumb path={r.image_path} className="size-14" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t(r.title_uz, r.title_ru)}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.model}
                      {r.serial_number ? ` · ${r.serial_number}` : ''}
                    </p>
                  </div>
                </div>
                <DetailRows>
                  <DetailRow label={t('Holat', 'Статус')}>
                    <EntityStatus kind="request" status={r.status} />
                  </DetailRow>
                  <DetailRow label={t('Muammo', 'Проблема')}>{problemLabel(r.problem_key)}</DetailRow>
                  {r.description ? <DetailRow label={t('Tavsif', 'Описание')}>{r.description}</DetailRow> : null}
                  {r.preferred_time ? <DetailRow label={t('Qulay vaqt', 'Удобное время')}>{r.preferred_time}</DetailRow> : null}
                  <DetailRow label={t('Kafolat', 'Гарантия')}>{r.in_warranty ? t('Kafolat ichida', 'На гарантии') : t('Kafolatdan tashqari', 'Вне гарантии')}</DetailRow>
                  <DetailRow label={t('Mijoz', 'Клиент')}>{r.customer_name}</DetailRow>
                  <DetailRow label={t('Telefon', 'Телефон')}>
                    <PhoneLink phone={r.client_phone} />
                  </DetailRow>
                  <DetailRow label={t('Yaratilgan', 'Создана')}>{formatDate(r.created_at)}</DetailRow>
                  {r.store_note ? <DetailRow label={t('Izoh', 'Комментарий')}>{r.store_note}</DetailRow> : null}
                  {r.is_paid !== null ? <DetailRow label={t("To'lov", 'Оплата')}>{r.is_paid ? formatSom(r.amount) : t('Bepul', 'Бесплатно')}</DetailRow> : null}
                  {r.rating ? <DetailRow label={t('Baho', 'Оценка')}>{`${r.rating}/5${r.rating_comment ? `, ${r.rating_comment}` : ''}`}</DetailRow> : null}
                </DetailRows>

                {role !== 'master' ? (
                  <Button asChild variant="outline">
                    <Link to={`/passports/${r.passport_id}`}>{t('Pasportni ochish', 'Открыть паспорт')}</Link>
                  </Button>
                ) : null}

                {open && works ? (
                  <div className="flex flex-col gap-2">
                    {manages && r.status === 'new' ? (
                      <Button disabled={busy} onClick={() => void run(() => rpc('accept_request', { p_request_id: r.id }))}>
                        <CheckCircle2 />
                        {t('Qabul qilish', 'Принять')}
                      </Button>
                    ) : null}
                    {manages && ['new', 'accepted', 'assigned'].includes(r.status) ? (
                      <Button variant="outline" onClick={() => setAction('assign')}>
                        <UserCheck />
                        {r.status === 'assigned' ? t('Ijrochini almashtirish', 'Сменить исполнителя') : t('Ijrochi tayinlash', 'Назначить исполнителя')}
                      </Button>
                    ) : null}
                    {['accepted', 'assigned'].includes(r.status) ? (
                      <Button variant="outline" disabled={busy} onClick={() => void run(() => rpc('set_request_status', { p_request_id: r.id, p_status: 'in_progress' }))}>
                        <Hammer />
                        {t('Ishni boshlash', 'Взять в работу')}
                      </Button>
                    ) : null}
                    {['accepted', 'assigned', 'in_progress'].includes(r.status) ? (
                      <Button variant="outline" onClick={() => setAction('done')}>
                        <CheckCircle2 />
                        {t('Bajarildi', 'Выполнено')}
                      </Button>
                    ) : null}
                    {manages ? (
                      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setAction('reject')}>
                        <XCircle />
                        {t('Rad etish', 'Отклонить')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </LoadState>
        </div>
      </SheetContent>

      {action === 'assign' && r ? <AssignModal request={r} onClose={() => setAction(null)} onDone={() => void changed()} /> : null}
      {action === 'done' && r ? <DoneModal request={r} onClose={() => setAction(null)} onDone={() => void changed()} /> : null}
      {action === 'reject' && r ? (
        <ReasonModal
          title={t('Arizani rad etish', 'Отклонить заявку')}
          submitLabel={t('Rad etish', 'Отклонить')}
          onClose={() => setAction(null)}
          onSubmit={async (reason) => {
            await rpc('set_request_status', { p_request_id: r.id, p_status: 'rejected', p_note: reason });
            await changed();
          }}
        />
      ) : null}
    </Sheet>
  );
}

function AssignModal({ request, onClose, onDone }: { request: RequestDetail; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [choice, setChoice] = useState(request.assignee_id ? `m:${request.assignee_id}` : request.provider_id ? `p:${request.provider_id}` : '');

  const { data } = useLoad(async () => {
    const [masters, providers] = await Promise.all([
      supabase.from('store_members').select('id, full_name').eq('role', 'master').eq('is_active', true).order('full_name'),
      supabase.from('service_providers').select('id, name').eq('is_active', true).order('name'),
    ]);
    return {
      masters: rows<{ id: string; full_name: string | null }>(masters),
      providers: rows<{ id: string; name: string }>(providers),
    };
  }, []);

  const options = [
    ...(data?.masters ?? []).map((m) => ({ value: `m:${m.id}`, label: `${t('Usta', 'Мастер')}: ${m.full_name ?? '—'}` })),
    ...(data?.providers ?? []).map((p) => ({ value: `p:${p.id}`, label: `${t('Servis', 'Сервис')}: ${p.name}` })),
  ];

  return (
    <FormModal
      title={t('Ijrochi tayinlash', 'Назначить исполнителя')}
      description={t('Mijozga xabar yuboriladi.', 'Клиент получит уведомление.')}
      submitLabel={t('Tayinlash', 'Назначить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('assign_request', {
          p_request_id: request.id,
          p_member_id: choice.startsWith('m:') ? choice.slice(2) : null,
          p_provider_id: choice.startsWith('p:') ? choice.slice(2) : null,
        });
        onDone();
      }}
    >
      {data && options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("Ustalar va servis markazlari yo'q. Ularni sozlamalarda yoki servis markazlari bo'limida qo'shing.", 'Нет мастеров и сервисных центров. Добавьте их в настройках или в разделе «Сервисные центры».')}
        </p>
      ) : (
        <FormField label={t('Ijrochi', 'Исполнитель')}>
          <SelectField value={choice} onChange={setChoice} placeholder={t('Tanlang', 'Выберите')} options={options} />
        </FormField>
      )}
    </FormModal>
  );
}

function DoneModal({ request, onClose, onDone }: { request: RequestDetail; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [paid, setPaid] = useState(!request.in_warranty);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <FormModal
      title={t('Ariza bajarildi', 'Заявка выполнена')}
      description={request.type === 'maintenance' ? t('Keyingi xizmat sanasi avtomatik hisoblanadi.', 'Дата следующего обслуживания посчитается сама.') : undefined}
      submitLabel={t('Yakunlash', 'Завершить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('set_request_status', {
          p_request_id: request.id,
          p_status: 'done',
          p_note: note || null,
          p_is_paid: paid,
          p_amount: paid && amount ? Number(amount) : null,
        });
        onDone();
      }}
    >
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        {t("Pullik xizmat", 'Платная работа')}
        <Switch checked={paid} onCheckedChange={setPaid} />
      </label>
      {paid ? (
        <FormField label={t("Summa, so'm", 'Сумма, сум')} htmlFor="done-amount">
          <Input id="done-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
      ) : null}
      <FormField label={t('Izoh', 'Комментарий')} htmlFor="done-note">
        <Input id="done-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </FormModal>
  );
}

function ProvidersDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState<Provider | 'new' | null>(null);
  const { data, error, loading, reload } = useLoad(
    async () => rows<Provider>(await supabase.from('service_providers').select('id, name, phone, note, is_active').order('name')),
    [],
  );

  return (
    <>
      <Dialog open onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('Servis markazlari', 'Сервисные центры')}</DialogTitle>
            <DialogDescription>{t('Arizani ularga ham biriktirish mumkin.', 'На них тоже можно назначать заявки.')}</DialogDescription>
          </DialogHeader>
          <LoadState loading={loading} error={error} empty={(data ?? []).length === 0} emptyText={t("Hali servis markazlari yo'q", 'Сервисных центров пока нет')} onRetry={() => void reload()}>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableBody>
                  {(data ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone ?? '—'}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={p.is_active ? 'good' : 'neutral'} label={p.is_active ? t('Faol', 'Активен') : t("O'chirilgan", 'Отключён')} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" aria-label={t('Tahrirlash', 'Изменить')} onClick={() => setEditing(p)}>
                          <Pencil />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </LoadState>
          <Button variant="outline" className="self-start" onClick={() => setEditing('new')}>
            <Plus />
            {t("Qo'shish", 'Добавить')}
          </Button>
        </DialogContent>
      </Dialog>
      {editing ? <ProviderForm provider={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => void reload()} /> : null}
    </>
  );
}

function ProviderForm({ provider, onClose, onDone }: { provider: Provider | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ name: provider?.name ?? '', phone: provider?.phone ?? '', note: provider?.note ?? '', is_active: provider?.is_active ?? true });

  return (
    <FormModal
      title={provider ? t('Servis markazi', 'Сервисный центр') : t('Yangi servis markazi', 'Новый сервисный центр')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('upsert_service_provider', { p_id: provider?.id ?? null, p_name: form.name, p_phone: form.phone || null, p_note: form.note || null, p_is_active: form.is_active });
        onDone();
      }}
    >
      <FormField label={t('Nomi', 'Название')} htmlFor="sp-name">
        <Input id="sp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label={t('Telefon', 'Телефон')} htmlFor="sp-phone">
        <Input id="sp-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </FormField>
      <FormField label={t('Izoh', 'Заметка')} htmlFor="sp-note">
        <Input id="sp-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </FormField>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        {t('Faol', 'Активен')}
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
      </label>
    </FormModal>
  );
}
