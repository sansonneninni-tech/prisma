/**
 * Movimento del sito (pezzo 8, DIREZIONE §8; rifatto il 22/10 dopo l'audit di ninni: «non è per niente fluida, c'è lo
 * scattino», «appesantiscono il sito»). Un solo modulo, caricato una volta da Base.astro, per:
 *  - A1/A2 zoom fra la mappa della home e le pagine, leggero: solo `transform` e `opacity`, due strati al massimo,
 *    nessun layout e nessuna pagina che si disegna mentre qualcosa si muove;
 *  - la dissolvenza degli altri cambi pagina (CSS in styles/movimento.css; A3 resta in scheda-client.ts);
 *  - il ripristino dello scroll, uno solo per tutto il sito: con Indietro/Avanti e cambiando lingua, dopo che le
 *    pagine hanno finito di preparare i loro effetti (`pronto()`, per esempio A5 su Opere);
 *  - il cursore con etichetta A7 (lib/cursore.ts, caricato solo con puntatore fine).
 * Lo scorrimento morbido (Lenis) non c'è più: rotella e trackpad nativi (più leggeri, e su Mac già morbidi).
 *
 * Lo zoom (A1/A2) si fa sulla home VERA, non sulle istantanee della view transition: la mappa fa da «camera» (un solo
 * strato, `transform`) e dentro il pannello un velo bianco (`opacity`) copre le immagini e lascia il titolo, che con la
 * camera ravvicinata è grande dove la pagina ha il suo titolo gigante.
 * A1 (mappa → pagina, clic su un pannello o su un link della riga sotto la tavola), 0,65 s: la camera parte al clic e
 *   si avvicina al pannello fino a coprire lo schermo. Intanto la pagina nuova (testo già scaricato al passaggio del
 *   mouse) si legge e se ne preparano stili e prime immagini, e all'86% della corsa (quando alla camera manca meno di
 *   un pixel) si monta, senza view transition: il compositore finisce la coda della camera mentre si monta. Il montaggio
 *   è un taglio senza dissolvenza: l'h1 della pagina parte esattamente dal titolo del pannello (dove la camera lo ha
 *   portato in quel fotogramma, stessa grandezza) e in 0,3 s va al suo posto con un FLIP (solo `transform`), mentre il
 *   resto della pagina compare dal bianco (solo `opacity`). Un solo titolo a ogni fotogramma.
 * A2 (pagina → mappa, «Indice» su computer o Indietro), 0,65 s: la home (testo e immagini della mappa già pronti) si
 *   monta sotto l'istantanea della pagina che si lascia; lo strato della mappa nasce a scala 1 (texture piccola, immagini
 *   già decodificate) per due fotogrammi, poi l'istantanea sparisce nello stesso fotogramma in cui la camera parte
 *   ravvicinata sul pannello (bianco col titolo, come la pagina lasciata) e torna a scala 1; le immagini riappaiono.
 *   Il titolo del pannello parte da dove era l'h1 della pagina lasciata e arriva al suo posto con la camera.
 * Lavoro «animazioni fluide» (22/10, revisioni/animazioni_fluide_22-10.md): stesso disegno, durate e curve; tolte le
 * pause e i salti (pagina pronta durante la corsa, A1 senza istantanea, montaggio sulla coda della camera, titolo di A2
 * senza salto, curva del FLIP che si vede partire prima).
 * Con riduci movimento: dissolvenza di 0,2 s (CSS). L'header e il banner cookie restano fermi.
 */

type Pannello = 'isabella' | 'opere' | 'altro';
type Zoom = { modo: 'dentro' | 'fuori'; pannello: Pannello };
type Punto = { y: number; fondo: boolean; i: number; delta: number; t: number };
type Pronta = { testo: string; tipo: string; doc?: Document; immagini?: Promise<unknown> };

const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
const html = document.documentElement;

const ZOOM_IN = 'cubic-bezier(0.54, 0.15, 0.15, 1)';
// A2 con la stessa curva di A1: parte subito (la view transition non c'è più a coprire l'avvio) e rallenta sul posto
const ZOOM_OUT = 'cubic-bezier(0.54, 0.15, 0.15, 1)';
const D_A1 = 650;
const D_A2 = 650;
const ATTESA_IMMAGINI = 250; // a fine A1 si aspettano al massimo così le prime immagini della pagina nuova
const ATTESA_MAPPA = 150; // A2: le immagini della mappa sono di solito già decodificate (preparate prima); se no, al massimo così
const D_TITOLO = 300; // A1: il FLIP dell'h1 dal titolo del pannello al suo posto, e la comparsa del resto della pagina
// parte da fermo (la camera è ferma) e si posa. Fino al 22/10 0.45, 0, 0.2, 1: nei primi 60 ms il titolo quasi non si
// muoveva e allungava la pausa dopo la camera; con 0.3 parte da fermo lo stesso, ma si vede partire prima
const CURVA_TITOLO = 'cubic-bezier(0.3, 0, 0.2, 1)';
// A1: la pagina nuova si comincia a montare all'86% del tempo della camera (la curva ZOOM_IN ha fatto il 99% della
// strada e si muove di decimi di pixel a fotogramma): il compositore finisce la coda della corsa mentre la pagina si
// monta, e quando il suo primo fotogramma arriva a schermo (almeno due o tre fotogrammi dopo) alla camera manca meno di
// un pixel. La pausa fra la camera e il titolo si accorcia (lavoro «animazioni fluide» 22/10; prima si aspettava la
// fine esatta della corsa e poi si leggeva la pagina)
const MONTAGGIO_A1 = 0.86;
// Correzioni di fluidità n7 (1f): l'istante non è più fisso all'86%, si calcola dalla camera (stessa curva e durata):
// il primo t in cui, su ogni lato, quello che resta scoperto fra il pannello e il bordo dello schermo (o l'header) non
// mostra più niente (vedi istanteMontaggio), meno il tempo di un montaggio (~40 ms con la pagina di Opere ridotta alla
// parte visibile), dentro [0,78; 0,86]. Il primo fotogramma della pagina arriva quando la camera è arrivata a vista
// (niente lampo di mappa al bordo) e non dopo una pausa
const MONTAGGIO_MIN = 0.78;
const COSTO_MONTAGGIO = 40;
// la tavola: Opere a 3 colonne da 1024 e col telefono in orizzontale (styles/home.css), altrimenti a 2
const TRE_COLONNE = window.matchMedia('(min-width: 1024px), (orientation: landscape) and (max-height: 500px)');

