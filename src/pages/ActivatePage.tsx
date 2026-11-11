import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Camera, CheckCircle2, CircleAlert, Nfc, Printer, ScanLine, Search, Smartphone, X } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FormField, LoadState, PageHeader, SelectField } from '@/components/app/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatPhone, formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { mediaUrl, rows, rpc, supabase, uploadStoreImage } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { addMonths, CopyButton, DetailRow, DetailRows, ProductThumb, todayInTashkent, useProviderLabel, useProviderOptions } from '../components/bits';
import { nfcSupported, readToken, tokenFromUrl } from '../lib/nfc';
import { useAuthStore, useRole } from '../store/useAuthStore';

interface ScanResult {
  result: 'ok' | 'blocked' | 'not_found';
  tag_code?: string;
  status?: string;
  can_activate?: boolean;
  has_balance?: boolean;
  rate_limited?: boolean;
  ticket?: string | null;
}

interface Activation {
  passport_id: string;
  warranty_code: string;
  tag_code: string;
  warranty_until: string;
}

interface CatalogProduct {
  id: string;
  name_uz?: string;
  name_ru?: string;
  model: string;
  brand_name: string;
  price?: number;
  images?: string[];
  warranty_months?: number;
  warranty_provider?: string;
  warranty_terms?: string;
  maintenance_interval_months?: number;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning'; foreign: boolean }
  | { kind: 'checking' }
  | { kind: 'refused'; title: string; text: string; tagCode?: string }
  | { kind: 'form'; tagCode: string; ticket: string }
  | { kind: 'done'; result: Activation; phone: string };

export default function ActivatePage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={role === 'master' ? '/requests' : '/products'} replace />;
  return <Activate />;
}

