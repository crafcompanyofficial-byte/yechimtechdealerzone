import type { ChartPoint } from '@/components/app/charts';
import { rpc } from '@/lib/supabase';

/** The seller gets the same rows without the money: no balance, no tag sales. */
export type StatsPoint = ChartPoint & {
  activated: number;
  claimed: number;
  requests: number;
  orders: number;
  clients: number;
  balance?: number;
  tags_sold?: number;
};

export interface Stats {
  days: number;
  series: StatsPoint[];
  previous: Record<'activated' | 'claimed' | 'requests' | 'orders' | 'clients', number>;
  passports_by_status: { status: string; count: number }[];
  requests_by_status: { status: string; count: number }[];
}

export function loadStats(days: number): Promise<Stats> {
  return rpc<Stats>('store_stats', { p_days: days });
}

export interface StoreDashboard {
  store_name: string;
  store_status: string;
  role: string;
  passport_balance?: number;
  tags_free?: number;
  passports_pending: number;
  passports_claimed: number;
  requests_new: number;
  requests_overdue: number;
  orders_new: number;
}
