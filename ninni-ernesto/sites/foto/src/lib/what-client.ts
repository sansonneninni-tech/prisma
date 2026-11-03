/**
 * Tendine dell'header (components/Header.astro): «What?» a sinistra e «Shop» (Ninni / Ernesto) a destra.
 * Ognuna è un [data-tendina] con un bottone [data-tendina-apri] e una lista [data-tendina-menu]; se ne apre una alla volta.
 * Esc e clic fuori chiudono (Esc rimette il fuoco sul bottone); un link scelto chiude subito.
 * Aperta: <html data-what-aperto>, così l'header in home smette di essere in differenza e il mazzo si ferma.
 * Ascoltatori delegati sul documento: valgono anche dopo i cambi pagina del ClientRouter.
 */
const movimento = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const anim = new WeakMap<HTMLElement, Animation>(); // un'animazione per tendina

const parti = (t: Element) => ({ b: t.querySelector<HTMLButtonElement>('[data-tendina-apri]'), m: t.querySelector<HTMLElement>('[data-tendina-menu]') });
const aperta = () => [...document.querySelectorAll<HTMLElement>('[data-tendina]')].find((t) => parti(t).b?.getAttribute('aria-expanded') === 'true') ?? null;

function apri(t: HTMLElement) {
  const { b, m } = parti(t);
  if (!b || !m) return;
  const altra = aperta();
  if (altra && altra !== t) chiudi(altra, { subito: true });
  anim.get(m)?.cancel();
  b.setAttribute('aria-expanded', 'true');
  document.documentElement.setAttribute('data-what-aperto', '');
  m.hidden = false;
  if (!movimento()) return;
  // le voci scendono una dopo l'altra, come carte tirate fuori dal mazzo
  m.querySelectorAll<HTMLElement>('.what__a').forEach((a, i) =>
    a.animate([{ opacity: 0, transform: 'translateY(-40%)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 35, easing: EASE_OUT, fill: 'backwards' }));
  anim.set(m, m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' }));
}

function chiudi(t: HTMLElement | null, { fuoco = false, subito = false } = {}) {
  if (!t) return;
  const { b, m } = parti(t);
  if (!b || !m || b.getAttribute('aria-expanded') !== 'true') return;
  b.setAttribute('aria-expanded', 'false');
  const fine = () => { m.hidden = true; if (!aperta()) document.documentElement.removeAttribute('data-what-aperto'); };
  anim.get(m)?.cancel();
  if (fuoco) b.focus();
  if (subito || !movimento()) { fine(); return; }
  const a = m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' });
  anim.set(m, a);
  a.finished.then(fine, () => {});
}

document.addEventListener('click', (e) => {
  const el = e.target as Element | null;
  const btn = el?.closest?.('[data-tendina-apri]');
  if (btn) {
    const t = btn.closest<HTMLElement>('[data-tendina]')!;
    if (btn.getAttribute('aria-expanded') === 'true') chiudi(t); else apri(t);
    return;
  }
  if (el?.closest?.('[data-tendina-menu] a[href]')) { chiudi(aperta(), { subito: true }); return; }
  const t = aperta();
  if (t && !t.contains(el)) chiudi(t);
});
document.addEventListener('keydown', (e) => {
  const t = aperta();
  if (e.key === 'Escape' && t) { e.preventDefault(); chiudi(t, { fuoco: true }); }
});
// il fuoco esce dalla tendina con Tab: si chiude
document.addEventListener('focusin', (e) => {
  const t = aperta();
  if (t && !t.contains(e.target as Node)) chiudi(t);
});
document.addEventListener('astro:before-swap', () => chiudi(aperta(), { subito: true }));