/* ======================================================================= pagine e pannelli */
const lingua = (p: string) => p.match(/^\/(it|en|zh)\//)?.[1] ?? '';
const eHome = (p: string) => /^\/(it|en|zh)\/$/.test(p);
/** Il pannello della mappa a cui appartiene una pagina (Stampe sta in Opere, le pagine di Altro in Altro). */
function pannelloDi(p: string): Pannello | null {
  const resto = p.replace(/^\/(it|en|zh)/, '');
  if (resto.startsWith('/ninni/')) return 'opere';
  if (resto.startsWith('/ernesto/')) return 'isabella';
  if (/^\/(altro|carte-e-cornici|chi-siamo)\//.test(resto)) return 'altro';
  return null;
}
/** Il pannello è nella finestra per almeno metà (altrimenti lo zoom partirebbe da qualcosa che non si vede). */
function inVista(el: Element | null): DOMRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
  return r.width > 0 && h > 0 && w > 0 && h * w >= 0.5 * r.width * Math.min(r.height, window.innerHeight) ? r : null;
}
const altezzaHeader = () => Math.max(0, document.querySelector('[data-hd]')?.getBoundingClientRect().bottom ?? 0);

/** La camera: la scala K che fa coprire al pannello lo schermo sotto l'header, con l'angolo in alto a sinistra del
 *  pannello appena sotto l'header (dove la pagina ha il suo titolo gigante). C(q) = K·q + (tx, ty).
 *  Il titolo del pannello deve restare intero: se coprire lo schermo lo farebbe uscire a destra (pannelli quasi
 *  quadrati sul telefono), K si ferma prima e sotto il pannello resta un po' di mappa. */
function camera(r: DOMRect, pan: Element) {
  const H = altezzaHeader();
  const vw = window.innerWidth;
  // il filetto del pannello (Isabella e Altro hanno il bordo a sinistra, Altro anche sopra) resta fuori dallo schermo,
  // e il pannello passa di 1 px sotto l'header: a camera ferma il bordo non diventa una riga grossa K px
  const bx = r.left + (pan as HTMLElement).clientLeft;
  const by = r.top + (pan as HTMLElement).clientTop;
  const w = r.right - bx, h = r.bottom - by;
  const copre = Math.max(vw / w, (window.innerHeight - H + 1) / h);
  const t = pan.querySelector('.pan__t span')?.getBoundingClientRect();
  const sta = t && t.right > bx ? (vw - 12) / (t.right - bx) : copre;
  const K = Math.max(1, Math.min(copre, sta));
  return { K, H, tx: -K * bx, ty: H - 1 - K * by };
}
const ID = 'translate(0px, 0px) scale(1)';

/* ======================================================================= pagine pronte (testo + immagini) */
// La pagina di un pannello si scarica al passaggio del mouse (o al tocco) e, sul computer, si legge e se ne decodificano
// le prime immagini nei momenti liberi: al clic non resta niente da scaricare né da decodificare.
const pronte = new Map<string, Promise<Pronta | null>>();
const chiaveUrl = (u: URL) => u.pathname + u.search;
let animando = false;

function scarica(u: URL, leggi: boolean): Promise<Pronta | null> {
  const k = chiaveUrl(u);
  let p = pronte.get(k);
  if (!p) {
    p = fetch(k).then(async (r) => {
      const tipo = (r.headers.get('content-type') ?? '').split(';', 1)[0]!.trim();
      if (!r.ok || r.redirected || (tipo !== 'text/html' && tipo !== 'application/xhtml+xml')) return null;
      return { testo: await r.text(), tipo };
    }).catch(() => null);
    pronte.set(k, p);
    void p.then((x) => { if (!x) pronte.delete(k); });
  }
  if (leggi) void p.then((x) => { if (x) quandoLibero(() => { leggiPagina(x); }); });
  return p;
}
function quandoLibero(f: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const prova = () => { if (animando || inCambio) { setTimeout(prova, 250); return; } f(); };
  if (w.requestIdleCallback) w.requestIdleCallback(prova, { timeout: 1500 }); else setTimeout(prova, 120);
}
function leggiPagina(x: Pronta): Document {
  if (!x.doc) {
    x.doc = new DOMParser().parseFromString(x.testo, x.tipo as DOMParserSupportedType);
    x.doc.querySelectorAll('noscript').forEach((n) => n.remove());
  }
  if (!x.immagini) x.immagini = decodifica(x.doc);
  return x.doc;
}
/** Le prime immagini visibili della pagina (fuori da [hidden]), caricate e decodificate fuori dal documento: quando la
 *  pagina si monta il browser le ha già in memoria (stessi srcset e sizes). Per la home (A2) sono quelle della mappa:
 *  la stanza e i pannelli, solo la versione della tavola che si vede (2 o 3 colonne), non quelle dell'apertura. */
function decodifica(doc: Document): Promise<unknown> {
  const mappa = doc.querySelector('.mappa');
  const nascosta = TRE_COLONNE.matches ? '.pan__mas--2' : '.pan__mas--3';
  const prime = mappa
    ? [...mappa.querySelectorAll('img')].filter((i) => !i.closest(nascosta))
    : [...doc.querySelectorAll('main img')].filter((i) => !i.closest('[hidden]')).slice(0, 6);
  return Promise.allSettled(prime.map((i) => {
    const nodo = document.importNode(i.closest('picture') ?? i, true) as HTMLElement;
    const img = (nodo.tagName === 'IMG' ? nodo : nodo.querySelector('img')) as HTMLImageElement | null;
    if (!img) return Promise.resolve();
    img.loading = 'eager';
    return img.decode();
  }));
}
/** I fogli di stile della pagina nuova che la pagina vecchia non ha (come fa Astro), prima del montaggio. */
function stili(doc: Document): Promise<unknown> {
  const nuovi = [...doc.querySelectorAll<HTMLLinkElement>('head link[rel=stylesheet]')]
    .filter((l) => !document.querySelector(`link[rel=stylesheet][href="${l.getAttribute('href')}"]`));
  return Promise.all(nuovi.map((l) => new Promise((ok) => {
    const c = document.createElement('link');
    c.rel = 'preload'; c.as = 'style'; c.href = l.getAttribute('href')!;
    c.addEventListener('load', ok); c.addEventListener('error', ok);
    document.head.append(c);
  })));
}
const attendi = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// passaggio del mouse (o tocco) sui pannelli, sulla riga sotto la tavola e su «Indice»: si prepara la pagina
function suPassaggio(e: PointerEvent) {
  if (RM.matches) return;
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('.mappa a[href], a.hd__idx-link[href]');
  if (!a) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || lingua(u.pathname) !== lingua(location.pathname)) return;
  const home = eHome(location.pathname);
  const utile = home ? !!pannelloDi(u.pathname) : eHome(u.pathname) && !!pannelloDi(location.pathname);
  if (!utile) return;
  void scarica(u, e.pointerType === 'mouse');
  // la camera su uno strato suo già prima del clic: il primo fotogramma della corsa non deve crearlo. Uscendo dalla
  // mappa senza clic lo strato si toglie (texture grande in memoria, testo senza antialiasing subpixel)
  const mappa = home ? a.closest<HTMLElement>('.mappa') : null;
  if (!mappa) return;
  mappa.style.setProperty('will-change', 'transform');
  if (!conUscita.has(mappa)) { conUscita.add(mappa); mappa.addEventListener('pointerleave', esceDallaMappa); }
}
const conUscita = new WeakSet<HTMLElement>();
function esceDallaMappa(e: PointerEvent) {
  // col tocco pointerleave arriva prima del clic: lo strato resta per la corsa (la toglie pulisci())
  if (e.pointerType !== 'mouse' || animando || html.dataset.zoom) return;
  (e.currentTarget as HTMLElement).style.removeProperty('will-change');
}
document.addEventListener('pointerover', suPassaggio, { passive: true });
document.addEventListener('pointerdown', suPassaggio, { passive: true });