function Activate() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [scanError, setScanError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const started = useRef(false);

  const check = async (token: string) => {
    setPhase({ kind: 'checking' });
    try {
      const scan = await rpc<ScanResult>('scan_tag', { p_token: token });
      setPhase(judge(scan));
    } catch (err) {
      setPhase({ kind: 'refused', title: t('Tekshirib bo\'lmadi', 'Не удалось проверить'), text: errorMessage(err) });
    }
  };

  const judge = (scan: ScanResult): Phase => {
    const refuse = (title: string, text: string): Phase => ({ kind: 'refused', title, text, tagCode: scan.tag_code });
    if (scan.result === 'not_found') {
      return refuse(t('Metka topilmadi', 'Метка не найдена'), t("Bu metka sizning do'koningizga tegishli emas.", 'Эта метка не относится к вашему магазину.'));
    }
    if (scan.result === 'blocked') {
      return refuse(t('Metka bloklangan', 'Метка заблокирована'), t('Platformaga murojaat qiling.', 'Обратитесь к платформе.'));
    }
    if (scan.status === 'activated') {
      return refuse(t('Metka allaqachon faollashtirilgan', 'Метка уже активирована'), t("Pasportni qidiruv orqali oching.", 'Откройте паспорт через поиск.'));
    }
    if (!scan.can_activate) {
      return refuse(t("Faollashtirib bo'lmaydi", 'Активировать нельзя'), t("Do'kon faol emas yoki sizda ruxsat yo'q.", 'Магазин не активен или у вас нет прав.'));
    }
    if (!scan.has_balance) {
      return refuse(t('Pasport balansi tugagan', 'На балансе нет паспортов'), t('Yangi partiya uchun platformaga murojaat qiling.', 'За новой партией обратитесь к платформе.'));
    }
    if (scan.rate_limited || !scan.ticket) {
      return refuse(t('Juda ko\'p skanerlash', 'Слишком много сканов'), t("Bu metka bir soatda ko'p marta skanerlangan. Keyinroq urinib ko'ring.", 'Эту метку сканировали слишком часто за час. Попробуйте позже.'));
    }
    return { kind: 'form', tagCode: scan.tag_code ?? '', ticket: scan.ticket };
  };

  // The button in the Mini App opens this page with the token: it goes straight to the check.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const raw = params.get('token');
    if (!raw) return;
    setParams({}, { replace: true });
    if (/^[0-9a-f]{32}$/i.test(raw)) void check(raw.toLowerCase());
    else setPhase({ kind: 'refused', title: t('Metka topilmadi', 'Метка не найдена'), text: t("Havola noto'g'ri.", 'Неверная ссылка.') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  const startScan = async () => {
    setScanError(null);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ kind: 'scanning', foreign: false });
    try {
      const token = await readToken(controller.signal, () => setPhase({ kind: 'scanning', foreign: true }));
      controller.abort();
      await check(token);
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === 'AbortError') return;
      setPhase({ kind: 'idle' });
      setScanError(
        name === 'NotAllowedError'
          ? t('NFC uchun ruxsat bering: brauzer sozlamalari, Sayt sozlamalari, NFC.', 'Разрешите NFC: настройки браузера, настройки сайтов, NFC.')
          : t("Telefon sozlamalarida NFC yoqilganini tekshiring.", 'Проверьте, что NFC включён в настройках телефона.'),
      );
    }
  };

  const cancelScan = () => {
    abort.current?.abort();
    setPhase({ kind: 'idle' });
  };

  const reset = () => setPhase({ kind: 'idle' });

  return (
    <>
      <PageHeader title={t('Pasportni faollashtirish', 'Активация паспорта')} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {phase.kind === 'idle' ? <ScanStart error={scanError} onScan={() => void startScan()} onPasted={(token) => void check(token)} /> : null}
        {phase.kind === 'scanning' ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="relative flex size-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                <Nfc className="size-10" />
              </div>
              <div>
                <p className="text-lg font-medium">{t('Metkaga teging', 'Приложите телефон к метке')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {phase.foreign
                    ? t('Bu YECHIM metkasi emas. Boshqasini tutib turing.', 'Это не метка YECHIM. Приложите другую.')
                    : t('Havola ochilmaydi: faqat metka tekshiriladi.', 'Ссылка не откроется: только проверка метки.')}
                </p>
              </div>
              <Button variant="outline" onClick={cancelScan}>
                <X />
                {t('Bekor qilish', 'Отмена')}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {phase.kind === 'checking' ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-10">
              <Spinner />
              {t('Metka tekshirilmoqda', 'Проверяем метку')}
            </CardContent>
          </Card>
        ) : null}
        {phase.kind === 'refused' ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>{phase.title}</EmptyTitle>
              <EmptyDescription>
                {phase.text}
                {phase.tagCode ? <span className="mt-1 block font-mono text-xs">{phase.tagCode}</span> : null}
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={reset}>
              <ScanLine />
              {t('Boshqa metka', 'Другая метка')}
            </Button>
          </Empty>
        ) : null}
        {phase.kind === 'form' ? (
          <ActivationForm
            tagCode={phase.tagCode}
            ticket={phase.ticket}
            onDone={(result, phone) => setPhase({ kind: 'done', result, phone })}
            onExpired={() =>
              setPhase({ kind: 'refused', title: t('Skanerlash muddati tugadi', 'Время скана истекло'), text: t('Metkani qayta skanerlang: kiritilgan maʼlumotlar saqlanmadi.', 'Отсканируйте метку ещё раз: введённые данные не сохранились.') })
            }
            onCancel={reset}
          />
        ) : null}
        {phase.kind === 'done' ? <Done result={phase.result} phone={phase.phone} onNext={reset} /> : null}
      </div>
    </>
  );
}

