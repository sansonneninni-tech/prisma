/**
 * Anteprima della stampa nella scheda (audit di ninni del 28/10), parte che gira nel browser.
 *  - La foto della scheda diventa la stampa scelta: cornice (nessuna, alluminio nero, rovere a cassetta, noce),
 *    passe-partout e carta (Photo Rag opaca, Baryta lucida, washi con la trama). Le proporzioni seguono il formato
 *    in centimetri, quindi cambiando formato cambia anche il peso della cornice.
 *  - La figura in scala (FiguraScala con `anteprima`) si ridisegna con le misure finali, cornice compresa.
 *  - Lente: clic (o tocco) sulla foto, una lente rotonda segue il mouse (o il dito) e ingrandisce ×3 carta e cornice;
 *    secondo clic, Esc o uscita dalla foto la chiudono. Da tastiera: Invio la apre al centro, le frecce la spostano.
 * Ascolta `galleria:anteprima` (lo manda scheda-client.ts a ogni scelta e a ogni cambio di scheda).
 */

/** Cornice a vista (f) e passe-partout o aria intorno alla foto (m), in cm per lato. */
const CORNICI: Record<string, { f: number; m: number }> = {
  none: { f: 0, m: 0 },
  alu: { f: 1.5, m: 5 },
  oak: { f: 4.5, m: 1.5 },
  walnut: { f: 3, m: 4 },
};
const ZOOM = 3;
/** Lato della trama della carta in cm (si vede più grande sulle stampe piccole, come dal vero). */
const TRAMA_CM = 9;

interface Dati {
  formati: Record<string, { w: number; h: number; et: string }>;
  carte: Record<string, string>;
  cornici: Record<string, string>;
  ed: null | { w: number; h: number; fw: number; fh: number; carta: string; cornice: string; et: string };
}
export interface Scelta { vista: 'o' | 's'; formato: string; carta: string; cornice: string }

const r2 = (n: number) => Math.round(n * 100) / 100;

function ridisegnaScala(fig: HTMLElement, W: number, H: number, bordo: number) {
  const svg = fig.querySelector<SVGSVGElement>('svg');
  if (!svg || !(W > 0) || !(H > 0)) return;
  const basso = Math.max(25, 150 - H / 2);
  const alto = basso + H;
  const SH = Math.max(alto, 170) + 4;
  const px = W + 32;
  const SW = px + 52;
  const y = SH - alto;
  svg.setAttribute('viewBox', `0 0 ${r2(SW)} ${r2(SH)}`);
  svg.style.setProperty('--scala-r', (SW / SH).toFixed(4));
  const rect = (sel: string, x: number, yy: number, w: number, h: number) => {
    const el = svg.querySelector(sel);
    if (!el) return;
    el.setAttribute('x', String(r2(x))); el.setAttribute('y', String(r2(yy)));
    el.setAttribute('width', String(r2(w))); el.setAttribute('height', String(r2(h)));
  };
  rect('[data-scala-cornice]', 0, y, W, H);
  rect('[data-scala-bordo]', 0, y, W, H);
  const cf = CORNICI[fig.dataset.cornice ?? 'none']?.f ?? 0;
  const f = Math.min(cf, bordo);
  rect('[data-scala-pp]', f, y + f, W - 2 * f, H - 2 * f);
  rect('[data-scala-img]', bordo, y + bordo, W - 2 * bordo, H - 2 * bordo);
  svg.querySelector('[data-scala-persona]')?.setAttribute('transform', `translate(${r2(px)} ${r2(SH - 170)}) scale(1.7)`);
  svg.querySelector('[data-scala-terra]')?.setAttribute('d', `M0 ${r2(SH - 0.5)}H${r2(SW)}`);
}