/* ======================================================================= cambio pagina in corso */
let inCambio = false;
let sicura = 0;
let fineCambio: Promise<void> = Promise.resolve();
let chiudiCambio: () => void = () => {};
// Il lavoro delle pagine (A5 su Opere) aspetta la fine del cambio pagina (corsa della camera compresa): durante lo zoom il filo
// principale resta libero.
export function dopoTransizione(): Promise<void> { return fineCambio; }
function iniziaCambio() {
  if (!inCambio) fineCambio = new Promise((ok) => { chiudiCambio = ok; });
  inCambio = true;
  clearTimeout(sicura);
  sicura = window.setTimeout(finisciCambio, 4000); // riserva: un cambio pagina interrotto non resta aperto
}
function finisciCambio() {
  clearTimeout(sicura);
  inCambio = false;
  chiudiCambio();
}

/* ======================================================================= cursore A7 */
let cursore: Promise<unknown> | null = null;
function accendiCursore() {
  if (cursore || RM.matches || !FINE.matches) return;
  cursore = import('./cursore').then((m) => m.avviaCursore());
}

/* ======================================================================= pronto: un solo ripristino dello scroll */
// Le pagine che preparano effetti asincroni (A5 su Opere) li registrano con pronto(promessa): il ripristino
// aspetta che siano tutti finiti, poi rimette lo scroll una volta sola.
let attese: Promise<unknown>[] = [];
export function pronto(p: Promise<unknown>): void { attese.push(p); }

// Uscendo da una pagina si salva dove si era: «in fondo» come tale, altrimenti la sezione in cima allo schermo e lo
// scarto dal suo bordo (regge se qualcosa sopra cambia altezza), con la y come riserva (logica di Casa, motion.ts).
const RITORNO = 'galleria:ritorno';
const chiave = () => `${location.pathname}|${(history.state as { index?: number } | null)?.index ?? ''}`;
let qui = '';
const ancore = () => Array.from(document.querySelectorAll<HTMLElement>('main > *, main section'));
const leggiTutti = (): Record<string, Punto> => { try { return JSON.parse(sessionStorage.getItem(RITORNO) ?? '{}') ?? {}; } catch { return {}; } };
function punto(): Punto {
  const y = window.scrollY;
  const fondo = y > 0 && y + window.innerHeight >= html.scrollHeight - 2;
  const tutte = ancore();
  let i = -1;
  tutte.forEach((el, k) => { const r = el.getBoundingClientRect(); if (r.top <= 0 && r.bottom > 0) i = k; });
  return { y, fondo, i, delta: i >= 0 ? -tutte[i]!.getBoundingClientRect().top : 0, t: Date.now() };
}
function salva(): void {
  if (!qui) return;
  const punti = leggiTutti();
  punti[qui] = punto();
  const ordinate = Object.entries(punti).sort((a, b) => b[1].t - a[1].t).slice(0, 40);
  try { sessionStorage.setItem(RITORNO, JSON.stringify(Object.fromEntries(ordinate))); } catch { /* resta il router */ }
}
function dove(r: Punto): number {
  const max = Math.max(0, html.scrollHeight - window.innerHeight);
  if (r.fondo) return max;
  const a = r.i >= 0 ? ancore()[r.i] : undefined;
  const y = a ? a.getBoundingClientRect().top + window.scrollY + r.delta : r.y;
  return Math.min(max, Math.max(0, Math.round(y)));
}
function vaiA(y: number): void {
  if (Math.abs(y - window.scrollY) <= 2) return;
  window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
}
let daRimettere: Punto | null = null;
async function rimettiScroll(): Promise<void> {
  const r = daRimettere;
  daRimettere = null;
  // le pagine registrano le attese nel loro astro:page-load: si raccolgono dopo un giro; e mai durante una corsa della
  // camera (la mappa trasformata falserebbe le misure)
  await new Promise((ok) => setTimeout(ok, 0));
  await fineCambio;
  const lista = attese.splice(0);
  await Promise.allSettled(lista);
  if (!r) return;
  let mosso = false;
  const ferma = () => { mosso = true; };
  const ev = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  ev.forEach((n) => window.addEventListener(n, ferma, { passive: true, once: true }));
  if (!mosso) vaiA(dove(r));
  window.setTimeout(() => ev.forEach((n) => window.removeEventListener(n, ferma)), 900);
}