function ScanStart({ error, onScan, onPasted }: { error: string | null; onScan: () => void; onPasted: (token: string) => void }) {
  const t = useT();
  const supported = nfcSupported();
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            {t('Bu brauzerda skanerlash ishlamaydi', 'В этом браузере скан не работает')}
          </CardTitle>
          <CardDescription>{t('NFC skaneri faqat Android telefondagi Chrome brauzerida ishlaydi.', 'Сканер NFC работает только в Chrome на телефоне Android.')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">iPhone: </span>
            {t(
              'telefonni metkaga tuting: Telegram ochiladi va bot «Faollashtirish» tugmasini yuboradi. Buning uchun Telegram sozlamalarda ulangan bo\'lishi kerak.',
              'приложите телефон к метке: откроется Telegram, и бот пришлёт кнопку «Активировать». Для этого Telegram должен быть привязан в настройках.',
            )}
          </p>
          <Button asChild variant="outline" className="self-start">
            <Link to="/settings">{t('Telegramni ulash', 'Привязать Telegram')}</Link>
          </Button>
          <form
            className="flex flex-col gap-2 border-t pt-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              const token = tokenFromUrl(link);
              setLinkError(!token);
              if (token) onPasted(token);
            }}
          >
            <FormField label={t('Metka havolasi', 'Ссылка метки')} htmlFor="tag-link" hint={t('Metka havolasini boshqa dastur bilan oʻqigan boʻlsangiz', 'Если вы прочитали ссылку метки другим приложением')}>
              <Input id="tag-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://t.me/…?start=t_…" />
            </FormField>
            {linkError ? <p className="text-sm text-destructive">{t('Bu YECHIM metkasi havolasi emas', 'Это не ссылка метки YECHIM')}</p> : null}
            <Button type="submit" variant="outline" className="self-start" disabled={!link.trim()}>
              {t('Tekshirish', 'Проверить')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <Nfc className="size-12 text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">{t('Metkani skanerlang', 'Отсканируйте метку')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('Tugmani bosing va telefonni texnikadagi metkaga tuting.', 'Нажмите кнопку и приложите телефон к метке на технике.')}</p>
        </div>
        {error ? (
          <Alert variant="destructive" className="text-left">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button size="lg" onClick={onScan}>
          <ScanLine />
          {t('Skanerlash', 'Сканировать')}
        </Button>
      </CardContent>
    </Card>
  );
}

function CatalogPicker({ selected, onSelect }: { selected: CatalogProduct | null; onSelect: (p: CatalogProduct | null) => void }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, error, loading, reload } = useLoad(() => rpc<CatalogProduct[]>('store_products', { p_search: search || null, p_limit: 20 }), [search]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <ProductThumb path={selected.images?.[0]} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{t(selected.name_uz ?? selected.name_ru ?? '', selected.name_ru ?? selected.name_uz ?? '')}</p>
          <p className="truncate text-sm text-muted-foreground">
            {selected.brand_name} {selected.model}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={t('Boshqasini tanlash', 'Выбрать другой')} onClick={() => onSelect(null)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Nomi, model yoki artikul', 'Название, модель или артикул')} />
      </div>
      <LoadState loading={loading} error={error} empty={(data ?? []).length === 0} emptyText={t('Mahsulot topilmadi. "Qo\'lda" bo\'limida kiriting.', 'Товар не найден. Введите его на вкладке «Вручную».')} onRetry={() => void reload()}>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {(data ?? []).map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect(p)} className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent">
              <ProductThumb path={p.images?.[0]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t(p.name_uz ?? p.name_ru ?? '', p.name_ru ?? p.name_uz ?? '')}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.brand_name} {p.model}
                </p>
              </div>
              {p.price ? <span className="shrink-0 text-sm text-muted-foreground">{formatSom(p.price)}</span> : null}
            </button>
          ))}
        </div>
      </LoadState>
    </div>
  );
}

