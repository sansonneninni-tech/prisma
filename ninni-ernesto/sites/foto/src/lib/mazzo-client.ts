/**
 * Il mazzo della home (components/home/Mazzo.astro), sul modello del nastro della versione Luke & Nik.
 * Una sola variabile, il tempo del nastro `p` (secondi): ogni voce i ha un inizio s_i e una durata d_i; la sua corsa
 * u = ((p − s_i) mod L) / d_i va da 0 a 1 (fuori dallo schermo prima e dopo). L = somma dei passi (20 % di ogni durata):
 * il nastro torna su se stesso senza giunture. p avanza da solo piano; rotella e trascinamento lo spostano.
 * Ninni entra sempre da sinistra ed esce a destra, Ernesto il contrario: le due metà del mazzo si incrociano.
 */
import { navigate } from 'astro:transitions/client';

const EASE = 'cubic-bezier(0.5, 0, 0.5, 1)';
const SCALA = { s: 0.48, m: 0.64, l: 0.8 } as const;
const AUTO = 0.22; // secondi di nastro per secondo vero

/** numeri pseudo-casuali con seme: uguali a ogni visita */
function semi(seed: number) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

interface V { li: HTMLElement; a: HTMLAnchorElement; ar: number; px: number; k: number; dir: number; R: number; s: number; d: number; w: number; h: number }

let ferma: (() => void) | null = null;

