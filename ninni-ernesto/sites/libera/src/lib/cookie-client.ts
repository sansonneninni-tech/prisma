/**
 * Banner cookie (pezzo 7) — nel browser. La scelta sta in localStorage (`galleria:cookie:v1`):
 * `{ necessari: true, statistici: boolean, marketing: false, data }`. Senza scelta il banner compare (A9 corto, dal
 * basso; con riduci movimento solo dissolvenza). Gli ascoltatori si mettono una volta sola per elemento: il banner è
 * `transition:persist`, quindi dopo un cambio pagina del ClientRouter è lo stesso nodo.
 * Eventi: `galleria:cookie-apri` (da Info, «Cambia la scelta») lo riapre; dopo una scelta parte `galleria:cookie-scelta`.
 * Nella demo non c'è nessuno strumento statistico: la scelta si salva e basta.
 */
import { CHIAVI, leggi, scrivi } from './storage';

export interface SceltaCookie { necessari: true; statistici: boolean; marketing: false; data: string }

export const sceltaCookie = (): SceltaCookie | null => leggi<SceltaCookie>(CHIAVI.cookie);

let ritorno: HTMLElement | null = null;

function banner(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-cookie]');
}

/** Altezza del banner su <html> (`--ingombro-cookie`): l'apertura della home si accorcia e il banner non copre l'opera. */
let ro: ResizeObserver | null = null;
function ingombro(el: HTMLElement | null): void {
  const html = document.documentElement;
  ro?.disconnect();
  ro = null;
  html.toggleAttribute('data-cookie-aperto', !!el && !el.hidden);
  if (!el || el.hidden) { html.style.removeProperty('--ingombro-cookie'); return; }
  const scrivi = () => html.style.setProperty('--ingombro-cookie', `${Math.ceil(el.getBoundingClientRect().height)}px`);
  scrivi();
  if ('ResizeObserver' in window) { ro = new ResizeObserver(scrivi); ro.observe(el); }
}

function mostra(el: HTMLElement, anima: boolean): void {
  el.toggleAttribute('data-entra', anima);
  el.hidden = false;
  ingombro(el);
}

function avvia(): void {
  const el = banner();
  if (!el) return;
  if (!el.dataset.pronto) {
    el.dataset.pronto = '';
    el.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-cookie-scelta]');
      if (!b) return;
      const scelta: SceltaCookie = { necessari: true, statistici: b.dataset.cookieScelta === 'tutti', marketing: false, data: new Date().toISOString() };
      scrivi(CHIAVI.cookie, scelta);
      const dentro = el.contains(document.activeElement);
      el.hidden = true;
      el.removeAttribute('data-entra');
      ingombro(null);
      document.dispatchEvent(new CustomEvent('galleria:cookie-scelta', { detail: scelta }));
      if (dentro) (ritorno?.isConnected ? ritorno : document.getElementById('contenuto'))?.focus({ preventScroll: true });
      ritorno = null;
    });
  }
  // di solito lo ha già mostrato lo script in linea di Cookie.astro (prima del primo disegno, con data-entra)
  if (!sceltaCookie() && el.hidden) mostra(el, true);
  else ingombro(el.hidden ? null : el);
}

document.addEventListener('astro:page-load', avvia);
// il banner passa alla pagina nuova (transition:persist): senza data-entra non rifà l'entrata a ogni cambio pagina
document.addEventListener('astro:before-swap', () => banner()?.removeAttribute('data-entra'));
document.addEventListener('galleria:cookie-apri', (e) => {
  const el = banner();
  if (!el) return;
  ritorno = (e as CustomEvent<HTMLElement | undefined>).detail ?? null;
  mostra(el, true);
  el.querySelector<HTMLElement>('[data-cookie-scelta]')?.focus({ preventScroll: true });
});
