const som = new Intl.NumberFormat('ru-RU');
const compact = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

export function formatSom(value: number | string | null | undefined): string {
  return `${som.format(Math.round(Number(value) || 0))} so'm`;
}

export function formatNumber(value: number): string {
  return som.format(Math.round(value));
}

/** 1 250 000 → "1,3 mln" — for axis ticks and dense tiles. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${compact.format(value / 1e9)} mlrd`;
  if (abs >= 1e6) return `${compact.format(value / 1e6)} mln`;
  if (abs >= 1e3) return `${compact.format(value / 1e3)} ming`;
  return compact.format(value);
}

/** 998901234567 → "+998 90 123 45 67"; anything else stays as it is. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const m = value.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : value;
}

export function formatPercent(ratio: number): string {
  return `${percent.format(ratio * 100)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
}

/** An empty date field means no limit; a date is the whole day in Tashkent. */
export function dayStart(day: string | null | undefined): string | null {
  return day ? `${day}T00:00:00+05:00` : null;
}

export function dayEnd(day: string | null | undefined): string | null {
  return day ? `${day}T23:59:59+05:00` : null;
}

export function toDay(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }) : '';
}
