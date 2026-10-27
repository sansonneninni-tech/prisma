/**
 * Il quadratino del colore di fondo (Header.astro): si apre in una barra; la barra va da 0 a 1000 lungo il gradiente
 * nero → viola → blu → verde → giallo → rosso → bianco (come Luke & Nik, che parte da 158). Il colore lo applica lo
 * script in testa a Base.astro (window.__neFondo) e resta salvato nel browser. Dopo un cambio pagina del ClientRouter
 * gli attributi di <html> sono quelli nuovi: si riapplica.
 */
type Fondo = { applica: (v: number) => void; v: number };
const fondo = () => (window as unknown as { __neFondo?: Fondo }).__neFondo;

function sincronizza() {
  const f = fondo();
  if (!f) return;
  f.applica(f.v);
  const inp = document.querySelector<HTMLInputElement>('[data-fondo-in]');
  if (inp) inp.value = String(f.v);
}
document.addEventListener('astro:after-swap', sincronizza);
document.addEventListener('astro:page-load', sincronizza);

function apri(b: HTMLButtonElement, si: boolean) {
  const barra = document.getElementById(b.getAttribute('aria-controls') ?? '');
  if (!barra) return;
  barra.hidden = !si;
  b.setAttribute('aria-expanded', String(si));
  if (si) barra.querySelector<HTMLInputElement>('input')?.focus();
}
document.addEventListener('click', (e) => {
  const el = e.target as Element | null;
  const b = el?.closest?.<HTMLButtonElement>('[data-fondo-apri]');
  if (b) { apri(b, b.getAttribute('aria-expanded') !== 'true'); return; }
  // clic fuori: la barra si chiude
  const aperto = document.querySelector<HTMLButtonElement>('[data-fondo-apri][aria-expanded="true"]');
  if (aperto && !el?.closest?.('[data-fondo]')) apri(aperto, false);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const aperto = document.querySelector<HTMLButtonElement>('[data-fondo-apri][aria-expanded="true"]');
  if (aperto) { apri(aperto, false); aperto.focus(); }
});
document.addEventListener('input', (e) => {
  const inp = (e.target as Element | null)?.closest?.<HTMLInputElement>('[data-fondo-in]');
  const f = fondo();
  if (!inp || !f) return;
  f.v = Number(inp.value);
  f.applica(f.v);
  try { localStorage.setItem('ne:fondo', String(f.v)); } catch {}
});