/* ======================================================================= A1: sulla home vera, prima del cambio pagina */
const blocca = (e: Event) => e.preventDefault();
let corrente: { annulla: () => void } | null = null;
let corsaFuori: Promise<void> | null = null;

/** La corsa della camera sulla home vera. «dentro» (A1): da scala 1 al pannello che copre lo schermo, il velo bianco
 *  copre le immagini del pannello. «fuori» (A2): al contrario, dalla camera ravvicinata a scala 1, il velo sparisce. */
function corsa(pan: HTMLElement, r: DOMRect, modo: 'dentro' | 'fuori'): Promise<void> {
  const mappa = document.querySelector<HTMLElement>('.mappa');
  if (!mappa) return Promise.resolve();
  const { K, tx, ty, H } = camera(r, pan);
  // A1: il rettangolo del titolo del pannello a scala 1 e la camera: l'h1 della pagina nuova partirà da dove la camera
  // ha portato il titolo nel fotogramma in cui la pagina nuova arriva a schermo (titoloInCorsa)
  if (modo === 'dentro') {
    const span = pan.querySelector('.pan__t span');
    const testo = span?.textContent?.trim();
    const n = span ? rettangoloTesto(span) : null;
    camA1 = span && testo && n ? { testo, n, K, tx, ty, anim: null } : null;
  }
  // A2: il titolo del pannello parte da dove (e grande quanto) era l'h1 della pagina lasciata e arriva al suo posto con
  // la camera (stessa durata e curva): al taglio dalla pagina alla mappa il titolo non salta più (lavoro «animazioni
  // fluide» 22/10; prima cambiava posto e grandezza di colpo). Sopra la camera (C) un FLIP (T) sullo span: a schermo
  // C(T(q)) parte dal rettangolo dell'h1 e finisce dove il titolo sta a scala 1. Misure prima della camera (scala 1).
  let titoloA2: (() => Animation) | null = null;
  const spanT = pan.querySelector<HTMLElement>('.pan__t span');
  if (modo === 'fuori' && titoloVia && spanT && spanT.textContent?.trim() === titoloVia.testo) {
    const da = titoloVia.r;
    const n = rettangoloTesto(spanT);
    const b = spanT.getBoundingClientRect();
    const k = n.height > 0 ? da.height / (K * n.height) : 1;
    const gx = (da.left - tx) / K, gy = (da.top - ty) / K;
    const dx = gx - b.left - k * (n.left - b.left), dy = gy - b.top - k * (n.top - b.top);
    titoloA2 = () => {
      spanT.style.transformOrigin = '0 0';
      return spanT.animate({ transform: [`translate(${dx}px, ${dy}px) scale(${k})`, ID] },
        { duration: D_A2, easing: ZOOM_OUT, fill: 'both' });
    };
  }
  const vicino = `translate(${tx}px, ${ty}px) scale(${K})`;
  // la camera è sulla mappa: transform-origin = l'angolo della finestra nelle coordinate della mappa, così C(q) vale
  // in coordinate dello schermo. Con la camera ravvicinata il pannello copre lo schermo sotto l'header.
  const m = mappa.getBoundingClientRect();
  mappa.style.transformOrigin = `${-m.left}px ${-m.top}px`;
  mappa.style.willChange = 'transform';
  // il velo bianco dentro il pannello (si muove con la camera, è già nel markup), sotto il titolo del pannello: il
  // titolo resta e diventa grande dove la pagina ha il suo titolo gigante
  const velo = pan.querySelector<HTMLElement>('.pan__velo');
  if (!velo) return Promise.resolve();
  const dentro = modo === 'dentro';
  // la freccia del pannello se ne va col velo (la pagina ha il titolo senza freccia) e torna con le immagini
  const freccia = pan.querySelector<SVGElement>('.pan__t .freccia');
  const anims = [
    mappa.animate({ transform: dentro ? [ID, vicino] : [vicino, ID] },
      { duration: dentro ? D_A1 : D_A2, easing: dentro ? ZOOM_IN : ZOOM_OUT, fill: dentro ? 'forwards' : 'backwards' }),
    // A1: le immagini del pannello si sciolgono nel bianco mentre il pannello cresce; A2: riappaiono nella seconda
    // metà della corsa, quando il pannello è già tornato piccolo (un velo semitrasparente a tutto schermo costa
    // molto al compositore: misurato a 1440/1920, correzioni n4)
    velo.animate({ opacity: dentro ? [0, 1] : [1, 0] },
      dentro ? { duration: D_A1 * 0.6, delay: D_A1 * 0.1, easing: 'linear', fill: 'both' }
        : { duration: D_A2 * 0.4, delay: D_A2 * 0.4, easing: 'linear', fill: 'both' }),
  ];
  if (titoloA2) anims.push(titoloA2());
  if (freccia) {
    anims.push(freccia.animate({ opacity: dentro ? [1, 0] : [0, 1] },
      dentro ? { duration: D_A1 * 0.4, delay: D_A1 * 0.1, easing: 'linear', fill: 'both' }
        : { duration: D_A2 * 0.3, delay: D_A2 * 0.5, easing: 'linear', fill: 'both' }));
  }
  // niente scorrimento durante la corsa (la camera è calcolata sullo schermo di partenza)
  window.addEventListener('wheel', blocca, { passive: false });
  window.addEventListener('touchmove', blocca, { passive: false });
  const pulisci = () => {
    window.removeEventListener('wheel', blocca);
    window.removeEventListener('touchmove', blocca);
    animando = false;
    corrente = null;
    // A1: la mappa resta ferma sulla camera, sul suo strato, fino al cambio pagina (se ne va con la pagina vecchia).
    // Prima (fino al 22/10, lavoro «animazioni fluide») lo strato si toglieva qui per ridisegnare nitido il fotogramma
    // fermo: un ridisegno di tutta la mappa a scala K proprio mentre si monta la pagina nuova, che allungava la pausa
    // fra la corsa e il titolo (e lo strato è già disegnato alla scala della corsa, misurato: nitido)
    if (dentro) return;
    // A2: lo strato si toglie per non tenere in memoria la texture grande
    mappa.style.removeProperty('will-change');
    anims.slice(1).forEach((x) => x.cancel()); // velo, freccia e titolo tornano come sono (fill: both li terrebbe)
    pan.querySelector<HTMLElement>('.pan__t span')?.style.removeProperty('transform-origin');
    mappa.style.removeProperty('transform-origin');
  };
  animando = true;
  document.dispatchEvent(new CustomEvent('galleria:zoom-parte', { detail: { modo } }));
  corrente = {
    annulla: () => {
      anims.forEach((x) => x.cancel());
      pan.querySelector<HTMLElement>('.pan__t span')?.style.removeProperty('transform-origin');
      mappa.style.removeProperty('will-change');
      mappa.style.removeProperty('transform-origin');
      pulisci();
    },
  };
  // A1: la promessa del montaggio (MONTAGGIO_A1 del tempo dopo la partenza vera della camera)
  if (dentro && camA1) camA1.anim = anims[0]!;
  const quando = dentro ? istanteMontaggio(pan, r, K, tx, ty, H) : MONTAGGIO_A1;
  quasiFerma = dentro
    ? anims[0]!.ready.then(() => attendi(D_A1 * quando), () => {}).then(() => {})
    : null;
  return Promise.all(anims.map((x) => x.finished)).then(pulisci, pulisci);
}
let quasiFerma: Promise<void> | null = null;
let camA1: { testo: string; n: DOMRect; K: number; tx: number; ty: number; anim: Animation | null } | null = null;

