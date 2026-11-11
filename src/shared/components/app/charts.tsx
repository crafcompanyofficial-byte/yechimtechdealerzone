import { useState, type ReactNode } from 'react';
import { BarChart3, Minus, Table2, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCompact, formatNumber } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type ChartPoint = { day: string } & Record<string, number | string>;

export interface ChartSeries {
  key: string;
  label: string;
  /** A slot of the checked palette. Series keep their slot whatever else is on the chart. */
  color: `var(--chart-${1 | 2 | 3 | 4})`;
}

const shortDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const fullDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;

function configOf(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }]));
}

/** The range every tile and chart below it uses: one control, above everything it scopes. */
export function PeriodToggle({ value, onChange, options = [7, 30, 90] }: { value: number; onChange: (days: number) => void; options?: number[] }) {
  const t = useT();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={String(value)}
      onValueChange={(v) => v && onChange(Number(v))}
      aria-label={t('Davr', 'Период')}
    >
      {options.map((days) => (
        <ToggleGroupItem key={days} value={String(days)} className="px-3">
          {t(`${days} kun`, `${days} дней`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Folds a daily series into the 12 points a sparkline can show. */
function toSparkline(data: ChartPoint[], key: string, mode: 'sum' | 'last'): { day: string; value: number }[] {
  const size = Math.max(1, Math.ceil(data.length / 12));
  const out: { day: string; value: number }[] = [];
  for (let end = data.length; end > 0; end -= size) {
    const slice = data.slice(Math.max(0, end - size), end);
    const values = slice.map((p) => Number(p[key]) || 0);
    out.unshift({
      day: String(slice[slice.length - 1].day),
      value: mode === 'sum' ? values.reduce((a, b) => a + b, 0) : values[values.length - 1],
    });
  }
  return out;
}

function Sparkline({ data, dataKey, mode, label }: { data: ChartPoint[]; dataKey: string; mode: 'sum' | 'last'; label: string }) {
  const points = toSparkline(data, dataKey, mode);
  const last = points.length - 1;
  return (
    <ChartContainer config={{ value: { label, color: 'var(--chart-1)' } }} className="aspect-auto h-10 w-full">
      <LineChart data={points} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" labelFormatter={(_, p) => fullDay(String(p?.[0]?.payload?.day ?? ''))} />}
        />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.5}
          strokeWidth={2}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: 'var(--color-value)', stroke: 'var(--card)', strokeWidth: 2 }}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === last ? (
              <circle key="end" cx={props.cx} cy={props.cy} r={4} fill="var(--color-value)" stroke="var(--card)" strokeWidth={2} />
            ) : (
              <g key={props.index} />
            )
          }
        />
      </LineChart>
    </ChartContainer>
  );
}

function Delta({ current, previous, upIsGood, period }: { current: number; previous: number; upIsGood: boolean; period: string }) {
  if (previous === 0) return null;
  const change = (current - previous) / previous;
  const flat = Math.abs(change) < 0.005;
  const up = change > 0;
  const good = up === upIsGood;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <Badge variant="outline" title={period}>
      <Icon className={cn(!flat && (good ? 'text-emerald-500' : 'text-destructive'))} />
      {up ? '+' : ''}
      {Math.round(change * 100)}%
    </Badge>
  );
}

/** shadcn's dashboard card: label, figure, change against the previous period, trend under it. */
export function StatCard({ label, value, hint, trend, previous, upIsGood = true, mode = 'sum' }: {
  label: string;
  value: number | string;
  hint?: ReactNode;
  trend?: { data: ChartPoint[]; key: string };
  /** Total of the period before, for the change badge. Leave out for a level such as a balance. */
  previous?: number;
  upIsGood?: boolean;
  mode?: 'sum' | 'last';
}) {
  const t = useT();
  const total = trend ? trend.data.reduce((sum, p) => sum + (Number(p[trend.key]) || 0), 0) : 0;
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold" title={typeof value === 'number' ? formatNumber(value) : undefined}>
          {typeof value === 'number' ? formatCompactFull(value) : value}
        </CardTitle>
        {previous !== undefined ? (
          <CardAction>
            <Delta current={total} previous={previous} upIsGood={upIsGood} period={t('Oldingi davrga nisbatan', 'К предыдущему периоду')} />
          </CardAction>
        ) : null}
      </CardHeader>
      {trend || hint ? (
        <CardContent className="flex flex-col gap-2">
          {trend ? <Sparkline data={trend.data} dataKey={trend.key} mode={mode} label={label} /> : null}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

/** Whole numbers up to a million: a stat figure should read exactly as long as it fits. */
function formatCompactFull(value: number): string {
  return Math.abs(value) >= 1_000_000 ? formatCompact(value) : formatNumber(value);
}

function DataTable({ data, series }: { data: ChartPoint[]; series: ChartSeries[] }) {
  const t = useT();
  return (
    <div className="max-h-[260px] overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Sana', 'Дата')}</TableHead>
            {series.map((s) => (
              <TableHead key={s.key} className="text-right">
                {s.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...data].reverse().map((p) => (
            <TableRow key={p.day}>
              <TableCell>{fullDay(p.day)}</TableCell>
              {series.map((s) => (
                <TableCell key={s.key} className="text-right tabular-nums">
                  {formatNumber(Number(p[s.key]) || 0)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** A daily chart in a card, with its table twin one click away. One axis, always. */
export function TrendCard({ title, description, data, series, kind = 'area', className }: {
  title: string;
  description?: string;
  data: ChartPoint[];
  series: ChartSeries[];
  kind?: 'area' | 'bar';
  className?: string;
}) {
  const t = useT();
  const [asTable, setAsTable] = useState(false);
  const config = configOf(series);

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={shortDay} />
      <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} tickFormatter={(v: number) => (v >= 10_000 ? formatCompact(v) : String(v))} />
    </>
  );
  const tooltipContent = <ChartTooltipContent indicator="line" labelFormatter={(value) => fullDay(String(value))} />;
  // itemSorter off: the legend keeps the order of `series`, not the alphabet of its keys.
  const legend = series.length > 1 ? <ChartLegend itemSorter={null} content={<ChartLegendContent />} /> : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            aria-label={asTable ? t("Grafikni ko'rsatish", 'Показать график') : t("Jadvalni ko'rsatish", 'Показать таблицу')}
            title={asTable ? t('Grafik', 'График') : t('Jadval', 'Таблица')}
          >
            {asTable ? <BarChart3 /> : <Table2 />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {asTable ? (
          <DataTable data={data} series={series} />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
            {kind === 'area' ? (
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                {axes}
                <ChartTooltip content={tooltipContent} />
                {legend}
                {series.map((s) => (
                  <Area
                    key={s.key}
                    dataKey={s.key}
                    type="monotone"
                    stroke={`var(--color-${s.key})`}
                    strokeWidth={2}
                    fill={`var(--color-${s.key})`}
                    fillOpacity={0.1}
                    isAnimationActive={false}
                    activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                {axes}
                <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={tooltipContent} />
                {legend}
                {series.map((s) => (
                  <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                ))}
              </BarChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Parts of a whole to compare: ranked bars on one baseline, one hue, each value printed. */
export function RankedCard({ title, description, items, emptyText, className }: {
  title: string;
  description?: string;
  items: { key: string; label: string; value: number }[];
  emptyText: string;
  className?: string;
}) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((i) => i.value));
  const total = sorted.reduce((sum, i) => sum + i.value, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sorted.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p> : null}
        {sorted.map((item) => (
          <div key={item.key} title={`${item.label}: ${formatNumber(item.value)} (${Math.round((item.value / Math.max(1, total)) * 100)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="font-medium tabular-nums">{formatNumber(item.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 min-w-1 rounded-full bg-chart-1" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
