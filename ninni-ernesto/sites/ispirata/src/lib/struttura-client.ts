/**
 * Comportamento di header, Indice e lingue (pezzo 1). Un modulo solo, caricato una volta da Base.astro:
 * gli ascoltatori sono delegati o rifatti su `astro:page-load`, così sopravvivono al ClientRouter.
 *   - «Carrello (n)» da $cartCount del core, con A10 (cifra vecchia in alto, nuova dal basso);
 *   - annunci del carrello nella regione della pagina corrente dopo un cambio pagina;
 *   - lingue: portano ?query e #àncora della pagina, salvano la scelta in `isa:lang`;
 *   - Indice sul telefono: <dialog> modale, A8, focus intrappolato, Esc, ritorno del fuoco, scroll bloccato;
 *   - voce corrente «Stampe» con ?vista=stampe (si sa solo nel browser).
 */
import { $cartCount, $cartEvent } from '@ne/core/cart';
import { announce, readTranslator } from '@ne/core/ui';
import { lockScroll, unlockScroll, resetScrollLock } from './scroll-lock';
import { CHIAVI, scriviTesto } from './storage';
import { storiaDialog, arrivoConHash, seguiLink, HASH_DIALOG, type Storia } from './dialog-storia';

const movimento = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/* ---------- Carrello (n) + A10 ---------- */
const testoConta = (n: number) => (n > 99 ? '99+' : String(n));
let ultimoConto: number | null = null;

function scriviConta(n: number, anima: boolean) {
  for (const box of document.querySelectorAll<HTMLElement>('[data-conta]')) {
    const vecchia = box.lastElementChild as HTMLElement | null;
    const testo = testoConta(n);
    if (vecchia && vecchia.textContent === testo) continue;
    if (!anima || !vecchia || !movimento() || box.offsetParent === null) {
      box.replaceChildren(Object.assign(document.createElement('span'), { textContent: testo }));
      continue;
    }
    // le due cifre stanno nella stessa cella della griglia: la vecchia esce in alto, la nuova entra dal basso
    for (const resto of [...box.children]) if (resto !== vecchia) resto.remove();
    const nuova = Object.assign(document.createElement('span'), { textContent: testo });
    box.append(nuova);
    const opz = { duration: 300, easing: EASE_OUT };
    vecchia.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], opz).finished.then(() => vecchia.remove(), () => {});
    nuova.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], opz);
  }
}
$cartCount.subscribe((n) => {
  scriviConta(n, ultimoConto !== null && n !== ultimoConto);
  ultimoConto = n;
});

/* ---------- annunci del carrello dopo un cambio pagina ---------- */
const primaRegione = document.querySelector<HTMLElement>('[data-isa-cart-live]');
$cartEvent.listen((e) => {
  const regione = document.querySelector<HTMLElement>('[data-isa-cart-live]');
  if (!e || !regione || regione === primaRegione) return; // sulla prima pagina annuncia già il core
  const t = readTranslator(regione);
  let msg = '';
  if (e.type === 'added') msg = t('carrello.aggiunto', { titolo: e.title });
  else if (e.type === 'removed') msg = t('carrello.rimosso', { titolo: e.title });
  else if (e.type === 'quantity') msg = t('core.cart.quantita_aggiornata', { titolo: e.title, n: e.quantity });
  else if (e.type === 'max-quantity') msg = e.kind === 'original' ? t('carrello.originale_quantita') : '';
  else if (e.type === 'cleared') msg = t('carrello.vuoto_titolo');
  if (msg) announce(regione, msg);
});

/* ---------- lingue ---------- */
/** I link lingua portano la query (filtri) e l'àncora della pagina; il percorso resta quello del server. */
function sincronizzaLingue() {
  const extra = location.search.replace(/%2C/g, ',') + (HASH_DIALOG.includes(location.hash) ? '' : location.hash);
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-lingua]')) {
    const base = (a.getAttribute('href') ?? '').replace(/[?#].*$/, '');
    a.setAttribute('href', base + extra);
  }
}
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[data-lingua]');
  if (!a?.dataset.lingua) return;
  sincronizzaLingue(); // anche se l'URL è cambiato senza avvisare
  scriviTesto(CHIAVI.lingua, a.dataset.lingua);
});
window.addEventListener('hashchange', sincronizzaLingue);
document.addEventListener('galleria:url-cambiato', sincronizzaLingue);

