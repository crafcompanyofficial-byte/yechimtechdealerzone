import { useState } from 'react';
import { ArrowLeft, CalendarPlus, KeyRound, PhoneCall, Printer, RotateCcw, Undo2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EntityStatus, FormField, FormModal, LoadState, PageHeader, ReasonModal, useStatusLabel } from '@/components/app/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatPhone } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { rpc } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import { CopyButton, DetailRow, DetailRows, PhoneLink, ProductThumb, useProviderLabel } from '../components/bits';
import { homeOf, useAuthStore, useRole } from '../store/useAuthStore';

interface PassportEvent {
  kind: string;
  data: Record<string, unknown> | null;
  actor_type: string;
  created_at: string;
}

export interface Passport {
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
  customer_id: string;
  customer_name: string;
  purchase_date: string;
  warranty_until: string;
  warranty_state: string;
  warranty_provider: string;
  warranty_terms: string | null;
  next_service_date: string | null;
  last_service_date: string | null;
  activated_at: string;
  activated_by: string | null;
  claimed_at: string | null;
  correction_until: string;
  events: PassportEvent[];
}

const EVENT_LABEL: Record<string, [uz: string, ru: string]> = {
  activated: ['Faollashtirildi', 'Активирован'],
  claimed: ['Mijoz uladi', 'Подключён клиентом'],
  voided: ['Bekor qilindi', 'Отменён'],
  returned: ['Qaytarildi', 'Возврат'],
  phone_corrected: ['Telefon tuzatildi', 'Исправлен телефон'],
  code_reissued: ['Kod qayta chiqarildi', 'Перевыпущен код'],
  warranty_extended: ['Kafolat uzaytirildi', 'Гарантия продлена'],
  service_done: ['Xizmat bajarildi', 'Выполнено обслуживание'],
  blocked: ['Bloklandi', 'Заблокирован'],
  unblocked: ['Blokdan chiqarildi', 'Разблокирован'],
};

type Dialog = 'void' | 'return' | 'phone' | 'extend' | null;

export default function PassportDetailPage() {
  const { role, sells } = useRole();
  if (!sells) return <Navigate to={homeOf(role)} replace />;
  return <PassportDetail />;
}

