/**
 * Info (pezzo 7) — nel browser: la scelta cookie attuale e «Cambia la scelta» (riapre il banner, lib/cookie-client.ts).
 * Si avvia su `astro:page-load`, si spegne su `astro:before-swap`.
 */
import { sceltaCookie } from './cookie-client';

let spegni: (() => void) | null = null;

function avvia(): void {
  spegni?.();
  spegni = null;
  const box = document.querySelector<HTMLElement>('[data-info-cookie]');
  if (!box) return;
  const testi = JSON.parse(box.dataset.i18n ?? '{}') as Record<string, string>;
  const riga = box.querySelector<HTMLElement>('[data-info-scelta]')!;
  const bottone = box.querySelector<HTMLButtonElement>('[data-info-cambia]')!;
  const scrivi = () => {
    const s = sceltaCookie();
    riga.textContent = !s ? testi.nessuna ?? '' : s.statistici ? testi.tutti ?? '' : testi.necessari ?? '';
  };
  const ac = new AbortController();
  bottone.addEventListener('click', () => document.dispatchEvent(new CustomEvent('galleria:cookie-apri', { detail: bottone })), { signal: ac.signal });
  document.addEventListener('galleria:cookie-scelta', scrivi, { signal: ac.signal });
  scrivi();
  spegni = () => ac.abort();
}

document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
