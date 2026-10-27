/**
 * Il nastro della home (components/home/HomeLN.astro), come la home di Luke & Nik.
 * Una sola variabile, il tempo del nastro `p` (secondi): ogni voce i ha un inizio s_i e una durata d_i; la sua corsa
 * u = ((p − s_i) mod L) / d_i va da 0 a 1 (fuori dallo schermo prima e dopo). L = somma dei passi (20 % di ogni durata):
 * il nastro torna su se stesso senza giunture. p avanza da solo piano; rotella e trascinamento lo spostano.
 */
import { navigate } from 'astro:transitions/client';

const EASE = 'cubic-bezier(0.5, 0, 0.5, 1)';
const SCALA = { s: 0.5, m: 0.75, l: 0.9 } as const;
const AUTO = 0.22; // secondi di nastro per secondo vero

/** numeri pseudo-casuali con seme: uguali a ogni visita */
function semi(seed: number) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

interface V { li: HTMLElement; a: HTMLAnchorElement; ar: number; k: number; dir: number; R: number; s: number; d: number; w: number; h: number }

let ferma: (() => void) | null = null;

export function avviaPalco() {
  const palco = document.querySelector<HTMLElement>('[data-palco]');
  if (!palco || palco.dataset.pronto) return;
  ferma?.();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // resta la griglia
  palco.dataset.pronto = '1';
  palco.classList.remove('ln-palco--statico');
  document.documentElement.classList.add('ln-blocca');

  const rnd = semi(158);
  const voci: V[] = [];
  let s = 0;
  for (const li of palco.querySelectorAll<HTMLElement>('.ln-v')) {
    const a = li.querySelector<HTMLAnchorElement>('a')!;
    const k = SCALA[(li.dataset.m as keyof typeof SCALA) ?? 'm'] ?? 0.75;
    const d = 3 + rnd(); // 3–4 s
    const R = (rnd() * 2 - 1) * (12 + 40 * (1 - k)); // vh, più ampio per le piccole
    voci.push({ li, a, ar: Number(li.dataset.ar) || 1, k, dir: voci.length % 2 ? -1 : 1, R, s, d, w: 0, h: 0 });
    s += 0.2 * d;
  }
  const L = s;
  let W = innerWidth, H = innerHeight;
  function misura() {
    W = innerWidth; H = innerHeight;
    for (const v of voci) {
      const fitW = Math.min(W, H * v.ar);
      v.w = fitW * v.k; v.h = v.w / v.ar;
      v.li.style.width = `${v.w}px`; v.li.style.height = `${v.h}px`;
    }
  }
  misura();

  const dida = document.querySelector<HTMLElement>('[data-dida]');
  const didaT = document.querySelector<HTMLElement>('[data-dida-t]');
  const didaR = document.querySelector<HTMLElement>('[data-dida-r]');
  const didaN = document.querySelector<HTMLElement>('[data-dida-n]');
  const guida = didaT?.textContent ?? '';

  // p segue pT con un po' di morbidezza; il nastro va avanti da solo finché nessuno lo tocca
  let p = 0.5, pT = 0.5, auto = true, fermo = false, raf = 0, t0 = performance.now();
  const passoPx = () => 3.5 / (2 * W); // secondi di nastro per un pixel di corsa orizzontale

  function disegna(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (auto && !fermo && !document.hidden) pT += AUTO * dt;
    p += (pT - p) * Math.min(1, dt * 9);
    for (const v of voci) {
      let u = (((p - v.s) % L) + L) % L / v.d;
      if (u > 1) u = 1.0001;
      const x = v.dir * (1 - 2 * u) * W;
      const y = (v.R - 2 * v.R * u) * H / 100;
      v.li.style.transform = `translate3d(${(W - v.w) / 2 + x}px, ${(H - v.h) / 2 + y}px, 0)`;
      v.li.style.zIndex = String(1000 - Math.floor(Math.min(u, 1) * 999));
      v.li.classList.toggle('ln-v--fuori', u > 1);
    }
    raf = requestAnimationFrame(disegna);
  }
  raf = requestAnimationFrame(disegna);

  // rotella e trackpad
  const ruota = (e: WheelEvent) => {
    if (fermo) return;
    e.preventDefault();
    const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 32 : 1);
    pT += d * passoPx() * 1.2;
  };
  palco.addEventListener('wheel', ruota, { passive: false });

  // trascinamento (mouse e dito): il nastro si sposta tre volte la rotella
  let giu = false, mosso = false, x0 = 0, y0 = 0, pT0 = 0, id = -1;
  palco.addEventListener('pointerdown', (e) => {
    if (fermo || (e.pointerType === 'mouse' && e.button !== 0)) return;
    giu = true; mosso = false; x0 = e.clientX; y0 = e.clientY; pT0 = pT; id = e.pointerId;
  });
  const muovi = (e: PointerEvent) => {
    if (!giu || e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!mosso && Math.hypot(dx, dy) > 6) { mosso = true; palco.classList.add('ln-palco--trascina'); try { palco.setPointerCapture(id); } catch {} }
    if (mosso) pT = pT0 - (Math.abs(dx) >= Math.abs(dy) ? dx : dy) * passoPx() * 1.5;
  };
  const su = () => { if (!giu) return; giu = false; palco.classList.remove('ln-palco--trascina'); };
  palco.addEventListener('pointermove', muovi);
  palco.addEventListener('pointerup', su);
  palco.addEventListener('pointercancel', su);
  palco.addEventListener('dragstart', (e) => e.preventDefault());

  // didascalia: la foto sotto il puntatore (o col fuoco)
  function mostra(a: HTMLAnchorElement | null) {
    if (!didaT || !didaR || !didaN) return;
    dida?.classList.toggle('ln-dida__sx--on', !!a);
    didaT.textContent = a ? a.dataset.titolo ?? '' : guida;
    didaR.textContent = a ? a.dataset.riga ?? '' : '';
    didaN.textContent = a ? a.dataset.num ?? '' : '';
  }
  palco.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') mostra((e.target as Element).closest<HTMLAnchorElement>('.ln-v__a')); });
  palco.addEventListener('pointerleave', () => mostra(null));
  // tastiera: la foto col fuoco viene al centro e il nastro si ferma
  palco.addEventListener('focusin', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.ln-v__a');
    const v = voci.find((x) => x.a === a);
    if (!v) return;
    auto = false;
    const c = v.s + v.d / 2;
    pT = c + Math.round((p - c) / L) * L;
    mostra(a);
  });
  palco.addEventListener('focusout', () => { auto = true; });

  // clic: la foto si apre a tutto schermo, le altre volano via, poi la scheda
  palco.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.ln-v__a');
    if (!a) return;
    e.preventDefault();
    if (mosso) { mosso = false; return; }
    if (fermo) return;
    const v = voci.find((x) => x.a === a);
    if (!v) { void navigate(a.href); return; }
    fermo = true;
    cancelAnimationFrame(raf);
    palco.classList.add('ln-palco--apre');
    mostra(a);
    const fw = Math.min(W, H * v.ar), fh = fw / v.ar;
    const da = v.li.style.transform;
    v.li.style.zIndex = '2000';
    const sc = fw / v.w;
    v.li.style.transformOrigin = '0 0';
    const anim = v.li.animate(
      [{ transform: da }, { transform: `translate3d(${(W - fw) / 2}px, ${(H - fh) / 2}px, 0) scale(${sc})` }],
      { duration: 750, easing: EASE, fill: 'forwards' },
    );
    for (const o of voci) {
      if (o === v || o.li.classList.contains('ln-v--fuori')) continue;
      const r = o.li.getBoundingClientRect();
      const lato = r.left + r.width / 2 < W / 2 ? -1 : 1;
      o.li.animate([{ transform: o.li.style.transform }, { transform: `translate3d(${lato * 1.5 * W + (W - o.w) / 2}px, ${r.top}px, 0)` }], { duration: 750, easing: EASE, fill: 'forwards' });
    }
    anim.finished.then(() => navigate(a.href), () => navigate(a.href));
  });

  const ridim = () => misura();
  addEventListener('resize', ridim);
  ferma = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', ridim);
    document.documentElement.classList.remove('ln-blocca');
    ferma = null;
  };
  document.addEventListener('astro:before-swap', () => ferma?.(), { once: true });
}
