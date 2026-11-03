/**
 * Menu «What?» dell'header (components/Header.astro): un bottone che apre e chiude una tendina di link.
 * Esc e clic fuori chiudono (Esc rimette il fuoco sul bottone); un link scelto chiude subito.
 * Aperto: <html data-what-aperto>, così l'header in home smette di essere in differenza e diventa bianco.
 * Ascoltatori delegati sul documento: valgono anche dopo i cambi pagina del ClientRouter.
 */
const movimento = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const btn = () => document.querySelector<HTMLButtonElement>('[data-what-apri]');
const menu = () => document.querySelector<HTMLElement>('[data-what-menu]');
let anim: Animation | null = null;

function aperto() { return btn()?.getAttribute('aria-expanded') === 'true'; }

function apri() {
  const b = btn(), m = menu();
  if (!b || !m || aperto()) return;
  anim?.cancel();
  b.setAttribute('aria-expanded', 'true');
  document.documentElement.setAttribute('data-what-aperto', '');
  m.hidden = false;
  if (!movimento()) return;
  // le voci scendono una dopo l'altra, come carte tirate fuori dal mazzo
  m.querySelectorAll<HTMLElement>('.what__a').forEach((a, i) =>
    a.animate([{ opacity: 0, transform: 'translateY(-40%)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 35, easing: EASE_OUT, fill: 'backwards' }));
  anim = m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
}

function chiudi({ fuoco = false, subito = false } = {}) {
  const b = btn(), m = menu();
  if (!b || !m || !aperto()) return;
  b.setAttribute('aria-expanded', 'false');
  const fine = () => { m.hidden = true; document.documentElement.removeAttribute('data-what-aperto'); };
  anim?.cancel();
  if (fuoco) b.focus();
  if (subito || !movimento()) { fine(); return; }
  anim = m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' });
  anim.finished.then(fine, () => {});
}

document.addEventListener('click', (e) => {
  const el = e.target as Element | null;
  if (el?.closest?.('[data-what-apri]')) { if (aperto()) chiudi(); else apri(); return; }
  if (el?.closest?.('[data-what-menu] a[href]')) { chiudi({ subito: true }); return; }
  if (aperto() && !el?.closest?.('[data-what]')) chiudi();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aperto()) { e.preventDefault(); chiudi({ fuoco: true }); }
});
// il fuoco esce dal menu con Tab: si chiude
document.addEventListener('focusin', (e) => {
  if (aperto() && !(e.target as Element | null)?.closest?.('[data-what]')) chiudi();
});
document.addEventListener('astro:before-swap', () => chiudi({ subito: true }));