/* ---------- voce corrente con ?vista=stampe ---------- */
function correggiCorrente() {
  const stampe = new URLSearchParams(location.search).get('vista') === 'stampe';
  const opere = /^\/(it|en|zh)\/opere\/$/.test(location.pathname);
  for (const a of document.querySelectorAll<HTMLAnchorElement>('.idx__a')) {
    const vista = a.dataset.vista;
    if (!opere) { if (vista) a.removeAttribute('aria-current'); continue; }
    const attiva = vista ? stampe && vista === 'stampe' : false;
    if (vista) { if (attiva) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    else if (a.getAttribute('aria-current') === 'page' && stampe) a.removeAttribute('aria-current');
  }
}
document.addEventListener('galleria:url-cambiato', correggiCorrente);

/* ---------- Indice (telefono) ---------- */
const dialogo = () => document.querySelector<HTMLDialogElement>('[data-indice]');
const apriBtn = () => document.querySelector<HTMLButtonElement>('[data-indice-apri]');
let animazione: Animation | null = null;
const EASE_LN = 'cubic-bezier(0.5, 0, 0.5, 1)';
// Indietro del telefono chiude l'Indice (audit finale 1, telefono #1): una voce di storia `#indice-aperto`
let storia: Storia | null = null;
function nuovaStoria() {
  storia?.stacca();
  storia = dialogo()
    ? storiaDialog({ hash: '#indice-aperto', chiave: 'galIndice', aperto: () => !!dialogo()?.open, chiudi: () => chiudi(), riapri: () => apri() })
    : null;
  arrivoConHash('#indice-aperto', 'galIndice');
}

function apri() {
  const d = dialogo();
  if (!d || d.open) return;
  animazione?.cancel();
  correggiCorrente();
  d.showModal();
  d.focus({ preventScroll: true });
  d.scrollTop = 0;
  lockScroll();
  apriBtn()?.setAttribute('aria-expanded', 'true');
  storia?.entra();
  if (!movimento()) {
    animazione = d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    return;
  }
  // come l'Index di Luke & Nik: sale dal basso, 0,8 s, cubic-bezier(.5,0,.5,1)
  animazione = d.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 800, easing: EASE_LN });
}

function chiudi({ subito = false } = {}) {
  const d = dialogo();
  if (!d || !d.open) return;
  apriBtn()?.setAttribute('aria-expanded', 'false');
  const fine = () => {
    d.close();
    d.removeAttribute('data-anim');
    unlockScroll();
    storia?.esci();
    if (!subito) apriBtn()?.focus();
  };
  animazione?.cancel();
  if (subito) { fine(); return; }
  animazione = movimento()
    ? d.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 600, easing: EASE_LN, fill: 'forwards' })
    : d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
  animazione.finished.then(fine, () => {});
}

/** Tab gira fra il primo e l'ultimo elemento del dialog (oltre all'inerzia del modale). */
function trappola(e: KeyboardEvent) {
  const d = dialogo();
  if (e.key !== 'Tab' || !d?.open) return;
  const f = [...d.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null || el.getClientRects().length);
  if (!f.length) return;
  const primo = f[0]!, ultimo = f[f.length - 1]!;
  if (e.shiftKey && (document.activeElement === primo || document.activeElement === d)) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
}

document.addEventListener('click', (e) => {
  const el = e.target as Element | null;
  if (el?.closest?.('[data-indice-apri]')) apri();
  else if (el?.closest?.('[data-indice-chiudi]')) chiudi();
  else if (el?.closest?.('[data-indice] a[href]')) {
    // link a un'àncora della stessa pagina: il ClientRouter non cambia pagina, quindi si chiude qui
    const a = el.closest<HTMLAnchorElement>('a[href]')!;
    const u = new URL(a.href, location.href);
    if (u.pathname === location.pathname && u.search === location.search) chiudi({ subito: true });
  }
});
// link dell'Indice (pagine, àncore, lingue): la voce `#indice-aperto` diventa la pagina d'arrivo
document.addEventListener('click', (e) => {
  if (!(e.target as Element | null)?.closest?.('[data-indice] a[href]')) return;
  seguiLink(e, storia, () => chiudi({ subito: true }));
}, { capture: true });
document.addEventListener('keydown', trappola);
// Esc: chiude con la stessa animazione (e rimette il fuoco su «Indice»)
document.addEventListener('cancel', (e) => {
  if ((e.target as Element | null)?.matches?.('[data-indice]')) { e.preventDefault(); chiudi(); }
}, true);
// cambio pagina da un link dell'Indice: chiuso subito, scroll sbloccato
document.addEventListener('astro:before-swap', () => { storia?.rilascia(); chiudi({ subito: true }); resetScrollLock(); });

/* ---------- ogni pagina (anche dopo il ClientRouter) ---------- */
document.addEventListener('astro:page-load', () => {
  nuovaStoria();
  scriviConta($cartCount.get(), false);
  ultimoConto = $cartCount.get();
  sincronizzaLingue();
  correggiCorrente();
});
