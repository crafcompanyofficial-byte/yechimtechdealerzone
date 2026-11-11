import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { tr } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export type StoreRole = 'owner' | 'manager' | 'seller' | 'warehouse' | 'master';

export interface Member {
  id: string;
  role: StoreRole;
  full_name: string | null;
  store_id: string;
  branch_id: string | null;
  tg_id: number | null;
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  settings: { serial_required?: boolean } | null;
}

const STAFF_DOMAIN = 'staff.yechim.systems';

interface AuthState {
  status: 'loading' | 'signed_out' | 'ready';
  session: Session | null;
  member: Member | null;
  store: StoreInfo | null;
  /** Returns an error message, or null on success. */
  login: (login: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
}

let listenerAttached = false;

async function loadMember(session: Session): Promise<{ member: Member; store: StoreInfo } | null> {
  const { data: member, error } = await supabase
    .from('store_members')
    .select('id, role, full_name, store_id, branch_id, tg_id, is_active')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error || !member?.is_active) return null;

  const { data: store } = await supabase.from('stores').select('id, name, slug, status, settings').eq('id', member.store_id).maybeSingle();
  if (!store) return null;
  return { member: member as Member, store: store as StoreInfo };
}

export const useAuthStore = create<AuthState>((set) => {
  /** Accepts the session only for an active employee of a store; anything else is signed out. */
  async function apply(session: Session | null): Promise<boolean> {
    if (!session) {
      set({ status: 'signed_out', session: null, member: null, store: null });
      return true;
    }
    const found = await loadMember(session);
    if (!found) {
      await supabase.auth.signOut();
      set({ status: 'signed_out', session: null, member: null, store: null });
      return false;
    }
    set({ status: 'ready', session, ...found });
    return true;
  }

  return {
    status: 'loading',
    session: null,
    member: null,
    store: null,

    login: async (login, password) => {
      const name = login.trim().toLowerCase();
      const email = name.includes('@') ? name : `${name}@${STAFF_DOMAIN}`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return tr("Login yoki parol noto'g'ri", 'Неверный логин или пароль');
      return (await apply(data.session)) ? null : tr("Kirish faqat do'kon xodimlari uchun", 'Вход только для сотрудников магазина');
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ status: 'signed_out', session: null, member: null, store: null });
    },

    initialize: async () => {
      if (!listenerAttached) {
        listenerAttached = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          // Deferred: awaiting supabase calls inside this callback can deadlock supabase-js v2.
          setTimeout(() => void apply(session), 0);
        });
      }
      const { data } = await supabase.auth.getSession();
      await apply(data.session);
    },

    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      await apply(data.session);
    },
  };
});

/** The role table of section 2. The database checks the same; this only hides what would fail. */
export function useRole() {
  const role = useAuthStore((s) => s.member?.role ?? null);
  return {
    role,
    is: (...roles: StoreRole[]) => role !== null && roles.includes(role),
    manages: role === 'owner' || role === 'manager',
    isOwner: role === 'owner',
    sells: role === 'owner' || role === 'manager' || role === 'seller',
  };
}

/** Where each role starts: the panel is for those who see the store's figures. */
export function homeOf(role: StoreRole | null): string {
  if (role === 'master') return '/requests';
  if (role === 'warehouse') return '/products';
  return '/';
}
