import type { ReactNode } from 'react';
import { Check, Copy, ImageOff, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatPhone } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { mediaUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/** Every appliance has a picture; an old record without one still keeps the row's shape. */
export function ProductThumb({ path, className }: { path?: string | null; className?: string }) {
  const url = mediaUrl(path);
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn('size-11 shrink-0 rounded-md border bg-muted object-cover', className)} />
  ) : (
    <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground', className)}>
      <ImageOff className="size-4" />
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size={label ? 'default' : 'icon'}
      aria-label={t('Nusxalash', 'Скопировать')}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}

/** Calls happen outside the system, so a number is always one tap from a call. */
export function PhoneLink({ phone }: { phone?: string | null }) {
  if (!phone) return <span>—</span>;
  return (
    <a href={`tel:+${phone}`} className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
      <Phone className="size-3.5 text-muted-foreground" />
      {formatPhone(phone)}
    </a>
  );
}

export function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  const t = useT();
  if (!hasMore) return null;
  return (
    <div className="flex justify-center">
      <Button variant="outline" onClick={onClick} disabled={loading}>
        {loading ? <Spinner /> : null}
        {t("Yana ko'rsatish", 'Показать ещё')}
      </Button>
    </div>
  );
}

export function DetailRows({ children }: { children: ReactNode }) {
  return <dl className="divide-y text-sm">{children}</dl>;
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  );
}

const PROVIDERS: Record<string, [uz: string, ru: string]> = {
  store: ["Do'kon", 'Магазин'],
  manufacturer: ['Ishlab chiqaruvchi', 'Производитель'],
  service_center: ['Servis markazi', 'Сервисный центр'],
};

export function useProviderOptions() {
  const t = useT();
  return Object.entries(PROVIDERS).map(([value, [uz, ru]]) => ({ value, label: t(uz, ru) }));
}

export function useProviderLabel() {
  const t = useT();
  return (value: string | null | undefined) => {
    const pair = value ? PROVIDERS[value] : null;
    return pair ? t(pair[0], pair[1]) : '—';
  };
}

/** Today in Tashkent: the database counts days there, whatever the phone's clock zone is. */
export function todayInTashkent(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}