/** Una cubic-bezier CSS: il progresso a un tempo t (0–1), per sapere dove è la camera senza chiederlo al DOM. */
function bezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const b = (a1: number, a2: number, u: number) => 3 * (1 - u) * (1 - u) * u * a1 + 3 * (1 - u) * u * u * a2 + u * u * u;
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (b(x1, x2, m) < t) lo = m; else hi = m; }
  return b(y1, y2, (lo + hi) / 2);
}
const ZOOM_IN_PUNTI = [0.54, 0.15, 0.15, 1] as const; // = ZOOM_IN
/** A1 (1f): la frazione del tempo della camera a cui cominciare a montare la pagina nuova. A schermo un punto del
 *  pannello va in linea retta da q a K·q + (tx, ty) (camera = translate p·t e scala 1 + p(K − 1)): ogni lato del
 *  pannello lascia scoperta una striscia che si accorcia linearmente con il progresso p della curva. Una striscia è
 *  invisibile quando è più sottile di mezzo pixel; se dall'altra parte c'è un altro pannello, quando è più sottile del
 *  suo margine bianco ingrandito (K × padding: resta solo il suo filetto chiaro di 1 px, come prima). Si cerca il primo t
 *  in cui tutte e quattro lo sono. */
function istanteMontaggio(pan: HTMLElement, r: DOMRect, K: number, tx: number, ty: number, H: number): number {
  const vw = window.innerWidth, vh = window.innerHeight;
  const altri = [...document.querySelectorAll('.mappa [data-zoom]')].filter((x) => x !== pan).map((x) => x.getBoundingClientRect());
  const pad = parseFloat(getComputedStyle(pan).paddingTop) || 8;
  const destra = altri.some((q) => Math.abs(q.left - r.right) < 2 && q.bottom > r.top && q.top < r.bottom);
  const sotto = altri.some((q) => Math.abs(q.top - r.bottom) < 2 && q.right > r.left && q.left < r.right);
  const x = (v: number, p: number) => (1 + p * (K - 1)) * v + p * tx;
  const y = (v: number, p: number) => (1 + p * (K - 1)) * v + p * ty;
  // [striscia a p = 0, striscia a p = 1, tolleranza]
  const lati: [number, number, number][] = [
    [vw - x(r.right, 0), vw - x(r.right, 1), destra ? K * pad : 0.5],
    [vh - y(r.bottom, 0), vh - y(r.bottom, 1), sotto ? K * pad : 0.5],
    [x(r.left, 0), x(r.left, 1), 0.5],
    [y(r.top, 0) - H, y(r.top, 1) - H, 0.5],
  ];
  // il progresso p da cui ogni striscia è sotto la sua tolleranza (lineare in p)
  let pMin = 0;
  for (const [s0, s1, tol] of lati) {
    if (s0 < tol) continue;
    pMin = Math.max(pMin, s1 >= tol ? 1 : (s0 - tol) / (s0 - s1));
  }
  let t = 1;
  for (let u = 0.5; u <= 1; u += 0.0025) if (bezier(...ZOOM_IN_PUNTI, u) >= pMin) { t = u; break; }
  return Math.min(MONTAGGIO_A1, Math.max(MONTAGGIO_MIN, t - COSTO_MONTAGGIO / D_A1));
}
/** A1, nel montaggio: il titolo del pannello dove lo mette la camera nel prossimo fotogramma (di solito la fine della
 *  corsa; se la pagina nuova arriva prima, il punto della coda in cui la camera è, a meno di decimi di pixel). La
 *  camera interpola translate e scale: scala 1 + p(K − 1), spostamento p·(tx, ty). */
function titoloInCorsa(): Titolo | null {
  const c = camA1;
  if (!c) return null;
  const ora = Number(document.timeline.currentTime ?? 0) + 16;
  const inizio = Number(c.anim?.startTime ?? -Infinity);
  const t = Math.min(1, Math.max(0, (ora - inizio) / D_A1));
  const p = t >= 1 ? 1 : bezier(...ZOOM_IN_PUNTI, t);
  const s = 1 + p * (c.K - 1);
  return { testo: c.testo, r: new DOMRect(s * c.n.left + p * c.tx, s * c.n.top + p * c.ty, s * c.n.width, s * c.n.height) };
}

/* ======================================================================= A1: dal titolo del pannello all'h1 */
type Titolo = { testo: string; r: DOMRect };
/** Il rettangolo del testo (non del blocco): stesso carattere, quindi altezza proporzionale alla grandezza vera,
 *  trasformazioni comprese (il titolo del pannello è dentro la camera). */
