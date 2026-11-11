import { useEffect, useState, type ChangeEvent } from 'react';
import { CheckCircle2, ExternalLink, ImagePlus, Link2, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PeriodToggle, StatCard, TrendCard } from '@/components/app/charts';
import { FormField, FormModal, LoadState, PageHeader, SelectField, StatusBadge } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatNumber, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { formatLocation, parseLocation } from '@/lib/location';
import { callFunction, mediaUrl, rows, rpc, supabase, uploadStoreImage } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { CopyButton } from '../components/bits';
import { useRoleLabel } from '../components/Layout';
import { loadStats, type StoreDashboard } from '../lib/stats';
import { useAuthStore, useRole, type StoreRole } from '../store/useAuthStore';

export default function SettingsPage() {
  const t = useT();
  const { manages } = useRole();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'telegram';

  return (
    <>
      <PageHeader title={t('Sozlamalar', 'Настройки')} />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            {manages ? <TabsTrigger value="shop">{t("Do'kon sahifasi", 'Страница магазина')}</TabsTrigger> : null}
            {manages ? <TabsTrigger value="branches">{t('Filiallar', 'Точки')}</TabsTrigger> : null}
            {manages ? <TabsTrigger value="staff">{t('Xodimlar', 'Сотрудники')}</TabsTrigger> : null}
            {manages ? <TabsTrigger value="balance">{t('Balans', 'Баланс')}</TabsTrigger> : null}
          </TabsList>
        </div>
        <TabsContent value="telegram" className="pt-2">
          <TelegramTab />
        </TabsContent>
        {manages ? (
          <>
            <TabsContent value="shop" className="pt-2">
              <ShopTab />
            </TabsContent>
            <TabsContent value="branches" className="pt-2">
              <BranchesTab />
            </TabsContent>
            <TabsContent value="staff" className="pt-2">
              <StaffTab />
            </TabsContent>
            <TabsContent value="balance" className="pt-2">
              <BalanceTab />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </>
  );
}

function TelegramTab() {
  const t = useT();
  const linked = useAuthStore((s) => s.member?.tg_id);
  const refresh = useAuthStore((s) => s.refresh);
  const [link, setLink] = useState<{ code: string; bot: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // One bot for clients and dealers: the code sent to it turns the dealer mode on.
  const createLink = async () => {
    setBusy(true);
    try {
      const bots = rows<{ bot: string; bot_username: string | null }>(await supabase.from('tg_bots').select('bot, bot_username').eq('bot', 'client'));
      const bot = bots[0]?.bot_username;
      if (!bot) {
        toast.error(t('Telegram bot hali sozlanmagan. Platformaga murojaat qiling.', 'Telegram-бот ещё не настроен. Обратитесь к платформе.'));
        return;
      }
      setLink({ code: await rpc<string>('create_tg_link_code'), bot });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('Telegramni ulash', 'Привязка Telegram')}</CardTitle>
        <CardDescription>
          {t(
            "Ariza va buyurtmalar haqida xabar oling. Metkaga tegsangiz, bot uni faollashtirish tugmasini yuboradi.",
            'Уведомления о заявках и заказах. Если коснуться метки, бот пришлёт кнопку для её активации.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {linked ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            {t('Telegram ulangan', 'Telegram привязан')}
          </p>
        ) : null}
        {link ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t(`Bu kodni @${link.bot} botiga yuboring yoki tugmani bosing. Kod 15 daqiqa ishlaydi.`, `Отправьте этот код боту @${link.bot} или нажмите кнопку. Код действует 15 минут.`)}
            </p>
            <p className="font-mono text-3xl font-semibold tracking-widest">
              {link.code.slice(0, 4)}-{link.code.slice(4)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={`https://t.me/${link.bot}?start=m_${link.code}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  {t('Botni ochish', 'Открыть бота')}
                </a>
              </Button>
              <CopyButton value={link.code} label={t('Kodni nusxalash', 'Скопировать код')} />
              <Button variant="outline" onClick={() => void refresh()}>
                <RefreshCw />
                {t('Tekshirish', 'Проверить')}
              </Button>
            </div>
          </>
        ) : (
          <Button className="self-start" variant={linked ? 'outline' : 'default'} onClick={() => void createLink()} disabled={busy}>
            {busy ? <Spinner /> : <Link2 />}
            {linked ? t('Boshqa Telegramni ulash', 'Привязать другой Telegram') : t('Kod olish', 'Получить код')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ShopSettings {
  is_open: boolean;
  logo_path?: string | null;
  about?: string | null;
  delivery_terms?: string | null;
}

function ShopTab() {
  const t = useT();
  const store = useAuthStore((s) => s.store);
  const { data, error, loading, reload } = useLoad(() => rpc<ShopSettings>('store_shop_settings'), []);
  const [form, setForm] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !store) return;
    setUploading(true);
    try {
      const path = await uploadStoreImage(store.id, file);
      setForm((f) => (f ? { ...f, logo_path: path } : f));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await rpc('upsert_shop_settings', { p_data: form });
      toast.success(t('Saqlandi', 'Сохранено'));
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LoadState loading={loading} error={error} empty={!form} emptyText="" onRetry={() => void reload()}>
      {form ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t("Do'kon sahifasi", 'Страница магазина')}</CardTitle>
            <CardDescription>{t("Mijozlar do'koningizni shunday ko'radi.", 'Так клиенты видят ваш магазин.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>
                <span className="block font-medium">{t("Do'kon ochiq", 'Магазин открыт')}</span>
                <span className="text-muted-foreground">{t("Yopilsa, mijozlar mahsulotlaringizni ko'rmaydi.", 'Если закрыть, клиенты перестанут видеть ваши товары.')}</span>
              </span>
              <Switch checked={form.is_open} onCheckedChange={(v) => setForm({ ...form, is_open: v })} />
            </label>
            <FormField label={t('Logotip', 'Логотип')}>
              <div className="flex items-center gap-3">
                {form.logo_path ? <img src={mediaUrl(form.logo_path)} alt="" className="size-16 rounded-md border object-contain" /> : null}
                <Button asChild variant="outline" disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Spinner /> : <ImagePlus />}
                    {t('Yuklash', 'Загрузить')}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onLogo(e)} disabled={uploading} />
                  </label>
                </Button>
              </div>
            </FormField>
            <FormField label={t("Do'kon haqida", 'О магазине')} htmlFor="shop-about">
              <Textarea id="shop-about" rows={3} value={form.about ?? ''} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            </FormField>
            <FormField label={t('Yetkazib berish shartlari', 'Условия доставки')} htmlFor="shop-delivery">
              <Textarea id="shop-delivery" rows={3} value={form.delivery_terms ?? ''} onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })} />
            </FormField>
            <Button className="self-start" onClick={() => void save()} disabled={saving || uploading}>
              {saving ? <Spinner /> : null}
              {t('Saqlash', 'Сохранить')}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </LoadState>
  );
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_default: boolean;
  is_active: boolean;
  lat: number | null;
  lon: number | null;
}

function BranchesTab() {
  const t = useT();
  const { isOwner } = useRole();
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const { data, error, loading, reload } = useLoad(
    async () => rows<Branch>(await supabase.from('branches').select('id, name, address, phone, is_default, is_active, lat, lon').order('is_default', { ascending: false }).order('name')),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      {isOwner ? (
        <Button className="self-start" onClick={() => setEditing('new')}>
          <Plus />
          {t('Yangi filial', 'Новая точка')}
        </Button>
      ) : null}
      <LoadState loading={loading} error={error} empty={(data ?? []).length === 0} emptyText={t("Hali filiallar yo'q", 'Точек пока нет')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Filial', 'Точка')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('Telefon', 'Телефон')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
                {isOwner ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">
                      {b.name}
                      {b.is_default ? <span className="ml-2 text-xs font-normal text-muted-foreground">{t('asosiy', 'основная')}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{b.address ?? '—'}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{b.phone ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge tone={b.is_active ? 'good' : 'neutral'} label={b.is_active ? t('Faol', 'Работает') : t('Yopilgan', 'Закрыта')} />
                  </TableCell>
                  {isOwner ? (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={t('Tahrirlash', 'Изменить')} onClick={() => setEditing(b)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </LoadState>
      {editing ? <BranchForm branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => void reload()} /> : null}
    </div>
  );
}

function BranchForm({ branch, onClose, onDone }: { branch: Branch | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    name: branch?.name ?? '',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
    is_default: branch?.is_default ?? false,
    is_active: branch?.is_active ?? true,
    location: formatLocation(branch?.lat, branch?.lon),
  });

  return (
    <FormModal
      title={branch ? t('Filialni tahrirlash', 'Изменить точку') : t('Yangi filial', 'Новая точка')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        const { location, ...data } = form;
        await rpc('upsert_branch', { p_id: branch?.id ?? null, p_data: { ...data, ...parseLocation(location) } });
        onDone();
      }}
    >
      <FormField label={t('Nomi', 'Название')} htmlFor="b-name">
        <Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label={t('Manzil', 'Адрес')} htmlFor="b-address">
        <Input id="b-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </FormField>
      <FormField
        label={t('Lokatsiya', 'Локация')}
        htmlFor="b-location"
        hint={t("Kenglik va uzunlik, xaritadan nusxalang. Mijoz shu nuqtani navigatorda ochadi.", 'Широта и долгота, скопируйте с карты. Клиент откроет эту точку в навигаторе.')}
      >
        <Input id="b-location" inputMode="decimal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="41.311081, 69.240562" />
      </FormField>
      <FormField label={t('Telefon', 'Телефон')} htmlFor="b-phone">
        <Input id="b-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </FormField>
      {branch?.is_default ? null : (
        <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {t('Asosiy filial', 'Основная точка')}
          <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
        </label>
      )}
      {branch ? (
        <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {t('Ishlayapti', 'Работает')}
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        </label>
      ) : null}
    </FormModal>
  );
}

interface StaffMember {
  id: string;
  full_name: string | null;
  role: StoreRole;
  branch_id: string | null;
  tg_id: number | null;
  is_active: boolean;
}

const HIRED_ROLES: StoreRole[] = ['manager', 'seller', 'warehouse', 'master'];

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function StaffTab() {
  const t = useT();
  const roleLabel = useRoleLabel();
  const { isOwner } = useRole();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);

  const { data, error, loading, reload } = useLoad(async () => {
    const [members, branches] = await Promise.all([
      supabase.from('store_members').select('id, full_name, role, branch_id, tg_id, is_active').order('created_at'),
      supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
    ]);
    return { members: rows<StaffMember>(members), branches: rows<{ id: string; name: string }>(branches) };
  }, []);

  const branchName = (id: string | null) => data?.branches.find((b) => b.id === id)?.name ?? '—';

  return (
    <div className="flex flex-col gap-3">
      {isOwner ? (
        <Button className="self-start" onClick={() => setAdding(true)}>
          <Plus />
          {t('Yangi xodim', 'Новый сотрудник')}
        </Button>
      ) : null}
      <LoadState loading={loading} error={error} empty={!data} emptyText="" onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Xodim', 'Сотрудник')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Filial', 'Точка')}</TableHead>
                <TableHead className="hidden sm:table-cell">Telegram</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
                {isOwner ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.members ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium">{m.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(m.role)}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{branchName(m.branch_id)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{m.tg_id ? t('Ulangan', 'Привязан') : t("Yo'q", 'Нет')}</TableCell>
                  <TableCell>
                    <StatusBadge tone={m.is_active ? 'good' : 'neutral'} label={m.is_active ? t('Faol', 'Активен') : t("O'chirilgan", 'Отключён')} />
                  </TableCell>
                  {isOwner ? (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={t('Tahrirlash', 'Изменить')} onClick={() => setEditing(m)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </LoadState>

      {adding ? (
        <AddStaff
          branches={data?.branches ?? []}
          onClose={() => setAdding(false)}
          onCreated={(login, password) => {
            setCredentials({ login, password });
            void reload();
          }}
        />
      ) : null}
      {editing ? <EditStaff member={editing} branches={data?.branches ?? []} onClose={() => setEditing(null)} onDone={() => void reload()} /> : null}
      {credentials ? (
        <Dialog open onOpenChange={(open) => !open && setCredentials(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('Kirish maʼlumotlari', 'Данные для входа')}</DialogTitle>
              <DialogDescription>{t("Parol boshqa ko'rsatilmaydi. Xodimga hozir bering.", 'Пароль больше не покажем. Передайте его сотруднику сейчас.')}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 font-mono text-sm break-all">
                {credentials.login} / {credentials.password}
              </p>
              <CopyButton value={`${credentials.login} / ${credentials.password}`} />
            </div>
            <DialogFooter>
              <Button onClick={() => setCredentials(null)}>{t('Tayyor', 'Готово')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function AddStaff({ branches, onClose, onCreated }: { branches: { id: string; name: string }[]; onClose: () => void; onCreated: (login: string, password: string) => void }) {
  const t = useT();
  const roleLabel = useRoleLabel();
  const storeId = useAuthStore((s) => s.store?.id);
  const [form, setForm] = useState({ full_name: '', login: '', password: randomPassword(), role: 'seller', branch_id: '' });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <FormModal
      title={t('Yangi xodim', 'Новый сотрудник')}
      submitLabel={t('Yaratish', 'Создать')}
      onClose={onClose}
      onSubmit={async () => {
        await callFunction('create-staff', { store_id: storeId, ...form, branch_id: form.branch_id || null });
        onCreated(form.login.trim().toLowerCase(), form.password);
      }}
    >
      <FormField label={t('Ism', 'Имя')} htmlFor="s-name">
        <Input id="s-name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
      </FormField>
      <FormField label={t('Rol', 'Роль')}>
        <SelectField value={form.role} onChange={(v) => set('role', v)} options={HIRED_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))} />
      </FormField>
      {branches.length > 0 ? (
        <FormField label={t('Filial', 'Точка')}>
          <SelectField value={form.branch_id} onChange={(v) => set('branch_id', v)} options={[{ value: '', label: t('Tanlanmagan', 'Не выбрана') }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        </FormField>
      ) : null}
      <FormField label={t('Login', 'Логин')} htmlFor="s-login" hint={t('Lotin harflari, raqamlar, nuqta, chiziqcha', 'Латинские буквы, цифры, точка, дефис')}>
        <Input id="s-login" autoCapitalize="none" value={form.login} onChange={(e) => set('login', e.target.value)} required autoComplete="off" />
      </FormField>
      <FormField label={t('Parol', 'Пароль')} htmlFor="s-password">
        <Input id="s-password" className="font-mono" value={form.password} onChange={(e) => set('password', e.target.value)} required autoComplete="off" />
      </FormField>
    </FormModal>
  );
}

function EditStaff({ member, branches, onClose, onDone }: { member: StaffMember; branches: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const roleLabel = useRoleLabel();
  const [form, setForm] = useState({ full_name: member.full_name ?? '', role: member.role as string, branch_id: member.branch_id ?? '', is_active: member.is_active });
  // Only the platform makes or unmakes owners.
  const isOwnerRow = member.role === 'owner';

  return (
    <FormModal
      title={t('Xodimni tahrirlash', 'Изменить сотрудника')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('update_store_member', { p_member_id: member.id, p_role: form.role, p_full_name: form.full_name, p_branch_id: form.branch_id || null, p_is_active: form.is_active });
        onDone();
      }}
    >
      <FormField label={t('Ism', 'Имя')} htmlFor="e-name">
        <Input id="e-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </FormField>
      {isOwnerRow ? null : (
        <FormField label={t('Rol', 'Роль')}>
          <SelectField value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={HIRED_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))} />
        </FormField>
      )}
      {branches.length > 0 ? (
        <FormField label={t('Filial', 'Точка')}>
          <SelectField value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} options={[{ value: '', label: t('Tanlanmagan', 'Не выбрана') }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        </FormField>
      ) : null}
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        {t('Faol', 'Активен')}
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
      </label>
    </FormModal>
  );
}

interface LedgerRow {
  id: number;
  amount: number;
  type: string;
  note: string | null;
  created_at: string;
}

const LEDGER_LABEL: Record<string, [uz: string, ru: string]> = {
  purchase: ['Xarid', 'Покупка'],
  activation: ['Faollashtirish', 'Активация'],
  void_refund: ['Bekor qilish', 'Отмена активации'],
  bonus: ['Bonus', 'Бонус'],
  adjustment: ['Tuzatish', 'Корректировка'],
};

function BalanceTab() {
  const t = useT();
  const [days, setDays] = useState(30);

  const { data: stats } = useLoad(() => loadStats(days), [days]);
  const { data, error, loading, reload } = useLoad(async () => {
    const [dashboard, ledger, payments, sales] = await Promise.all([
      rpc<StoreDashboard>('store_dashboard'),
      supabase.from('passport_ledger').select('id, amount, type, note, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('store_payments').select('id, amount, method, purpose, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('tag_sales').select('id, quantity, passports_granted, price_total, created_at').order('created_at', { ascending: false }).limit(50),
    ]);
    return {
      dashboard,
      ledger: rows<LedgerRow>(ledger),
      payments: rows<{ id: string; amount: number; method: string; purpose: string; created_at: string }>(payments),
      sales: rows<{ id: string; quantity: number; passports_granted: number; price_total: number; created_at: string }>(sales),
    };
  }, []);

  const series = stats?.series ?? [];

  return (
    <LoadState loading={loading} error={error} empty={!data} emptyText="" onRetry={() => void reload()}>
      {data ? (
        <>
          <div className="flex justify-end">
            <PeriodToggle value={days} onChange={setDays} />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <StatCard
              label={t('Pasport balansi', 'Баланс паспортов')}
              value={data.dashboard.passport_balance ?? 0}
              hint={t(`Bo'sh metkalar: ${formatNumber(data.dashboard.tags_free ?? 0)}`, `Свободных меток: ${formatNumber(data.dashboard.tags_free ?? 0)}`)}
              trend={{ data: series, key: 'balance' }}
              mode="last"
            />
            <TrendCard
              className="xl:col-span-2"
              title={t('Balans dinamikasi', 'Как менялся баланс')}
              data={series}
              series={[{ key: 'balance', label: t('Balans', 'Баланс'), color: 'var(--chart-1)' }]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('Balans harakati', 'Движение баланса')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Sana', 'Дата')}</TableHead>
                    <TableHead>{t('Amal', 'Операция')}</TableHead>
                    <TableHead className="text-right">{t('Soni', 'Кол-во')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('Izoh', 'Примечание')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ledger.map((l) => {
                    const label = LEDGER_LABEL[l.type];
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{formatDate(l.created_at)}</TableCell>
                        <TableCell>{label ? t(label[0], label[1]) : l.type}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.amount > 0 ? `+${l.amount}` : l.amount}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{l.note ?? ''}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('Metka partiyalari', 'Партии меток')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.sales.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hali yo'q", 'Пока нет')}</p> : null}
                {data.sales.map((s) => (
                  <div key={s.id} className="flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0">
                    <span>
                      {formatDate(s.created_at)} · {t(`${s.quantity} metka, ${s.passports_granted} pasport`, `${s.quantity} меток, ${s.passports_granted} паспортов`)}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatSom(s.price_total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("To'lovlar", 'Платежи')}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.payments.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hali yo'q", 'Пока нет')}</p> : null}
                {data.payments.map((p) => (
                  <div key={p.id} className="flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0">
                    <span>
                      {formatDate(p.created_at)} · {p.purpose}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatSom(p.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </LoadState>
  );
}