export function avviaAnteprima(sk: HTMLElement): () => void {
  const box = sk.querySelector<HTMLButtonElement>('[data-anteprima]');
  if (!box) return () => {};
  let dati: Dati;
  try { dati = JSON.parse(box.dataset.dati ?? '') as Dati; } catch { return () => {}; }
  const dida = sk.querySelector<HTMLElement>('[data-anteprima-dida]');
  const scala = sk.querySelector<HTMLElement>('[data-scala]');
  const pulizie: (() => void)[] = [];

  function aggiorna(s: Scelta) {
    let w: number, h: number, f: number, m: number, carta: string, cornice: string, et: string;
    if (s.vista === 'o' && dati.ed) {
      const e = dati.ed;
      ({ w, h, carta, cornice, et } = e);
      const b = Math.max(0, (e.fw - e.w) / 2, (e.fh - e.h) / 2);
      const c = CORNICI[cornice] ?? CORNICI.none!;
      f = Math.min(c.f, b); m = b ? b - f : c.m;
      if (!b) f = c.f;
    } else {
      const fm = dati.formati[s.formato];
      if (!fm) return;
      ({ w, h, et } = fm);
      carta = s.carta; cornice = s.cornice;
      const c = CORNICI[cornice] ?? CORNICI.none!;
      f = c.f; m = c.m;
    }
    const W = w + 2 * (f + m), H = h + 2 * (f + m);
    box.dataset.cornice = cornice;
    box.dataset.carta = carta;
    const fig = box.parentElement ?? box;
    fig.style.setProperty('--ar-box', `${r2(W)}/${r2(H)}`);
    fig.style.setProperty('--cf', `${((f / W) * 100).toFixed(3)}%`);
    fig.style.setProperty('--cm', `${(W - 2 * f > 0 ? (m / (W - 2 * f)) * 100 : 0).toFixed(3)}%`);
    fig.style.setProperty('--tex', `${Math.min(100, (TRAMA_CM / w) * 100).toFixed(2)}%`);
    if (dida) dida.textContent = [et, dati.carte[carta], dati.cornici[cornice]].filter(Boolean).join(' · ');
    if (scala) { scala.dataset.cornice = cornice; ridisegnaScala(scala, W, H, f + m); }
    if (lenteAperta) costruisciLente();
  }
  const onScelta = (e: Event) => aggiorna((e as CustomEvent<Scelta>).detail);
  document.addEventListener('galleria:anteprima', onScelta);
  pulizie.push(() => document.removeEventListener('galleria:anteprima', onScelta));

  /* ---------- lente ---------- */
  const lente = box.querySelector<HTMLElement>('[data-lente]')!;
  let lenteAperta = false;
  let dentro: HTMLElement | null = null;
  let lx = 0.5, ly = 0.5; // posizione nella foto, 0–1
  let tocco = false;

  function costruisciLente() {
    const r = box.getBoundingClientRect();
    const sorgente = box.querySelector<HTMLElement>('.sk__cornice');
    if (!sorgente || !r.width) return;
    const copia = sorgente.cloneNode(true) as HTMLElement;
    // l'immagine grande: sizes alla larghezza ingrandita, così il browser sceglie il file giusto dallo srcset
    const larg = Math.round(r.width * ZOOM);
    copia.querySelectorAll('source, img').forEach((el) => {
      el.setAttribute('sizes', `${larg}px`);
      el.removeAttribute('fetchpriority');
      if (el instanceof HTMLImageElement) el.loading = 'eager';
    });
    const avvolto = document.createElement('span');
    avvolto.className = 'sk__lente-in';
    avvolto.style.width = `${larg}px`;
    avvolto.style.height = `${Math.round(r.height * ZOOM)}px`;
    avvolto.append(copia);
    lente.replaceChildren(avvolto);
    dentro = avvolto;
    sposta();
  }
  function sposta() {
    if (!dentro) return;
    const r = box.getBoundingClientRect();
    const R = lente.offsetWidth / 2;
    const x = lx * r.width, y = ly * r.height;
    // col dito la lente sta sopra il punto toccato, se no il dito la copre
    const dy = tocco ? -R - 24 : 0;
    lente.style.transform = `translate(${x - R}px, ${y - R + dy}px)`;
    dentro.style.transform = `translate(${R - x * ZOOM}px, ${R - y * ZOOM}px)`;
  }
  function punto(e: PointerEvent | MouseEvent) {
    const r = box.getBoundingClientRect();
    lx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    ly = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  }
  function apri() {
    lenteAperta = true;
    lente.hidden = false;
    box.setAttribute('aria-pressed', 'true');
    box.dataset.lenteOn = '';
    costruisciLente();
  }
  function chiudi() {
    lenteAperta = false;
    lente.hidden = true;
    lente.replaceChildren();
    dentro = null;
    box.setAttribute('aria-pressed', 'false');
    delete box.dataset.lenteOn;
  }

  let giu: { x: number; y: number; mosso: boolean } | null = null;
  const onDown = (e: PointerEvent) => {
    tocco = e.pointerType !== 'mouse';
    if (tocco && lenteAperta) {
      giu = { x: e.clientX, y: e.clientY, mosso: false };
      try { box.setPointerCapture(e.pointerId); } catch {}
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!lenteAperta) return;
    if (e.pointerType === 'mouse') { tocco = false; punto(e); sposta(); return; }
    if (!giu) return;
    if (Math.hypot(e.clientX - giu.x, e.clientY - giu.y) > 6) giu.mosso = true;
    punto(e); sposta();
  };
  const onUp = () => { setTimeout(() => { giu = null; }, 0); };
  const onClick = (e: MouseEvent) => {
    if (giu?.mosso) { e.preventDefault(); return; }
    if (lenteAperta) { chiudi(); return; }
    if (e.detail === 0) { lx = 0.5; ly = 0.5; } else punto(e); // tastiera: al centro
    apri();
  };
  const onLeave = (e: PointerEvent) => { if (e.pointerType === 'mouse' && lenteAperta) chiudi(); };
  const onKey = (e: KeyboardEvent) => {
    if (!lenteAperta) return;
    const passo = e.shiftKey ? 0.15 : 0.05;
    const d: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); chiudi(); return; }
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    lx = Math.min(1, Math.max(0, lx + v[0])); ly = Math.min(1, Math.max(0, ly + v[1]));
    sposta();
  };
  const onResize = () => { if (lenteAperta) costruisciLente(); };
  box.addEventListener('pointerdown', onDown);
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
  box.addEventListener('pointerleave', onLeave);
  box.addEventListener('click', onClick);
  box.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize, { passive: true });
  pulizie.push(() => {
    box.removeEventListener('pointerdown', onDown);
    box.removeEventListener('pointermove', onMove);
    box.removeEventListener('pointerup', onUp);
    box.removeEventListener('pointercancel', onUp);
    box.removeEventListener('pointerleave', onLeave);
    box.removeEventListener('click', onClick);
    box.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    chiudi();
  });
  return () => { for (const p of pulizie) p(); };
}