function rettangoloTesto(el: Element): DOMRect {
  const rg = document.createRange();
  rg.selectNodeContents(el);
  return rg.getBoundingClientRect();
}
/** A1, a pagina montata (prima del suo primo fotogramma): taglio senza dissolvenza. L'h1 parte dal titolo del pannello
 *  (FLIP: stesso posto e stessa grandezza a schermo, poi al suo posto in 0,3 s, solo `transform`); il resto della pagina
 *  compare dal bianco (solo `opacity`). Se il titolo è un altro (riga sotto la tavola: «Altro» → «Proposte di Isa») la
 *  pagina intera compare dal bianco. Le animazioni partono al primo fotogramma, dopo il lavoro di montaggio. */
function titoloAlSuoPosto(da: Titolo | null): Promise<void> | null {
  const main = document.querySelector<HTMLElement>('main');
  if (!main) return null;
  const h1 = main.querySelector<HTMLElement>('h1');
  const stesso = !!(da && h1 && h1.textContent?.trim() === da.testo);
  const sfuma: Element[] = [...document.querySelectorAll('body > footer')];
  if (stesso) {
    // i fratelli di ogni antenato dell'h1 fino a main: tutto tranne la catena del titolo
    for (let n: Element = h1!; n !== main && n.parentElement; n = n.parentElement) {
      for (const f of n.parentElement.children) if (f !== n) sfuma.push(f);
    }
  } else sfuma.push(main);
  // nessuna lettura del layout qui (correzioni di fluidità n7, 1a): prima getClientRects() sui fratelli forzava stile e
  // layout di tutta la pagina nuova nel montaggio; animare l'opacità di un elemento non mostrato non costa e non si vede
  const anims = sfuma.filter((el) => !(el instanceof HTMLElement && el.hidden))
    .map((el) => el.animate({ opacity: [0, 1] }, { duration: D_TITOLO, easing: 'cubic-bezier(0.3, 0, 0.2, 1)', fill: 'backwards' }));
  if (stesso) {
    const n = rettangoloTesto(h1!);
    const b = h1!.getBoundingClientRect();
    const k = n.height > 0 ? da!.r.height / n.height : 1;
    const tx = da!.r.left - b.left - k * (n.left - b.left);
    const ty = da!.r.top - b.top - k * (n.top - b.top);
    h1!.style.transformOrigin = '0 0';
    const a = h1!.animate({ transform: [`translate(${tx}px, ${ty}px) scale(${k})`, ID] },
      { duration: D_TITOLO, easing: CURVA_TITOLO, fill: 'backwards' });
    void a.finished.then(() => h1!.style.removeProperty('transform-origin'), () => h1!.style.removeProperty('transform-origin'));
    anims.push(a);
  }
  return Promise.allSettled(anims.map((x) => x.finished)).then(() => {});
}

/* ======================================================================= A1 verso Opere: solo la parte visibile */
// Correzioni di fluidità n7 (1e). Le card sono quasi tutta la pagina di Opere (50 card con <picture>, 26 originali e 24
// stampe nel pannello nascosto): montarle tutte allungava il montaggio di A1 e la pausa fra la camera e il titolo.
// Con A1 (link della mappa, senza filtri nell'indirizzo) si monta la griglia fino a coprire lo schermo, con le stesse
// card nello stesso posto (il motore dispone «alla più corta» nell'ordine: le prime card stanno dove starebbero con
// tutte); le altre si rimettono a corsa finita, nei momenti liberi, e il motore ridispone (le card montate non si
// muovono). Si rimettono subito al primo gesto (tocco, clic, tasto, rotella): niente conteggi o filtri su metà pagina.
type MotoreOpere = { leggiUrl(q: string): unknown; applica(root: HTMLElement, s: unknown): number };
let rimandate: { griglia: HTMLElement; via: Element[]; stampe: [Element, Element[]][] } | null = null;
const GESTI = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
function rimanda(doc: Document): void {
  rimandate = null;
  const root = doc.querySelector<HTMLElement>('[data-opere]');
  const griglia = root?.querySelector<HTMLElement>('[data-pannello="originali"] [data-griglia]');
  if (!root || !griglia) return;
  const dida = Number(root.dataset.dida ?? 0.35);
  const n = window.matchMedia('(min-width: 1280px)').matches ? 3 : 2;
  // larghezza della colonna per difetto (margini e spazi al massimo): le altezze stimate sono per difetto, quindi le
  // card montate coprono lo schermo con margine
  const col = Math.max(1, (window.innerWidth - 100) / n);
  const serve = window.innerHeight * 1.25;
  const card = [...griglia.querySelectorAll<HTMLElement>('[data-card]')];
  const ordinate = [...card].sort((a, b) => ((a.dataset.stato === 'sold' ? 1 : 0) - (b.dataset.stato === 'sold' ? 1 : 0))
    || Number(a.dataset.ordine ?? 0) - Number(b.dataset.ordine ?? 0));
  const alt = Array.from({ length: n }, () => 0);
  const tieni = new Set<Element>();
  for (const c of ordinate) {
    if (Math.min(...alt) >= serve) break;
    let k = 0;
    for (let i = 1; i < n; i++) if (alt[i]! < alt[k]! - 1e-9) k = i;
    alt[k]! += (Number(c.dataset.h ?? 1) + dida) * col;
    tieni.add(c);
  }
  const via = card.filter((c) => !tieni.has(c));
  via.forEach((c) => c.remove());
  const stampe: [Element, Element[]][] = [...root.querySelectorAll('[data-pannello="stampe"] .mas__col')]
    .map((c) => { const figli = [...c.children]; figli.forEach((f) => f.remove()); return [c, figli]; });
  rimandate = { griglia, via, stampe };
  GESTI.forEach((g) => window.addEventListener(g, rimettiOpere, { capture: true, passive: true }));
}
function lasciaOpere(): void {
  rimandate = null;
  GESTI.forEach((g) => window.removeEventListener(g, rimettiOpere, { capture: true }));
}
function rimettiOpere(): void {
  const r = rimandate;
  lasciaOpere();
  if (!r || !r.griglia.isConnected) return;
  const prima = r.griglia.querySelector('.mas__col');
  if (prima) prima.append(...r.via);
  for (const [c, figli] of r.stampe) c.append(...figli);
  const M = (window as Window & { GalleriaOpere?: MotoreOpere }).GalleriaOpere;
  const root = document.querySelector<HTMLElement>('[data-opere]');
  if (M && root) M.applica(root, M.leggiUrl(location.search));
  document.dispatchEvent(new CustomEvent('galleria:opere-cambiate'));
}

