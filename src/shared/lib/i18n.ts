import { create } from 'zustand';

export type Lang = 'uz' | 'ru';

const STORAGE_KEY = 'ys-lang';

function savedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ru' ? 'ru' : 'uz';
  } catch {
    return 'uz';
  }
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: savedLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

/** Texts sit next to their use, as pairs: t("Do'konlar", 'Магазины'). */
export function useT(): (uz: string, ru: string) => string {
  const lang = useLangStore((s) => s.lang);
  return (uz, ru) => (lang === 'ru' ? ru : uz);
}

/** For code outside components (error messages, toasts). */
export function tr(uz: string, ru: string): string {
  return useLangStore.getState().lang === 'ru' ? ru : uz;
}