function ActivationForm({ tagCode, ticket, onDone, onExpired, onCancel }: {
  tagCode: string;
  ticket: string;
  onDone: (result: Activation, phone: string) => void;
  onExpired: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const providerOptions = useProviderOptions();
  const providerLabel = useProviderLabel();
  const store = useAuthStore((s) => s.store);
  const serialRequired = Boolean(store?.settings?.serial_required);

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [manual, setManual] = useState({ category_id: '', brand_name: '', model: '', title: '', image_path: '' });
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    serial_number: '',
    purchase_date: todayInTashkent(),
    warranty_until: '',
    warranty_provider: 'store',
    warranty_terms: '',
    maintenance_interval_months: '',
    branch_id: '',
    client_phone: '',
    client_name: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const { data: categories } = useLoad(
    async () => rows<{ id: string; name_uz: string; name_ru: string }>(await supabase.from('categories').select('id, name_uz, name_ru').eq('is_active', true).order('sort_order')),
    [],
  );
  const { data: brands } = useLoad(async () => rows<{ id: string; name: string }>(await supabase.from('brands').select('id, name').eq('is_active', true).order('name')), []);
  const { data: branches } = useLoad(async () => rows<{ id: string; name: string }>(await supabase.from('branches').select('id, name').eq('is_active', true).order('name')), []);

  // A product brings its own warranty terms; the dealer can still change them for this sale.
  const pickProduct = (p: CatalogProduct | null) => {
    setProduct(p);
    if (p) {
      setForm((f) => ({
        ...f,
        warranty_until: p.warranty_months ? addMonths(f.purchase_date, p.warranty_months) : f.warranty_until,
        warranty_provider: p.warranty_provider ?? f.warranty_provider,
        warranty_terms: p.warranty_terms ?? f.warranty_terms,
        maintenance_interval_months: p.maintenance_interval_months ? String(p.maintenance_interval_months) : f.maintenance_interval_months,
      }));
    }
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !store) return;
    setUploading(true);
    setError(null);
    try {
      const path = await uploadStoreImage(store.id, file);
      setManual((m) => ({ ...m, image_path: path }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const techniqueReady = mode === 'catalog' ? Boolean(product) : Boolean(manual.category_id && manual.brand_name.trim() && manual.model.trim() && manual.title.trim() && manual.image_path);
  const titleShown = mode === 'catalog' ? t(product?.name_uz ?? product?.name_ru ?? '', product?.name_ru ?? product?.name_uz ?? '') : manual.title;
  const modelShown = mode === 'catalog' ? `${product?.brand_name ?? ''} ${product?.model ?? ''}` : `${manual.brand_name} ${manual.model}`;

  const next = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep((s) => s + 1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const interval = form.maintenance_interval_months ? Number(form.maintenance_interval_months) : null;
      const result = await rpc<Activation>('activate_passport', {
        p_ticket: ticket,
        p_data: {
          ...(mode === 'catalog'
            ? { product_id: product?.id }
            : { category_id: manual.category_id, brand_name: manual.brand_name, model: manual.model, title: manual.title, image_path: manual.image_path }),
          serial_number: form.serial_number || null,
          purchase_date: form.purchase_date,
          warranty_until: form.warranty_until,
          warranty_provider: form.warranty_provider,
          warranty_terms: form.warranty_terms || null,
          maintenance_interval_months: interval,
          branch_id: form.branch_id || null,
          client_phone: form.client_phone,
          client_name: form.client_name,
        },
      });
      onDone(result, form.client_phone);
    } catch (err) {
      const message = (err as { message?: string }).message ?? '';
      if (message.includes('scan_expired') || message.includes('tag_not_activatable')) {
        onExpired();
        return;
      }
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const stepTitle = [t('Texnika', 'Техника'), t('Kafolat', 'Гарантия'), t('Mijoz', 'Клиент')][step - 1];
  const failure = error ? (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  const footer = (submitLabel: string, disabled: boolean, spin?: boolean) => (
    <div className="flex justify-between gap-2">
      <Button type="button" variant="outline" onClick={() => (step === 1 ? onCancel() : setStep(step - 1))}>
        <ArrowLeft />
        {step === 1 ? t('Bekor qilish', 'Отмена') : t('Orqaga', 'Назад')}
      </Button>
      <Button type="submit" disabled={disabled}>
        {spin ? <Spinner /> : null}
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {step}/3. {stepTitle}
          </span>
          <span className="font-mono text-xs font-normal text-muted-foreground">{tagCode}</span>
        </CardTitle>
        <Progress value={(step / 3) * 100} aria-label={stepTitle} />
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form onSubmit={next} className="flex flex-col gap-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'catalog' | 'manual')}>
              <TabsList className="w-full">
                <TabsTrigger value="catalog">{t('Katalogdan', 'Из каталога')}</TabsTrigger>
                <TabsTrigger value="manual">{t("Qo'lda", 'Вручную')}</TabsTrigger>
              </TabsList>
              <TabsContent value="catalog" className="pt-2">
                <CatalogPicker selected={product} onSelect={pickProduct} />
              </TabsContent>
              <TabsContent value="manual" className="pt-2">
                <FieldGroup>
                  <FormField label={t('Kategoriya', 'Категория')}>
                    <SelectField
                      value={manual.category_id}
                      onChange={(v) => setManual({ ...manual, category_id: v })}
                      placeholder={t('Tanlang', 'Выберите')}
                      options={(categories ?? []).map((c) => ({ value: c.id, label: t(c.name_uz, c.name_ru) }))}
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label={t('Brend', 'Бренд')} htmlFor="manual-brand">
                      <Input id="manual-brand" list="brand-list" value={manual.brand_name} onChange={(e) => setManual({ ...manual, brand_name: e.target.value })} />
                      <datalist id="brand-list">
                        {(brands ?? []).map((b) => (
                          <option key={b.id} value={b.name} />
                        ))}
                      </datalist>
                    </FormField>
                    <FormField label={t('Model', 'Модель')} htmlFor="manual-model">
                      <Input id="manual-model" value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} />
                    </FormField>
                  </div>
                  <FormField label={t('Nomi', 'Название')} htmlFor="manual-title">
                    <Input id="manual-title" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} placeholder={t('Muzlatgich', 'Холодильник')} />
                  </FormField>
                  <FormField label={t('Rasm', 'Фото')} hint={t('Rasm mijoz kartasida ko\'rinadi', 'Фото будет в карточке у клиента')}>
                    <div className="flex items-center gap-3">
                      {manual.image_path ? <img src={mediaUrl(manual.image_path)} alt="" className="size-20 rounded-md border object-cover" /> : null}
                      <Button asChild variant="outline" disabled={uploading}>
                        <label className="cursor-pointer">
                          {uploading ? <Spinner /> : <Camera />}
                          {manual.image_path ? t('Almashtirish', 'Заменить') : t('Rasm olish', 'Сделать фото')}
                          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e)} disabled={uploading} />
                        </label>
                      </Button>
                    </div>
                  </FormField>
                </FieldGroup>
              </TabsContent>
            </Tabs>
            {failure}
            {footer(t('Keyingi', 'Далее'), !techniqueReady)}
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={next} className="flex flex-col gap-4">
            <FieldGroup>
              <FormField label={serialRequired ? t('Seriya raqami', 'Серийный номер') : t('Seriya raqami (ixtiyoriy)', 'Серийный номер (необязательно)')} htmlFor="serial">
                <Input id="serial" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} required={serialRequired} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t('Xarid sanasi', 'Дата покупки')} htmlFor="purchase">
                  <Input
                    id="purchase"
                    type="date"
                    max={todayInTashkent()}
                    value={form.purchase_date}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({
                        ...f,
                        purchase_date: value,
                        // The term of the catalog follows the date; a date typed by hand stays until changed again.
                        warranty_until: product?.warranty_months && value ? addMonths(value, product.warranty_months) : f.warranty_until,
                      }));
                    }}
                    required
                  />
                </FormField>
                <FormField label={t('Kafolat tugashi', 'Гарантия до')} htmlFor="warranty-until">
                  <Input id="warranty-until" type="date" min={form.purchase_date} value={form.warranty_until} onChange={(e) => set('warranty_until', e.target.value)} required />
                </FormField>
              </div>
              <FormField label={t('Kafolat kimda', 'Кто даёт гарантию')}>
                <SelectField value={form.warranty_provider} onChange={(v) => set('warranty_provider', v)} options={providerOptions} />
              </FormField>
              <FormField label={t('Kafolat shartlari (ixtiyoriy)', 'Условия гарантии (необязательно)')} htmlFor="terms">
                <Textarea id="terms" rows={2} value={form.warranty_terms} onChange={(e) => set('warranty_terms', e.target.value)} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t('Xizmat oralig\'i, oy (ixtiyoriy)', 'Обслуживание раз в N месяцев (необязательно)')} htmlFor="interval">
                  <Input id="interval" type="number" min={1} max={120} value={form.maintenance_interval_months} onChange={(e) => set('maintenance_interval_months', e.target.value)} />
                </FormField>
                {(branches ?? []).length > 1 ? (
                  <FormField label={t('Filial', 'Точка')}>
                    <SelectField
                      value={form.branch_id}
                      onChange={(v) => set('branch_id', v)}
                      options={[{ value: '', label: t("Mening filialim", 'Моя точка') }, ...(branches ?? []).map((b) => ({ value: b.id, label: b.name }))]}
                    />
                  </FormField>
                ) : null}
              </div>
            </FieldGroup>
            {footer(t('Keyingi', 'Далее'), false)}
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
            <FieldGroup>
              <FormField
                label={t('Mijoz telefoni', 'Телефон клиента')}
                htmlFor="client-phone"
                hint={t('Mijoz shu raqam bilan pasportni oʻziga ulaydi. Diqqat bilan tekshiring.', 'По этому номеру клиент подключит паспорт. Проверьте внимательно.')}
              >
                <Input id="client-phone" type="tel" inputMode="tel" autoComplete="off" value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} required placeholder="+998 90 123 45 67" />
              </FormField>
              <FormField label={t('Mijoz ismi', 'Имя клиента')} htmlFor="client-name">
                <Input id="client-name" autoComplete="off" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required />
              </FormField>
            </FieldGroup>
            <div className="rounded-lg border p-3">
              <DetailRows>
                <DetailRow label={t('Texnika', 'Техника')}>
                  <p className="font-medium">{titleShown}</p>
                  <p className="text-muted-foreground">{modelShown}</p>
                </DetailRow>
                <DetailRow label={t('Kafolat tugashi', 'Гарантия до')}>{formatDate(form.warranty_until)}</DetailRow>
                <DetailRow label={t('Kafolat kimda', 'Кто даёт гарантию')}>{providerLabel(form.warranty_provider)}</DetailRow>
              </DetailRows>
            </div>
            {failure}
            {footer(t('Faollashtirish', 'Активировать'), busy, busy)}
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Done({ result, phone, onNext }: { result: Activation; phone: string; onNext: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const digits = phone.replace(/\D/g, '');

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
        <CardTitle>{t('Pasport faollashtirildi', 'Паспорт активирован')}</CardTitle>
        <CardDescription>
          {t('Metka', 'Метка')} <span className="font-mono">{result.tag_code}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">{t('Kafolat kodi', 'Гарантийный код')}</p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-wide break-all sm:text-2xl">{result.warranty_code}</p>
          <div className="mt-3 flex justify-center">
            <CopyButton value={result.warranty_code} label={t('Nusxalash', 'Скопировать')} />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{t('Kafolat tugashi:', 'Гарантия до:')} {formatDate(result.warranty_until)}</p>
          <p>
            {t(
              `Mijoz Telegram botda ${formatPhone(digits.length === 9 ? `998${digits}` : digits)} raqamini ulashib yoki shu kodni kiritib pasportni ulaydi. Kodni uning telefoniga o'zingiz ham kiritishingiz mumkin.`,
              `Клиент подключит паспорт в Telegram-боте: поделится номером ${formatPhone(digits.length === 9 ? `998${digits}` : digits)} или введёт этот код. Код можно ввести и самим на его телефоне.`,
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="sm:flex-1" onClick={onNext}>
            <ScanLine />
            {t('Keyingi metka', 'Следующая метка')}
          </Button>
          <Button variant="outline" className="sm:flex-1" asChild>
            <Link to={`/passports/${result.passport_id}/talon`}>
              <Printer />
              {t('Talonni chop etish', 'Печать талона')}
            </Link>
          </Button>
          <Button variant="outline" className="sm:flex-1" onClick={() => navigate(`/passports/${result.passport_id}`)}>
            {t('Pasportni ochish', 'Открыть паспорт')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