/* ======================================================================= cambio pagina */
let zoom: Zoom | null = null;
let titoloDa: Titolo | null = null; // A1: il titolo del pannello a camera ferma, misurato subito prima del montaggio
let titoloVia: Titolo | null = null; // A2: l'h1 della pagina che si lascia, dove si vede al clic
let corsaTitolo: Promise<void> | null = null;
let vtZoom: ViewTransition | undefined; // A2: la view transition sotto cui si prepara lo strato della mappa
let giro = 0; // ogni cambio pagina ha il suo numero: un'attesa di un cambio superato non fa più niente
let linguaPunto: Punto | null = null;
let tornando = false;
let daA: { from: URL; to: URL } | null = null;

type Preparazione = Event & {
  from: URL; to: URL; navigationType: string; sourceElement?: Element; newDocument: Document;
  loader: () => Promise<void>; signal: AbortSignal;
};

document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as Preparazione;
  corrente?.annulla(); // un altro cambio pagina durante la corsa: la mappa torna com'era
  lasciaOpere(); // Opere arrivata con A1 lasciata prima di rimettere le card: se ne va con la pagina
  salva();
  tornando = ev.navigationType === 'traverse';
  daA = { from: ev.from, to: ev.to };
  iniziaCambio();
  zoom = null;
  titoloDa = null;
  titoloVia = null;
  camA1 = null;
  senzaVT?.();
  giro++;
  if (RM.matches || lingua(ev.from.pathname) !== lingua(ev.to.pathname)) return;
  const verso = pannelloDi(ev.to.pathname);
  const da = pannelloDi(ev.from.pathname);
  let fine: Promise<void> | null = null;
  let panA1: HTMLElement | null = null;
  // A1: clic sulla mappa (pannello o riga sotto la tavola) verso una pagina di un pannello che si vede
  if (eHome(ev.from.pathname) && verso && ev.navigationType !== 'traverse' && ev.sourceElement?.closest?.('.mappa')) {
    const pan = document.querySelector<HTMLElement>(`[data-zoom="${verso}"]`);
    const r = inVista(pan);
    if (pan && r) {
      zoom = { modo: 'dentro', pannello: verso };
      document.dispatchEvent(new CustomEvent('galleria:transizione', { detail: { attiva: true } }));
      void corsa(pan, r, 'dentro');
      // il link del pannello perde il fuoco del clic: toglierlo dal DOM col fuoco addosso forzava stile e layout della
      // home vecchia nel montaggio (correzioni di fluidità n7, 1c)
      (document.activeElement as HTMLElement | null)?.blur?.();
      fine = quasiFerma;
      panA1 = pan;
    }
  }
  // A2: verso la mappa («Indice» su computer) o con Indietro verso la home, da una pagina di un pannello
  if (eHome(ev.to.pathname) && da && (ev.to.hash === '#indice' || ev.navigationType === 'traverse')) zoom = { modo: 'fuori', pannello: da };
  if (!zoom) return;
  html.dataset.zoom = zoom.modo;
  // A2: dove si vede adesso l'h1 (il titolo del pannello partirà da lì); se è fuori dallo schermo, niente
  if (zoom.modo === 'fuori') {
    const h1 = document.querySelector<HTMLElement>('main h1');
    const testo = h1?.textContent?.trim();
    const r = h1 ? rettangoloTesto(h1) : null;
    titoloVia = testo && r && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight ? { testo, r } : null;
  }
  // la pagina nuova: dal testo già scaricato (di solito al passaggio del mouse, o che si scarica adesso). Si legge e se
  // ne preparano fogli di stile e prime immagini appena il testo c'è, senza aspettare la fine della corsa (prima del
  // 22/10 tutto questo partiva a camera ferma e allungava la pausa prima del titolo): la corsa è sul compositore e non
  // ne risente; di solito è già pronto da prima del clic (momenti liberi dopo il passaggio del mouse).
  const orig = ev.loader;
  const preparata = scarica(ev.to, false).then((x) => {
    if (!x || ev.signal.aborted) return null;
    const doc = leggiPagina(x);
    const immagini = x.immagini;
    x.doc = undefined; // il montaggio sposta i nodi: la prossima volta si rilegge il testo
    x.immagini = undefined;
    if (!doc.querySelector('[name="astro-view-transitions-enabled"]')) return { doc: null, stile: null, immagini: null };
    return { doc, stile: stili(doc), immagini };
  });
  ev.loader = async () => {
    const [x] = await Promise.all([preparata, fine]);
    if (ev.signal.aborted) return;
    if (!x) { await orig(); return; }
    if (!x.doc) { ev.preventDefault(); return; }
    ev.newDocument = x.doc;
    if (panA1 && verso === 'opere' && !ev.to.search) rimanda(x.doc);
    await Promise.all([x.stile, Promise.race([x.immagini, attendi(fine ? ATTESA_IMMAGINI : ATTESA_MAPPA)])]);
    // A1: dove sta il titolo del pannello con la camera ferma
    if (panA1 && !ev.signal.aborted) titoloDa = camA1 ? { testo: camA1.testo, r: new DOMRect() } : null;
  };
});

/** A1 senza view transition (lavoro «animazioni fluide» 22/10). Il montaggio di A1 è un taglio (nessuna dissolvenza):
 *  la view transition non mostrava niente ma costava, a camera ferma, l'istantanea della pagina vecchia (un ridisegno e
 *  una copia dello schermo) e il primo disegno della pagina nuova in un'istantanea, con lo schermo bloccato. Senza, la
 *  pagina nuova si monta e il compositore tiene a schermo la camera ferma finché il suo primo fotogramma è pronto.
 *  Il ClientRouter chiama document.startViewTransition subito dopo astro:after-preparation: per quella sola chiamata
 *  il documento ne ha una sua che fa subito il cambio (come il ClientRouter senza view transition), poi torna quella
 *  del browser. */