function PassportDetail() {
  const t = useT();
  const { id } = useParams();
  const { manages } = useRole();
  const userId = useAuthStore((s) => s.session?.user.id);
  const providerLabel = useProviderLabel();
  const statusLabel = useStatusLabel();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reissuing, setReissuing] = useState(false);

  const { data: p, error, loading, reload } = useLoad(() => rpc<Passport>('store_passport', { p_passport_id: id }), [id]);

  const open = p?.status === 'pending_claim' || p?.status === 'active';
  const inWindow = p ? Date.now() < new Date(p.correction_until).getTime() : false;
  // Rule of check_can_correct: within 24 hours, by the seller who made it or a manager.
  const canCorrect = open && inWindow && (manages || p?.activated_by === userId);
  const canVoid = p?.status === 'pending_claim' && canCorrect;

  const reissue = async () => {
    setReissuing(true);
    try {
      const result = await rpc<{ warranty_code: string }>('reissue_warranty_code', { p_passport_id: id });
      toast.success(t(`Yangi kod: ${result.warranty_code}`, `Новый код: ${result.warranty_code}`));
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReissuing(false);
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/passports">
          <ArrowLeft />
          {t('Pasportlar', 'Паспорта')}
        </Link>
      </Button>
      <LoadState loading={loading} error={error} empty={!p} emptyText={t('Pasport topilmadi', 'Паспорт не найден')} onRetry={() => void reload()}>
        {p ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <ProductThumb path={p.image_path} className="size-16" />
              <div className="min-w-0 flex-1">
                <PageHeader title={t(p.title_uz, p.title_ru)} description={`${p.brand_name} ${p.model}`} />
              </div>
              <EntityStatus kind="passport" status={p.status} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('Kafolat kodi', 'Гарантийный код')}</CardTitle>
                  <CardDescription>
                    {p.status === 'pending_claim'
                      ? t('Mijoz hali ulamagan. Kodni unga bering yoki telefonida oʻzingiz kiriting.', 'Клиент ещё не подключил. Передайте ему код или введите сами на его телефоне.')
                      : t('Pasport mijozga ulangan.', 'Паспорт подключён клиентом.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 font-mono text-lg font-semibold break-all">{p.warranty_code}</p>
                  <CopyButton value={p.warranty_code} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Mijoz', 'Клиент')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRows>
                    <DetailRow label={t('Ism', 'Имя')}>
                      <Link className="underline-offset-4 hover:underline" to={`/customers/${p.customer_id}`}>
                        {p.customer_name}
                      </Link>
                    </DetailRow>
                    <DetailRow label={t('Telefon', 'Телефон')}>
                      <PhoneLink phone={p.client_phone} />
                    </DetailRow>
                    <DetailRow label={t('Ulangan', 'Подключён')}>{formatDate(p.claimed_at)}</DetailRow>
                  </DetailRows>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Texnika va kafolat', 'Техника и гарантия')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRows>
                    <DetailRow label={t('Metka', 'Метка')}>
                      <span className="font-mono text-xs">{p.tag_code}</span>
                    </DetailRow>
                    <DetailRow label={t('Seriya raqami', 'Серийный номер')}>{p.serial_number ?? '—'}</DetailRow>
                    <DetailRow label={t('Xarid sanasi', 'Дата покупки')}>{formatDate(p.purchase_date)}</DetailRow>
                    <DetailRow label={t('Kafolat tugashi', 'Гарантия до')}>
                      <span className="inline-flex items-center gap-2">
                        {formatDate(p.warranty_until)}
                        <EntityStatus kind="warranty" status={p.warranty_state} />
                      </span>
                    </DetailRow>
                    <DetailRow label={t('Kafolat kimda', 'Кто даёт гарантию')}>{providerLabel(p.warranty_provider)}</DetailRow>
                    {p.warranty_terms ? <DetailRow label={t('Shartlar', 'Условия')}>{p.warranty_terms}</DetailRow> : null}
                    <DetailRow label={t('Keyingi xizmat', 'Следующее обслуживание')}>{formatDate(p.next_service_date)}</DetailRow>
                  </DetailRows>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('Amallar', 'Действия')}</CardTitle>
                  {open && !inWindow ? (
                    <CardDescription>{t("24 soat o'tdi: endi faqat kafolatni uzaytirish va qaytarish mumkin.", 'Прошло 24 часа: остались продление гарантии и возврат.')}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="justify-start">
                    <Link to={`/passports/${p.id}/talon`}>
                      <Printer />
                      {t('Talonni chop etish', 'Печать талона')}
                    </Link>
                  </Button>
                  {p.status === 'pending_claim' ? (
                    <Button variant="outline" className="justify-start" onClick={() => void reissue()} disabled={reissuing}>
                      <KeyRound />
                      {t('Kodni qayta chiqarish', 'Перевыпустить код')}
                    </Button>
                  ) : null}
                  {canCorrect ? (
                    <Button variant="outline" className="justify-start" onClick={() => setDialog('phone')}>
                      <PhoneCall />
                      {t('Raqamni tuzatish', 'Исправить номер')}
                    </Button>
                  ) : null}
                  {open && manages ? (
                    <Button variant="outline" className="justify-start" onClick={() => setDialog('extend')}>
                      <CalendarPlus />
                      {t('Kafolatni uzaytirish', 'Продлить гарантию')}
                    </Button>
                  ) : null}
                  {canVoid ? (
                    <Button variant="outline" className="justify-start" onClick={() => setDialog('void')}>
                      <Undo2 />
                      {t('Faollashtirishni bekor qilish', 'Отменить активацию')}
                    </Button>
                  ) : null}
                  {open && manages ? (
                    <Button variant="outline" className="justify-start text-destructive hover:text-destructive" onClick={() => setDialog('return')}>
                      <RotateCcw />
                      {t('Texnika qaytarildi', 'Возврат техники')}
                    </Button>
                  ) : null}
                  {open && !manages ? (
                    <p className="text-sm text-muted-foreground">{t('Qaytarish uchun menejerga murojaat qiling.', 'Для возврата обратитесь к менеджеру.')}</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('Tarix', 'История')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-3 text-sm">
                  {p.events.map((e, i) => {
                    const label = EVENT_LABEL[e.kind];
                    return (
                      <li key={i} className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
                        <span>{label ? t(label[0], label[1]) : e.kind}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            {dialog === 'void' ? (
              <ReasonModal
                title={t('Faollashtirishni bekor qilish', 'Отмена активации')}
                submitLabel={t('Bekor qilish', 'Отменить активацию')}
                onClose={() => setDialog(null)}
                onSubmit={async (reason) => {
                  await rpc('void_passport', { p_passport_id: p.id, p_reason: reason });
                  toast.success(t('Metka va pasport balansga qaytdi', 'Метка и паспорт вернулись на баланс'));
                  await reload();
                }}
              />
            ) : null}
            {dialog === 'return' ? (
              <ReasonModal
                title={t('Texnika qaytarildi', 'Возврат техники')}
                submitLabel={t('Tasdiqlash', 'Подтвердить')}
                onClose={() => setDialog(null)}
                onSubmit={async (reason) => {
                  await rpc('return_passport', { p_passport_id: p.id, p_reason: reason });
                  toast.success(t(`Holat: ${statusLabel('passport', 'returned')}. Metka yana bo'sh.`, `Статус: ${statusLabel('passport', 'returned')}. Метка снова свободна.`));
                  await reload();
                }}
              />
            ) : null}
            {dialog === 'phone' ? <CorrectPhone passport={p} onClose={() => setDialog(null)} onDone={() => void reload()} /> : null}
            {dialog === 'extend' ? <ExtendWarranty passport={p} onClose={() => setDialog(null)} onDone={() => void reload()} /> : null}
          </>
        ) : null}
      </LoadState>
    </>
  );
}

function CorrectPhone({ passport, onClose, onDone }: { passport: Passport; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  return (
    <FormModal
      title={t('Raqamni tuzatish', 'Исправление номера')}
      description={t(
        `Hozirgi raqam: ${formatPhone(passport.client_phone)}. Agar pasport ulangan bo'lsa, egasi uni yo'qotadi. Yangi kafolat kodi chiqariladi.`,
        `Сейчас: ${formatPhone(passport.client_phone)}. Если паспорт подключён, владелец его потеряет. Будет выпущен новый гарантийный код.`,
      )}
      submitLabel={t('Saqlash', 'Сохранить')}
      onClose={onClose}
      onSubmit={async () => {
        const result = await rpc<{ warranty_code: string }>('correct_passport_phone', { p_passport_id: passport.id, p_phone: phone, p_name: name || null });
        toast.success(t(`Yangi kod: ${result.warranty_code}`, `Новый код: ${result.warranty_code}`));
        onDone();
      }}
    >
      <FormField label={t('Yangi telefon', 'Новый телефон')} htmlFor="fix-phone">
        <Input id="fix-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+998 90 123 45 67" />
      </FormField>
      <FormField label={t('Mijoz ismi', 'Имя клиента')} htmlFor="fix-name" hint={t('Bu raqam uchun karta bo\'lmasa kerak', 'Нужно, если для этого номера ещё нет карточки')}>
        <Input id="fix-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
    </FormModal>
  );
}

function ExtendWarranty({ passport, onClose, onDone }: { passport: Passport; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');

  return (
    <FormModal
      title={t('Kafolatni uzaytirish', 'Продление гарантии')}
      description={t(`Hozir: ${formatDate(passport.warranty_until)} gacha`, `Сейчас: до ${formatDate(passport.warranty_until)}`)}
      submitLabel={t('Uzaytirish', 'Продлить')}
      onClose={onClose}
      onSubmit={async () => {
        await rpc('extend_warranty', { p_passport_id: passport.id, p_until: until, p_reason: reason });
        onDone();
      }}
    >
      <FormField label={t('Yangi muddat', 'Новый срок')} htmlFor="extend-until">
        <Input id="extend-until" type="date" min={passport.warranty_until} value={until} onChange={(e) => setUntil(e.target.value)} required />
      </FormField>
      <FormField label={t('Sabab', 'Причина')} htmlFor="extend-reason">
        <Textarea id="extend-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </FormField>
    </FormModal>
  );
}
