/** localStorage con try/catch: in navigazione privata o con i dati bloccati il sito funziona lo stesso. */
export function leggi<T = string>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function scrivi(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* niente: la scelta vale solo per questa visita */
  }
}

/** Testo semplice (senza JSON): serve per `isa:lang`, letta così da LocaleRedirect del core. */
export function leggiTesto(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function scriviTesto(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* niente */ }
}

/** Chiavi usate da Galleria (il carrello usa le sue, in @ne/core/cart). */
export const CHIAVI = {
  /** stessa chiave di LanguageSwitcher/LocaleRedirect del core (testo semplice) */
  lingua: 'isa:lang',
  /** font già scaricato in questa scheda: niente preload dal secondo caricamento (sessionStorage) */
  font: 'galleria:font',
  cookie: 'galleria:cookie:v1',
} as const;
