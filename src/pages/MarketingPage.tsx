import { useState, type ChangeEvent } from 'react';
import { ImagePlus, Pencil, Plus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { FormField, FormModal, LoadState, PageHeader, SelectField, StatusBadge, type StatusTone } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorMessage } from '@/lib/errors';
import { dayEnd, dayStart, formatDate, toDay } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rows, rpc, supabase, uploadStoreImage } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { ProductThumb } from '../components/bits';
import { homeOf, useAuthStore, useRole } from '../store/useAuthStore';

interface Banner {
  id: string;
  title: string;
  image_path: string;
  link_url: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
}

interface LinkProduct {
  id: string;
  name_uz?: string;
  name_ru?: string;
  brand_name: string;
  model: string;
  is_published: boolean;
}

export default function MarketingPage() {
  const { role, manages } = useRole();
  if (!manages) return <Navigate to={homeOf(role)} replace />;
  return <Marketing />;
}

function Marketing() {
  const t = useT();
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const { data, error, loading, reload } = useLoad(
    async () => rows<Banner>(await supabase.from('banners').select('id, title, image_path, link_url, status, starts_at, ends_at, sort_order').order('sort_order').order('created_at', { ascending: false })),
    [],
  );
  // Read here and not in the form: the table names the product a banner leads to.
  const { data: products } = useLoad(() => rpc<LinkProduct[]>('store_products', { p_limit: 200 }), []);
  const productName = (p: LinkProduct) => t(p.name_uz ?? p.name_ru ?? p.model, p.name_ru ?? p.name_uz ?? p.model);

  const linkLabel = (link: string | null) => {
    if (!link) return t("Havolasiz", 'Без ссылки');
    if (link.startsWith('/store/')) return t("Do'kon sahifasi", 'Страница магазина');
    const product = (products ?? []).find((p) => link === `/products/${p.id}`);
    return product ? productName(product) : t('Mahsulot', 'Товар');
  };

  const stateOf = (b: Banner): { tone: StatusTone; label: string } => {
    const now = Date.now();
    if (b.status !== 'active') return { tone: 'neutral', label: t('Yashirin', 'Скрыт') };
    if (b.ends_at && new Date(b.ends_at).getTime() <= now) return { tone: 'neutral', label: t('Tugagan', 'Завершён') };
    if (b.starts_at && new Date(b.starts_at).getTime() > now) return { tone: 'info', label: t('Rejalashtirilgan', 'Запланирован') };
    return { tone: 'good', label: t("Ko'rsatilmoqda", 'Показывается') };
  };

  return (
    <>
      <PageHeader
        title={t('Marketing', 'Маркетинг')}
        description={t(
          "Bannerlarni faqat sizdan texnika olgan mijozlar ko'radi: ilovaning bosh sahifasida va do'koningiz sahifasida. Xabarnomalarni platforma shartnoma asosida yuboradi.",
          'Баннеры видят только клиенты, купившие у вас технику: на главной приложения и на странице вашего магазина. Рассылки проводит платформа по договору.',
        )}
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus />
            {t('Yangi banner', 'Новый баннер')}
          </Button>
        }
      />

      <LoadState loading={loading} error={error} empty={(data ?? []).length === 0} emptyText={t("Hali bannerlar yo'q", 'Баннеров пока нет')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-32 sm:table-cell">{t('Rasm', 'Фото')}</TableHead>
                <TableHead>{t('Nomi', 'Название')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Muddat', 'Период')}</TableHead>
                <TableHead>{t('Holat', 'Статус')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((b) => {
                const state = stateOf(b);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="hidden sm:table-cell">
                      <ProductThumb path={b.image_path} className="h-10 w-28" />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{linkLabel(b.link_url)}</p>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {b.starts_at || b.ends_at ? `${b.starts_at ? formatDate(b.starts_at) : '…'} – ${b.ends_at ? formatDate(b.ends_at) : '…'}` : t('Muddatsiz', 'Без срока')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={state.tone} label={state.label} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={t('Tahrirlash', 'Изменить')} onClick={() => setEditing(b)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </LoadState>

      {editing ? (
        <BannerForm
          banner={editing === 'new' ? null : editing}
          products={(products ?? []).filter((p) => p.is_published).map((p) => ({ value: p.id, label: `${productName(p)} · ${p.brand_name} ${p.model}` }))}
          onClose={() => setEditing(null)}
          onDone={() => void reload()}
        />
      ) : null}
    </>
  );
}

function BannerForm({ banner, products, onClose, onDone }: { banner: Banner | null; products: { value: string; label: string }[]; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const store = useAuthStore((s) => s.store);
  const link = banner?.link_url ?? '';
  const [form, setForm] = useState({
    image_path: banner?.image_path ?? '',
    title: banner?.title ?? '',
    target: link.startsWith('/products/') ? 'product' : link ? 'store' : '',
    product_id: link.startsWith('/products/') ? link.slice('/products/'.length) : '',
    from: toDay(banner?.starts_at),
    to: toDay(banner?.ends_at),
    sort_order: String(banner?.sort_order ?? 0),
    active: banner ? banner.status === 'active' : true,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !store) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = await uploadStoreImage(store.id, file);
      setForm((f) => ({ ...f, image_path: path }));
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const linkUrl = () => {
    if (form.target === 'store') return `/store/${store?.slug}`;
    if (form.target === 'product') {
      if (!form.product_id) throw new Error(t('Mahsulotni tanlang', 'Выберите товар'));
      return `/products/${form.product_id}`;
    }
    return null;
  };

  return (
    <FormModal
      title={banner ? t('Bannerni tahrirlash', 'Изменить баннер') : t('Yangi banner', 'Новый баннер')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        if (uploading || !form.image_path) throw new Error('invalid_image');
        await rpc('upsert_store_banner', {
          p_id: banner?.id ?? null,
          p_title: form.title,
          p_image_path: form.image_path,
          p_link_url: linkUrl(),
          p_is_active: form.active,
          p_starts_at: dayStart(form.from),
          p_ends_at: dayEnd(form.to),
          p_sort_order: Number(form.sort_order || 0),
        });
        onDone();
      }}
    >
      <FormField label={t('Rasm', 'Изображение')} hint={uploadError ?? t('Tomonlar nisbati 2.75 : 1, masalan 1100 × 400.', 'Пропорции 2,75 : 1, например 1100 × 400.')}>
        <div className="flex items-center gap-3">
          <ProductThumb path={form.image_path || null} className="h-10 w-28" />
          <Button asChild variant="outline" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? <Spinner /> : <ImagePlus />}
              {t('Tanlash', 'Выбрать')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void onImage(e)} disabled={uploading} />
            </label>
          </Button>
        </div>
      </FormField>
      <FormField label={t('Nomi', 'Название')} htmlFor="banner-title" hint={t("Rasm yuklanmasa ko'rinadi va ekran o'quvchi uchun.", 'Для чтения с экрана и на случай, если картинка не загрузится.')}>
        <Input id="banner-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </FormField>
      <FormField label={t('Bosilganda ochiladi', 'Что откроется по нажатию')}>
        <SelectField
          value={form.target}
          onChange={(target) => setForm({ ...form, target })}
          options={[
            { value: '', label: t('Hech narsa', 'Ничего') },
            { value: 'store', label: t("Do'kon sahifasi", 'Страница магазина') },
            { value: 'product', label: t('Mahsulot', 'Товар') },
          ]}
        />
      </FormField>
      {form.target === 'product' ? (
        <FormField label={t('Mahsulot', 'Товар')}>
          <SelectField value={form.product_id} onChange={(product_id) => setForm({ ...form, product_id })} placeholder={t('Tanlang', 'Выберите')} options={products} />
        </FormField>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('Boshlanishi', 'Начало показа')} htmlFor="banner-from">
          <Input id="banner-from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
        </FormField>
        <FormField label={t('Tugashi', 'Конец показа')} htmlFor="banner-to">
          <Input id="banner-to" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
        </FormField>
      </div>
      <FormField label={t('Tartib', 'Порядок')} htmlFor="banner-order" hint={t('Kichik raqam oldinda', 'Меньшее число показывается раньше')}>
        <Input id="banner-order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
      </FormField>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        {t("Ko'rsatish", 'Показывать')}
        <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
      </label>
    </FormModal>
  );
}
