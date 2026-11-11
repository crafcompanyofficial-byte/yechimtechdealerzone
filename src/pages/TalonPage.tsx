import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadState } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { formatDate, formatPhone } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { useProviderLabel } from '../components/bits';
import { useAuthStore } from '../store/useAuthStore';
import type { Passport } from './PassportDetailPage';

/** The warranty slip for the client. Plain black on white: most shops print it in one colour. */
export default function TalonPage() {
  const t = useT();
  const { id } = useParams();
  const store = useAuthStore((s) => s.store);
  const providerLabel = useProviderLabel();
  const { data: p, error, loading, reload } = useLoad(() => rpc<Passport>('store_passport', { p_passport_id: id }), [id]);

  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-black/15 py-1.5 last:border-b-0">
      <span className="text-black/60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );

  return (
    <div className="min-h-svh bg-muted p-4 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex justify-between gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link to={`/passports/${id}`}>
              <ArrowLeft />
              {t('Orqaga', 'Назад')}
            </Link>
          </Button>
          <Button onClick={() => window.print()} disabled={!p}>
            <Printer />
            {t('Chop etish', 'Печать')}
          </Button>
        </div>
        <LoadState loading={loading} error={error} empty={!p} emptyText={t('Pasport topilmadi', 'Паспорт не найден')} onRetry={() => void reload()}>
          {p ? (
            <article className="rounded-lg bg-white p-6 text-sm text-black shadow-sm print:rounded-none print:shadow-none">
              <header className="flex items-start justify-between gap-4 border-b border-black pb-3">
                <div>
                  <p className="text-lg font-semibold">{t('Kafolat taloni', 'Гарантийный талон')}</p>
                  <p>{store?.name}</p>
                </div>
                <p className="text-right text-xs font-medium">YECHIM.SYSTEMS</p>
              </header>

              <section className="mt-3">
                {row(t('Texnika', 'Техника'), t(p.title_uz, p.title_ru))}
                {row(t('Brend va model', 'Бренд и модель'), `${p.brand_name} ${p.model}`)}
                {row(t('Seriya raqami', 'Серийный номер'), p.serial_number ?? '—')}
                {row(t('Metka', 'Метка'), p.tag_code)}
                {row(t('Xaridor', 'Покупатель'), `${p.customer_name}, ${formatPhone(p.client_phone)}`)}
                {row(t('Xarid sanasi', 'Дата покупки'), formatDate(p.purchase_date))}
                {row(t('Kafolat tugashi', 'Гарантия до'), formatDate(p.warranty_until))}
                {row(t('Kafolat kimda', 'Кто даёт гарантию'), providerLabel(p.warranty_provider))}
              </section>

              {p.warranty_terms ? (
                <section className="mt-3">
                  <p className="font-medium">{t('Kafolat shartlari', 'Условия гарантии')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{p.warranty_terms}</p>
                </section>
              ) : null}

              <section className="mt-4 rounded border border-black p-3 text-center">
                <p className="text-xs">{t('Kafolat kodi', 'Гарантийный код')}</p>
                <p className="mt-1 font-mono text-xl font-semibold tracking-wide break-all">{p.warranty_code}</p>
              </section>

              <p className="mt-3 text-xs">
                {t(
                  'Raqamli pasportni ulash: telefoningizni texnikadagi metkaga tuting, Telegram ochiladi. Telefon raqamingizni ulashing yoki shu kodni kiriting.',
                  'Как подключить цифровой паспорт: приложите телефон к метке на технике, откроется Telegram. Поделитесь номером телефона или введите этот код.',
                )}
              </p>

              <footer className="mt-8 grid grid-cols-2 gap-6 text-xs">
                <p className="border-t border-black pt-1">{t('Sotuvchi imzosi', 'Подпись продавца')}</p>
                <p className="border-t border-black pt-1">{t('Xaridor imzosi', 'Подпись покупателя')}</p>
              </footer>
            </article>
          ) : null}
        </LoadState>
      </div>
    </div>
  );
}