export function avviaMazzo() {
  const palco = document.querySelector<HTMLElement>('[data-mazzo]');
  if (!palco || palco.dataset.pronto) return;
  ferma?.();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // resta la griglia
  palco.dataset.pronto = '1';
  palco.classList.remove('mz--statico');
  document.documentElement.classList.add('mz-blocca');

  const rnd = semi(311);
  const voci: V[] = [];
  let s = 0;
  for (const li of palco.querySelectorAll<HTMLElement>('.mz-v')) {
    const a = li.querySelector<HTMLAnchorElement>('a')!;
    const k = SCALA[(li.dataset.m as keyof typeof SCALA) ?? 'm'] ?? 0.64;
    const d = 3 + rnd(); // 3–4 s
    const R = (rnd() * 2 - 1) * (10 + 34 * (1 - k)); // vh, più ampio per le piccole
    // x = dir · (1 − 2u) · W: con dir −1 parte da sinistra (Ninni), con +1 da destra (Ernesto)
    const dir = li.dataset.chi === 'ernesto' ? 1 : -1;
    voci.push({ li, a, ar: Number(li.dataset.ar) || 1, px: Number(li.dataset.px) || 2000, k, dir, R, s, d, w: 0, h: 0 });
    s += 0.2 * d;
  }
  const L = s;
  let W = innerWidth, H = innerHeight;
  function misura() {
    W = innerWidth; H = innerHeight;
    for (const v of voci) {
      const fitW = Math.min(W, H * v.ar);
      // mai più grande del file (le foto piccole di Ernesto restano nitide)
      v.w = Math.min(fitW * v.k, v.px * 0.8); v.h = v.w / v.ar;
      v.li.style.width = `${v.w}px`; v.li.style.height = `${v.h}px`;
    }
  }
  misura();

  const dida = document.querySelector<HTMLElement>('[data-dida]');
  const didaT = document.querySelector<HTMLElement>('[data-dida-t]');
  const didaR = document.querySelector<HTMLElement>('[data-dida-r]');
  const guida = didaT?.textContent ?? '';

  // p segue pT con un po' di morbidezza; il nastro va avanti da solo finché nessuno lo tocca
  let p = 0.5, pT = 0.5, auto = true, fermo = false, raf = 0, t0 = performance.now();
  const passoPx = () => 3.5 / (2 * W); // secondi di nastro per un pixel di corsa orizzontale

  function disegna(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    // col menu «What?» aperto il mazzo si ferma, così la tendina si legge
    if (auto && !fermo && !document.hidden && !document.documentElement.hasAttribute('data-what-aperto')) pT += AUTO * dt;
    p += (pT - p) * Math.min(1, dt * 9);
    for (const v of voci) {
      let u = (((p - v.s) % L) + L) % L / v.d;
      if (u > 1) u = 1.0001;
      const x = v.dir * (1 - 2 * u) * W;
      const y = (v.R - 2 * v.R * u) * H / 100;
      v.li.style.transform = `translate3d(${(W - v.w) / 2 + x}px, ${(H - v.h) / 2 + y}px, 0)`;
      v.li.style.zIndex = String(1000 - Math.floor(Math.min(u, 1) * 999));
      v.li.classList.toggle('mz-v--fuori', u > 1);
    }
    raf = requestAnimationFrame(disegna);
  }
  raf = requestAnimationFrame(disegna);

  // rotella e trackpad (anche sopra il nome)
  const ruota = (e: WheelEvent) => {
    if (fermo) return;
    e.preventDefault();
    const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 32 : 1);
    pT += d * passoPx() * 1.2;
  };
  palco.addEventListener('wheel', ruota, { passive: false });
  const nome = document.querySelector<HTMLElement>('[data-mazzo-nome]');
  nome?.addEventListener('wheel', ruota, { passive: false });

  // trascinamento (mouse e dito)
  let giu = false, mosso = false, x0 = 0, y0 = 0, pT0 = 0, id = -1;
  palco.addEventListener('pointerdown', (e) => {
    if (fermo || (e.pointerType === 'mouse' && e.button !== 0)) return;
    giu = true; mosso = false; x0 = e.clientX; y0 = e.clientY; pT0 = pT; id = e.pointerId;
  });
  const muovi = (e: PointerEvent) => {
    if (!giu || e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!mosso && Math.hypot(dx, dy) > 6) { mosso = true; palco.classList.add('mz--trascina'); try { palco.setPointerCapture(id); } catch {} }
    if (mosso) pT = pT0 - (Math.abs(dx) >= Math.abs(dy) ? dx : dy) * passoPx() * 1.5;
  };
  const su = () => { if (!giu) return; giu = false; palco.classList.remove('mz--trascina'); };
  palco.addEventListener('pointermove', muovi);
  palco.addEventListener('pointerup', su);
  palco.addEventListener('pointercancel', su);
  palco.addEventListener('dragstart', (e) => e.preventDefault());

  // didascalia: la foto sotto il puntatore (o col fuoco)
  function mostra(a: HTMLAnchorElement | null) {
    if (!didaT || !didaR) return;
    dida?.classList.toggle('mz-dida--on', !!a);
    didaT.textContent = a ? a.dataset.titolo ?? '' : guida;
    didaR.textContent = a ? a.dataset.riga ?? '' : '';
  }
  palco.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') mostra((e.target as Element).closest<HTMLAnchorElement>('.mz-v__a')); });
  palco.addEventListener('pointerleave', () => mostra(null));
  // tastiera: la foto col fuoco viene al centro e il nastro si ferma
  palco.addEventListener('focusin', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.mz-v__a');
    const v = voci.find((x) => x.a === a);
    if (!v) return;
    auto = false;
    const c = v.s + v.d / 2;
    pT = c + Math.round((p - c) / L) * L;
    mostra(a);
  });
  palco.addEventListener('focusout', () => { auto = true; mostra(null); });

  // clic: la foto si apre a tutto schermo, le altre volano via dal loro lato, poi la scheda
  palco.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.mz-v__a');
    if (!a) return;
    e.preventDefault();
    if (mosso) { mosso = false; return; }
    if (fermo) return;
    const v = voci.find((x) => x.a === a);
    if (!v) { void navigate(a.href); return; }
    fermo = true;
    cancelAnimationFrame(raf);
    palco.classList.add('mz--apre');
    document.documentElement.classList.add('mz-apre');
    mostra(a);
    const fw = Math.min(W, H * v.ar), fh = fw / v.ar;
    v.li.style.zIndex = '2000';
    v.li.style.transformOrigin = '0 0';
    const anim = v.li.animate(
      [{ transform: v.li.style.transform }, { transform: `translate3d(${(W - fw) / 2}px, ${(H - fh) / 2}px, 0) scale(${fw / v.w})` }],
      { duration: 750, easing: EASE, fill: 'forwards' },
    );
    for (const o of voci) {
      if (o === v || o.li.classList.contains('mz-v--fuori')) continue;
      const r = o.li.getBoundingClientRect();
      o.li.animate([{ transform: o.li.style.transform }, { transform: `translate3d(${-o.dir * 1.5 * W + (W - o.w) / 2}px, ${r.top}px, 0)` }], { duration: 750, easing: EASE, fill: 'forwards' });
    }
    anim.finished.then(() => navigate(a.href), () => navigate(a.href));
  });

  const ridim = () => misura();
  addEventListener('resize', ridim);
  ferma = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', ridim);
    document.documentElement.classList.remove('mz-blocca', 'mz-apre');
    ferma = null;
  };
  document.addEventListener('astro:before-swap', () => ferma?.(), { once: true });
}
