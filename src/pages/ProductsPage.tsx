import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, Pencil, Plus, Search, Star, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FormField, FormModal, LoadState, PageHeader, SelectField, StatusBadge } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { formatSom } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { mediaUrl, rows, rpc, supabase, uploadStoreImage } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { LoadMore, ProductThumb, useProviderOptions } from '../components/bits';
import { usePagedList } from '../lib/usePagedList';
import { useAuthStore, useRole } from '../store/useAuthStore';

interface Product {
  id: string;
  created_at: string;
  sku?: string;
  barcode?: string;
  name_uz?: string;
  name_ru?: string;
  category_id: string;
  brand_id: string;
  brand_name: string;
  model: string;
  description?: string;
  attributes?: Record<string, unknown>;
  price?: number;
  old_price?: number;
  warranty_months?: number;
  warranty_provider?: string;
  warranty_terms?: string;
  maintenance_interval_months?: number;
  manual_url?: string;
  is_available: boolean;
  passport_required: boolean;
  is_published: boolean;
  images?: string[];
}

export default function ProductsPage() {
  const { role, is } = useRole();
  if (!is('owner', 'manager', 'seller', 'warehouse')) return <Navigate to={role === 'master' ? '/requests' : '/'} replace />;
  return <Products />;
}

function Products() {
  const t = useT();
  const { manages, is } = useRole();
  const seesPrice = is('owner', 'manager', 'seller');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { items, error, loading, loadingMore, hasMore, reload, loadMore } = usePagedList<Product>(
    (last) => rpc<Product[]>('store_products', { p_search: search || null, p_before_created_at: last?.created_at ?? null, p_before_id: last?.id ?? null, p_limit: 50 }),
    [search],
  );

  const togglePublished = async (p: Product, published: boolean) => {
    try {
      await rpc('set_product_published', { p_product_id: p.id, p_published: published });
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title={t('Mahsulotlar', 'Товары')}
        description={manages ? t("Chop etilgan mahsulotlarni siz texnika sotgan mijozlar ko'radi.", 'Опубликованные товары видят клиенты, которым вы продали технику.') : undefined}
        action={
          manages ? (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              {t('Yangi mahsulot', 'Новый товар')}
            </Button>
          ) : null
        }
      />
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Nomi, brend, model yoki artikul', 'Название, бренд, модель или артикул')} />
      </div>

      <LoadState loading={loading} error={error} empty={items.length === 0} emptyText={t('Mahsulotlar topilmadi', 'Товары не найдены')} onRetry={() => void reload()}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Mahsulot', 'Товар')}</TableHead>
                {seesPrice ? <TableHead className="hidden text-right sm:table-cell">{t('Narx', 'Цена')}</TableHead> : null}
                <TableHead className="hidden md:table-cell">{t('Kafolat', 'Гарантия')}</TableHead>
                <TableHead>{t('Chop etilgan', 'Опубликован')}</TableHead>
                {manages ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-0 min-w-44 whitespace-normal">
                    <div className="flex items-center gap-3">
                      <ProductThumb path={p.images?.[0]} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t(p.name_uz ?? p.name_ru ?? '', p.name_ru ?? p.name_uz ?? '')}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.brand_name} {p.model}
                        </p>
                        {seesPrice ? <p className="text-xs text-muted-foreground sm:hidden">{formatSom(p.price)}</p> : null}
                      </div>
                    </div>
                  </TableCell>
                  {seesPrice ? <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatSom(p.price)}</TableCell> : null}
                  <TableCell className="hidden md:table-cell">{p.warranty_months ? t(`${p.warranty_months} oy`, `${p.warranty_months} мес.`) : '—'}</TableCell>
                  <TableCell>
                    {manages ? (
                      <Switch
                        checked={p.is_published}
                        aria-label={t('Mijozlarga chop etish', 'Публикация для клиентов')}
                        onCheckedChange={(v) => void togglePublished(p, v)}
                      />
                    ) : (
                      <StatusBadge tone={p.is_published ? 'good' : 'neutral'} label={p.is_published ? t('Chop etilgan', 'Опубликован') : t('Yashirin', 'Скрыт')} />
                    )}
                  </TableCell>
                  {manages ? (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={t('Tahrirlash', 'Изменить')} onClick={() => setEditing(p)}>
                        <Pencil />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <LoadMore hasMore={hasMore} loading={loadingMore} onClick={() => void loadMore()} />
      </LoadState>

      {editing ? <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => void reload()} /> : null}
    </>
  );
}

