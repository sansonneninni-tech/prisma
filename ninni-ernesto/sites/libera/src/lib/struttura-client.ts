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
  // A8: si apre dall'alto, poi le voci salgono una dopo l'altra (0,04 s)
  animazione = tendina(d, true, 500);
  const voci = [...d.querySelectorAll<HTMLElement>('.idx__a')];
  if (!voci.length) return;
  d.setAttribute('data-anim', '');
  const fini = voci.map((v, i) =>
    v.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 500, delay: 120 + i * 40, easing: EASE_OUT, fill: 'backwards' }).finished,
  );
  Promise.allSettled(fini).then(() => d.removeAttribute('data-anim'));
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
    ? tendina(d, false, 300)
    : d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
  animazione.finished.then(fine, () => {});
}

/** La tendina di A8 (si scopre dall'alto) solo con transform, stesso aspetto, durata e curva di prima (lavoro
 *  «animazioni fluide» 22/10; prima clip-path inset(0 0 100% 0) → inset(0) sul dialog a tutto schermo, ridisegnato a
 *  ogni fotogramma e non sul compositore in Safari). Il dialog, che ritaglia il suo contenuto, scende da -100% a 0 e
 *  i suoi figli salgono della stessa misura: restano fermi e il bordo in basso scende scoprendoli, come col ritaglio.
 *  Durante la corsa il dialog non scorre (overflow hidden: i figli spostati non allungano lo scorrimento).
 *  Chiudendo resta dov'è finita (fill) fino a d.close(). Restituisce l'animazione del dialog. */
function tendina(d: HTMLElement, apri: boolean, durata: number): Animation {
  const h = d.clientHeight;
  const o: KeyframeAnimationOptions = { duration: durata, easing: EASE_OUT, fill: apri ? 'none' : 'forwards' };
  const k = (da: string) => (apri ? [{ transform: da }, { transform: 'none' }] : [{ transform: 'none' }, { transform: da }]);
  const figli = [...d.children] as HTMLElement[];
  for (const c of figli) {
    c.getAnimations().filter((x) => x.id === 'tendina').forEach((x) => x.cancel());
    c.animate(k(`translateY(${h}px)`), { ...o, id: 'tendina' });
  }
  d.style.overflow = 'hidden';
  const a = d.animate(k('translateY(-100%)'), o);
  const fine = () => {
    if (animazione !== a && animazione) return;
    d.style.removeProperty('overflow');
    if (apri) return;
    // chiuso: i figli tornano al loro posto (il dialog non si vede più)
    figli.forEach((c) => c.getAnimations().filter((x) => x.id === 'tendina').forEach((x) => x.cancel()));
  };
  a.finished.then(() => queueMicrotask(fine), fine);
  return a;
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
// da 768 l'Indice è la mappa: il dialog non deve restare aperto
window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => { if (e.matches) chiudi({ subito: true }); });

/* ---------- ogni pagina (anche dopo il ClientRouter) ---------- */
document.addEventListener('astro:page-load', () => {
  nuovaStoria();
  scriviConta($cartCount.get(), false);
  ultimoConto = $cartCount.get();
  sincronizzaLingue();
  correggiCorrente();
});
