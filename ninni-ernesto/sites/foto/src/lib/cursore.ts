/**
 * A7 Cursore con etichetta (DIREZIONE §8): solo con `(hover: hover) and (pointer: fine)` e senza riduci movimento
 * (lo carica lib/movimento.ts). Un'etichetta nera 12 px accanto alla punta del mouse dice cosa fa il clic: «Apri» sui
 * pannelli della mappa, «Vedi» sulle opere, «Parete» sul bottone AR, «Ingrandisci» sui particolari.
 * Leggera (audit di ninni 22/10, «appesantiscono il sito»): niente GSAP né rincorsa continua; la posizione segue il
 * mouse direttamente (proprietà `translate`, al massimo una volta per fotogramma), comparsa e scomparsa sono una
 * transizione CSS di opacity e scale (styles/movimento.css). Nascosta durante i cambi pagina (A1–A3), con un dialog
 * aperto e fuori dalla finestra. Etichette tradotte in Base.astro (`[data-cur]`, una per lingua con transition:persist).
 * È decorativa: aria-hidden, i nomi accessibili restano quelli dei link.
 */

/** Dove compare e cosa dice (chiave = data-* del nodo [data-cur]). */
const BERSAGLI: [string, string][] = [
  ['a[data-zoom]', 'apri'],
  ['a[data-card], a[data-seq-a]', 'vedi'],
  ['[data-parete-apri]', 'parete'],
  ['[data-lente-apri]', 'ingrandisci'],
];
const SELETTORE = BERSAGLI.map(([s]) => s).join(', ');
const DISTANZA = 14; // px fra la punta del cursore e l'etichetta

let el: HTMLElement | null = null;
let testo: HTMLElement | null = null;
let visibile = false;
let corrente = '';
let x = -100, y = -100;
let inCambio = false;
let raf = 0;
let bersaglio: Element | null = null;
// i dialog della pagina (lista viva, ritrovata da sola dopo i cambi pagina): a ogni fotogramma si guarda solo `open`
// di questi pochi elementi invece di cercare `dialog[open]` in tutto il documento (correzioni di fluidità n7)
const dialoghi = document.getElementsByTagName('dialog');
function dialogAperto(): boolean {
  for (let i = 0; i < dialoghi.length; i++) if (dialoghi[i]!.open) return true;
  return false;
}

function aggancia(): boolean {
  const nuovo = document.querySelector<HTMLElement>('[data-cur]');
  if (!nuovo) return false;
  if (nuovo === el) return true;
  el = nuovo;
  testo = nuovo.querySelector<HTMLElement>('[data-cur-t]');
  visibile = false;
  corrente = '';
  el.removeAttribute('data-on');
  return true;
}

function mostra(chiave: string) {
  if (!el || !testo) return;
  const etichetta = el.dataset[chiave] ?? '';
  if (!etichetta) { nascondi(); return; }
  if (chiave !== corrente) { testo.textContent = etichetta; corrente = chiave; }
  if (visibile) return;
  visibile = true;
  el.setAttribute('data-on', '');
}
function nascondi(subito = false) {
  if (!el) return;
  // «subito» (cambio pagina): via senza transizione, prima dell'istantanea della view transition
  if (subito) { el.setAttribute('data-subito', ''); requestAnimationFrame(() => el?.removeAttribute('data-subito')); }
  if (!visibile && !subito) return;
  visibile = false;
  corrente = '';
  el.removeAttribute('data-on');
}

/** Rilegge cosa c'è sotto la punta (al movimento e allo scorrere, quando la pagina passa sotto un mouse fermo). */
function aggiorna(b: Element | null) {
  if (inCambio || document.documentElement.hasAttribute('data-scroll-lock') || dialogAperto()) { nascondi(true); return; }
  const t = b?.closest?.(SELETTORE);
  if (!t) { nascondi(); return; }
  mostra(BERSAGLI.find(([s]) => t.matches(s))?.[1] ?? '');
}

function disegna() {
  raf = 0;
  if (!el) return;
  el.style.translate = `${x}px ${y}px`;
  aggiorna(bersaglio);
}

function muovi(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !aggancia()) return;
  x = e.clientX + DISTANZA;
  y = e.clientY + DISTANZA;
  bersaglio = e.target as Element;
  if (!raf) raf = requestAnimationFrame(disegna);
}

export function avviaCursore(): void {
  document.addEventListener('pointermove', muovi, { passive: true });
  document.addEventListener('pointerdown', () => nascondi(), { passive: true });
  document.documentElement.addEventListener('mouseleave', () => nascondi());
  window.addEventListener('scroll', () => {
    // durante i cambi pagina l'etichetta è nascosta comunque: niente elementFromPoint (un layout forzato nel primo
    // fotogramma della pagina nuova di A1; correzioni di fluidità n7)
    if (raf || inCambio || (!visibile && x < 0)) return;
    raf = requestAnimationFrame(() => { bersaglio = document.elementFromPoint(x - DISTANZA, y - DISTANZA); disegna(); });
  }, { passive: true });
  document.addEventListener('galleria:transizione', (e) => {
    inCambio = (e as CustomEvent<{ attiva: boolean }>).detail.attiva;
    if (inCambio) nascondi(true);
  });
  document.addEventListener('astro:page-load', () => { aggancia(); });
  aggancia();
}