let senzaVT: (() => void) | null = null;
function unaVoltaSenzaVT() {
  if (!('startViewTransition' in document)) return;
  const togli = () => { senzaVT = null; delete (document as { startViewTransition?: unknown }).startViewTransition; };
  const finta = (cb?: (() => unknown) | { update?: () => unknown }) => {
    togli();
    const fatto = Promise.resolve().then(() => (typeof cb === 'function' ? cb() : cb?.update?.())).then(() => undefined);
    return { updateCallbackDone: fatto, ready: fatto, finished: fatto, skipTransition() {}, types: new Set<string>() };
  };
  Object.defineProperty(document, 'startViewTransition', { value: finta, configurable: true, writable: true });
  senzaVT = togli;
}

document.addEventListener('astro:after-preparation', () => {
  linguaPunto = null;
  if (zoom?.modo === 'dentro') unaVoltaSenzaVT();
  if (!daA) return;
  const { from, to } = daA;
  if (zoom?.modo !== 'dentro') document.dispatchEvent(new CustomEvent('galleria:transizione', { detail: { attiva: true } }));
  // cambio lingua sulla stessa pagina (senza àncora): si resta allo stesso punto
  if (lingua(from.pathname) !== lingua(to.pathname) && from.pathname.slice(3) === to.pathname.slice(3) && !to.hash) linguaPunto = punto();
});

document.addEventListener('astro:before-swap', (e) => {
  const ev = e as Event & { newDocument: Document; viewTransition?: ViewTransition };
  const vt = ev.viewTransition;
  const z = zoom;
  senzaVT?.(); // riserva: la chiamata del ClientRouter c'è già stata
  if (z) ev.newDocument.documentElement.dataset.zoom = z.modo;
  vtZoom = vt;
  corrente = null; // A1: la mappa con la camera se ne va con la pagina vecchia
  // il cambio pagina finisce con la view transition e, in A2, con la corsa della camera (che parte in after-swap):
  // fino ad allora niente ripristino dello scroll né lavoro pesante delle pagine
  const fine = () => {
    void Promise.all([corsaFuori, corsaTitolo]).then(() => {
      corsaFuori = null;
      corsaTitolo = null;
      delete html.dataset.zoom;
      finisciCambio();
      document.dispatchEvent(new CustomEvent('galleria:transizione', { detail: { attiva: false } }));
      if (rimandate) quandoLibero(rimettiOpere);
    });
  };
  if (!vt) { fine(); return; }
  vt.finished.then(fine, fine);
});

document.addEventListener('astro:after-swap', () => {
  // A2: la home è montata e lo scroll è al suo posto, prima della sua prima immagine: la camera parte ravvicinata sul
  // pannello (che copre lo schermo, bianco col titolo; taglio netto dalla pagina vecchia), poi torna a scala 1.
  // Se il pannello non si vede (Indietro verso l'apertura): dissolvenza normale.
  if (zoom?.modo === 'fuori') {
    const pan = document.querySelector<HTMLElement>(`[data-zoom="${zoom.pannello}"]`);
    const r = inVista(pan);
    if (pan && r) corsaFuori = prontiFuori(pan, r);
    else delete html.dataset.zoom;
  }
  // A1: l'h1 parte dal titolo del pannello. Il FLIP si misura nel primo fotogramma, dopo gli script della pagina (il
  // motore inline di Opere ridispone le card a 3 colonne): un solo layout, e nessun fotogramma senza FLIP (correzioni di
  // fluidità n7, 1b; prima si misurava qui, e il layout fatto non valeva più dopo il motore). titoloInCorsa() legge il
  // tempo del documento, quindi la posizione resta quella della camera in quel fotogramma
  if (zoom?.modo === 'dentro') {
    const da = !!titoloDa;
    corsaTitolo = new Promise<void>((ok) => requestAnimationFrame(() => {
      void (titoloAlSuoPosto(da ? titoloInCorsa() : null) ?? Promise.resolve()).then(ok);
    }));
  }
  titoloDa = null;
  // stessa pagina in un'altra lingua: rimessa prima dell'istantanea nuova (nessun salto visibile), ricontrollata dopo
  if (linguaPunto) { vaiA(dove(linguaPunto)); daRimettere = linguaPunto; linguaPunto = null; }
});

/** A2: la camera non parte nel primo fotogramma della home montata (strato nuovo, immagini, script della pagina). La
 *  view transition tiene a schermo l'istantanea della pagina lasciata (la nuova a opacità 0) mentre lo strato della mappa
 *  nasce a scala 1 e la home fa il suo primo lavoro; dopo due fotogrammi la camera parte ravvicinata e, nello stesso
 *  fotogramma, l'istantanea se ne va (le due immagini sono uguali: bianco col titolo). Senza view transition (Safari
 *  < 18) la camera parte subito come prima, altrimenti si vedrebbe la mappa a scala 1 per un attimo. */
function prontiFuori(pan: HTMLElement, r: DOMRect): Promise<void> {
  const mappa = document.querySelector<HTMLElement>('.mappa');
  const vt = vtZoom;
  if (!mappa || !vt) return corsa(pan, r, 'fuori');
  const mio = giro;
  mappa.style.willChange = 'transform';
  return vt.ready.then(() => new Promise<void>((ok) => {
    const tieni = html.animate({ opacity: [0, 0] }, { duration: 1500, pseudoElement: '::view-transition-new(root)' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (mio !== giro) { tieni.cancel(); ok(); return; }
      const c = corsa(pan, r, 'fuori');
      tieni.cancel();
      void c.then(ok);
    }));
  }), () => (mio === giro ? corsa(pan, r, 'fuori') : undefined));
}

document.addEventListener('astro:page-load', () => {
  const home = zoom?.modo === 'dentro' && daA ? daA.from : null;
  qui = chiave();
  if (tornando) { tornando = false; daRimettere = leggiTutti()[qui] ?? null; }
  void rimettiScroll();
  accendiCursore();
  // arrivati con A1: la home è il probabile ritorno (Indietro, «Indice»), se ne scarica il testo nei momenti liberi
  // e si legge, con le immagini della mappa decodificate: A2 parte senza lavoro pesante (correzioni n4, problema A2)
  if (home) void dopoTransizione().then(() => quandoLibero(() => { void scarica(home, true); }));
});

/* ======================================================================= preferenze che cambiano */
FINE.addEventListener('change', () => { if (FINE.matches) accendiCursore(); });

// il modulo può arrivare dopo il primo astro:page-load
if (!qui) { qui = chiave(); accendiCursore(); }