function ImagesField({ images, onChange }: { images: string[]; onChange: (paths: string[]) => void }) {
  const t = useT();
  const storeId = useAuthStore((s) => s.store?.id);
  const [uploading, setUploading] = useState(false);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !storeId) return;
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of files) added.push(await uploadStoreImage(storeId, file));
      onChange([...images, ...added]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((path, i) => (
        <div key={path} className="group relative size-20 overflow-hidden rounded-md border">
          <img src={mediaUrl(path)} alt="" className="size-full object-cover" />
          {i === 0 ? (
            <span className="absolute bottom-0 left-0 w-full bg-background/80 py-0.5 text-center text-[10px]">{t('Asosiy', 'Главное')}</span>
          ) : (
            <button
              type="button"
              aria-label={t('Asosiy qilish', 'Сделать главным')}
              className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-md bg-background/80"
              onClick={() => onChange([path, ...images.filter((x) => x !== path)])}
            >
              <Star className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label={t("O'chirish", 'Удалить')}
            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-md bg-background/80"
            onClick={() => onChange(images.filter((x) => x !== path))}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <label className="flex size-20 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-accent">
        {uploading ? <Spinner /> : <ImagePlus className="size-5" />}
        <span className="sr-only">{t("Rasm qo'shish", 'Добавить фото')}</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(e)} disabled={uploading} />
      </label>
    </div>
  );
}

function ProductForm({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const providerOptions = useProviderOptions();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [form, setForm] = useState({
    name_uz: product?.name_uz ?? '',
    name_ru: product?.name_ru ?? '',
    category_id: product?.category_id ?? '',
    brand_id: product?.brand_id ?? '',
    model: product?.model ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    price: product?.price !== undefined ? String(product.price) : '',
    old_price: product?.old_price !== undefined ? String(product.old_price) : '',
    warranty_months: product?.warranty_months !== undefined ? String(product.warranty_months) : '12',
    warranty_provider: product?.warranty_provider ?? 'store',
    warranty_terms: product?.warranty_terms ?? '',
    maintenance_interval_months: product?.maintenance_interval_months !== undefined ? String(product.maintenance_interval_months) : '',
    manual_url: product?.manual_url ?? '',
    description: product?.description ?? '',
    is_available: product?.is_available ?? true,
  });
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const { data: categories } = useLoad(
    async () => rows<{ id: string; name_uz: string; name_ru: string }>(await supabase.from('categories').select('id, name_uz, name_ru').eq('is_active', true).order('sort_order')),
    [],
  );
  const { data: brands } = useLoad(async () => rows<{ id: string; name: string }>(await supabase.from('brands').select('id, name').eq('is_active', true).order('name')), []);

  const number = (value: string) => (value.trim() === '' ? null : Number(value));

  return (
    <FormModal
      wide
      title={product ? t('Mahsulotni tahrirlash', 'Изменить товар') : t('Yangi mahsulot', 'Новый товар')}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        if (images.length === 0) throw new Error('product_image_required');
        const id = await rpc<string>('upsert_product', {
          p_id: product?.id ?? null,
          p_data: {
            ...form,
            // The form does not edit these yet, and an update without them would erase them.
            attributes: product?.attributes ?? {},
            price: number(form.price) ?? 0,
            old_price: number(form.old_price),
            warranty_months: number(form.warranty_months),
            maintenance_interval_months: number(form.maintenance_interval_months),
            warranty_terms: form.warranty_terms || null,
            manual_url: form.manual_url || null,
            description: form.description || null,
          },
        });
        await rpc('set_product_images', { p_product_id: id, p_paths: images });
        onDone();
      }}
    >
      <FormField label={t('Rasmlar', 'Фото')} hint={t('Har bir mahsulotga kamida bitta rasm kerak.', 'У каждого товара должно быть хотя бы одно фото.')}>
        <ImagesField images={images} onChange={setImages} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Nomi (o'zbekcha)", 'Название (узбекский)')} htmlFor="p-name-uz">
          <Input id="p-name-uz" value={form.name_uz} onChange={(e) => set('name_uz', e.target.value)} />
        </FormField>
        <FormField label={t('Nomi (ruscha)', 'Название (русский)')} htmlFor="p-name-ru">
          <Input id="p-name-ru" value={form.name_ru} onChange={(e) => set('name_ru', e.target.value)} />
        </FormField>
        <FormField label={t('Kategoriya', 'Категория')}>
          <SelectField value={form.category_id} onChange={(v) => set('category_id', v)} placeholder={t('Tanlang', 'Выберите')} options={(categories ?? []).map((c) => ({ value: c.id, label: t(c.name_uz, c.name_ru) }))} />
        </FormField>
        <FormField label={t('Brend', 'Бренд')} hint={t("Ro'yxatda yo'q bo'lsa, platformaga yozing", 'Если бренда нет в списке, напишите платформе')}>
          <SelectField value={form.brand_id} onChange={(v) => set('brand_id', v)} placeholder={t('Tanlang', 'Выберите')} options={(brands ?? []).map((b) => ({ value: b.id, label: b.name }))} />
        </FormField>
        <FormField label={t('Model', 'Модель')} htmlFor="p-model">
          <Input id="p-model" value={form.model} onChange={(e) => set('model', e.target.value)} required />
        </FormField>
        <FormField label={t('Artikul', 'Артикул')} htmlFor="p-sku">
          <Input id="p-sku" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
        </FormField>
        <FormField label={t("Narx, so'm", 'Цена, сум')} htmlFor="p-price">
          <Input id="p-price" type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} required />
        </FormField>
        <FormField label={t("Eski narx, so'm", 'Старая цена, сум')} htmlFor="p-old-price">
          <Input id="p-old-price" type="number" min={0} value={form.old_price} onChange={(e) => set('old_price', e.target.value)} />
        </FormField>
        <FormField label={t('Kafolat, oy', 'Гарантия, мес.')} htmlFor="p-warranty">
          <Input id="p-warranty" type="number" min={0} max={600} value={form.warranty_months} onChange={(e) => set('warranty_months', e.target.value)} />
        </FormField>
        <FormField label={t('Kafolat kimda', 'Кто даёт гарантию')}>
          <SelectField value={form.warranty_provider} onChange={(v) => set('warranty_provider', v)} options={providerOptions} />
        </FormField>
        <FormField label={t("Xizmat oralig'i, oy", 'Обслуживание раз в N месяцев')} htmlFor="p-interval">
          <Input id="p-interval" type="number" min={1} max={120} value={form.maintenance_interval_months} onChange={(e) => set('maintenance_interval_months', e.target.value)} />
        </FormField>
        <FormField label={t('Yo\'riqnoma havolasi', 'Ссылка на инструкцию')} htmlFor="p-manual">
          <Input id="p-manual" type="url" value={form.manual_url} onChange={(e) => set('manual_url', e.target.value)} />
        </FormField>
      </div>
      <FormField label={t('Kafolat shartlari', 'Условия гарантии')} htmlFor="p-terms">
        <Textarea id="p-terms" rows={2} value={form.warranty_terms} onChange={(e) => set('warranty_terms', e.target.value)} />
      </FormField>
      <FormField label={t('Tavsif', 'Описание')} htmlFor="p-description">
        <Textarea id="p-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </FormField>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        {t('Sotuvda bor', 'Есть в наличии')}
        <Switch checked={form.is_available} onCheckedChange={(v) => set('is_available', v)} />
      </label>
    </FormModal>
  );
}
