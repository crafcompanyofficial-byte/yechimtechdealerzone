import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Shown while a page's code loads. Invisible at first, so a fast load never flashes a spinner. */
export function PageLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="flex min-h-[40vh] items-center justify-center">{visible ? <Spinner className="size-6" /> : null}</div>;
}

/**
 * Loading, failure and emptiness in one place. While data reloads the previous render stays
 * on screen, dimmed: no skeleton flash, no layout jump.
 */
export function LoadState({ loading, error, empty, emptyText, onRetry, children }: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  const t = useT();

  if (error) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>{t('Yuklab bo\'lmadi', 'Не удалось загрузить')}</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={onRetry}>
          {t('Qayta urinish', 'Повторить')}
        </Button>
      </Empty>
    );
  }

  if (empty) {
    return loading ? (
      <PageLoading />
    ) : (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyDescription>{emptyText}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <div className={cn('flex flex-col gap-4 transition-opacity', loading && 'opacity-60')}>{children}</div>;
}

/** Runs an action, closes on success, stays open with the error on failure. */
export function FormModal({ title, description, submitLabel, onClose, onSubmit, children, wide }: {
  title: string;
  description?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  children: ReactNode;
  wide?: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn('max-h-[90svh] overflow-y-auto', wide && 'sm:max-w-2xl')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {children}
          {error ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Bekor qilish', 'Отмена')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FormField({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <Field>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

/** Radix Select does not allow an empty value, so "nothing chosen" travels as a sentinel. */
const NONE = '__none';

export function SelectField({ value, onChange, options, placeholder, id, className }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <Select value={value === '' ? NONE : value} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger id={id} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || NONE} value={o.value || NONE}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Every serious action in the database requires a reason, so one dialog serves them all. */
export function ReasonModal({ title, submitLabel, onClose, onSubmit }: {
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState('');
  return (
    <FormModal title={title} submitLabel={submitLabel} onClose={onClose} onSubmit={() => onSubmit(reason)}>
      <FormField label={t('Sabab', 'Причина')} htmlFor="reason">
        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required rows={3} />
      </FormField>
    </FormModal>
  );
}

export type StatusTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE_DOT: Record<StatusTone, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-destructive',
  info: 'bg-blue-500',
  neutral: 'bg-muted-foreground',
};

/** A status never rides on colour alone: a dot and the word. */
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} aria-hidden />
      {label}
    </Badge>
  );
}

const STATUSES: Record<string, Record<string, { tone: StatusTone; uz: string; ru: string }>> = {
  store: {
    pending: { tone: 'warn', uz: 'Kutilmoqda', ru: 'Ожидает' },
    active: { tone: 'good', uz: 'Faol', ru: 'Активен' },
    suspended: { tone: 'warn', uz: "To'xtatilgan", ru: 'Приостановлен' },
    blocked: { tone: 'bad', uz: 'Bloklangan', ru: 'Заблокирован' },
  },
  passport: {
    pending_claim: { tone: 'warn', uz: 'Ulanmagan', ru: 'Не подключён' },
    active: { tone: 'good', uz: 'Faol', ru: 'Активен' },
    returned: { tone: 'neutral', uz: 'Qaytarilgan', ru: 'Возвращён' },
    voided: { tone: 'neutral', uz: 'Bekor qilingan', ru: 'Отменён' },
    blocked: { tone: 'bad', uz: 'Bloklangan', ru: 'Заблокирован' },
  },
  tag: {
    in_stock: { tone: 'neutral', uz: 'Omborda', ru: 'На складе' },
    assigned: { tone: 'info', uz: "Do'konda", ru: 'У магазина' },
    activated: { tone: 'good', uz: 'Faollashtirilgan', ru: 'Активирована' },
    blocked: { tone: 'bad', uz: 'Bloklangan', ru: 'Заблокирована' },
  },
  request: {
    new: { tone: 'warn', uz: 'Yangi', ru: 'Новая' },
    accepted: { tone: 'info', uz: 'Qabul qilingan', ru: 'Принята' },
    assigned: { tone: 'info', uz: 'Ustada', ru: 'У мастера' },
    in_progress: { tone: 'info', uz: 'Bajarilmoqda', ru: 'В работе' },
    done: { tone: 'good', uz: 'Bajarilgan', ru: 'Выполнена' },
    rejected: { tone: 'bad', uz: 'Rad etilgan', ru: 'Отклонена' },
    cancelled: { tone: 'neutral', uz: 'Bekor qilingan', ru: 'Отменена' },
  },
  order: {
    new: { tone: 'warn', uz: 'Yangi', ru: 'Новый' },
    confirmed: { tone: 'info', uz: 'Tasdiqlangan', ru: 'Подтверждён' },
    completed: { tone: 'good', uz: 'Bajarilgan', ru: 'Выполнен' },
    cancelled: { tone: 'neutral', uz: 'Bekor qilingan', ru: 'Отменён' },
  },
  warranty: {
    active: { tone: 'good', uz: 'Kafolatda', ru: 'На гарантии' },
    ending: { tone: 'warn', uz: 'Tugamoqda', ru: 'Заканчивается' },
    ended: { tone: 'neutral', uz: 'Tugagan', ru: 'Закончилась' },
  },
};

export type StatusKind = keyof typeof STATUSES;

export function useStatusLabel() {
  const t = useT();
  return (kind: StatusKind, status: string) => {
    const s = STATUSES[kind]?.[status];
    return s ? t(s.uz, s.ru) : status;
  };
}

export function statusTone(kind: StatusKind, status: string): StatusTone {
  return STATUSES[kind]?.[status]?.tone ?? 'neutral';
}

export function EntityStatus({ kind, status }: { kind: StatusKind; status: string }) {
  const label = useStatusLabel();
  return <StatusBadge tone={statusTone(kind, status)} label={label(kind, status)} />;
}
