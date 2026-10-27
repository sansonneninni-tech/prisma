/**
 * Scheda opera (pezzo 4) — parte che gira nel browser. Modulo caricato una volta: si avvia su `astro:page-load` e si
 * spegne su `astro:before-swap` (ClientRouter).
 *  - C14 schede Originale / Stampa: frecce, Home, End; `?v=stampa` nell'URL con replaceState(history.state) e
 *    l'evento `galleria:url-cambiato` (le lingue lo seguono). Lo stato iniziale lo mette lo script inline della scheda.
 *  - Carrello: addToCart del core (originale: «Nel carrello» al posto del bottone; stampa: formato + supporto,
 *    prezzo, al massimo MAX_PRINT_QUANTITY uguali, «Nel carrello: n»).
 *  - Barra fissa in basso (sotto 1024): prezzo + azione quando il bottone vero non si vede; imposta
 *    `--ingombro-basso` su <html> (regola di Casa).
 *  - C15 Lente con A13 (view transition dal riquadro), zoom ×2,5, ← →, voce #lente nella storia.
 *  - A3: «Precedente / Successiva» con la pagina che esce di lato (view transition del ClientRouter, CSS in scheda.css).
 */
import { $cart, addToCart, lineKey } from '@ne/core/cart';
import type { CartProduct } from '@ne/core';
import { lockScroll, unlockScroll } from './scroll-lock';
import { storiaDialog } from './dialog-storia';

const movimento = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const leggiJson = <T>(el: HTMLElement, k: string): T => { try { return JSON.parse(el.dataset[k] ?? '{}') as T; } catch { return {} as T; } };

/* ======================================================================= acquisto */
function avviaAcquisto(sk: HTMLElement): () => void {
  const pulizie: (() => void)[] = [];
  const acq = sk.querySelector<HTMLElement>('[data-acq]');
  if (!acq) return () => {};
  const iniziale = sk.dataset.iniziale === 's' ? 's' : 'o';
  const tabs = [...acq.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const pannelli = [...acq.querySelectorAll<HTMLElement>('[data-pan]')];
  const tempi = [...acq.querySelectorAll<HTMLElement>('[data-tempi]')];
  const barra = sk.querySelector<HTMLElement>('[data-barra]');
  const barraPrezzo = barra?.querySelector<HTMLElement>('[data-barra-prezzo]');
  const barraBtn = barra?.querySelector<HTMLButtonElement>('[data-barra-btn]');
  const testoAggiungi = barraBtn?.textContent ?? '';

  const corrente = (): 'o' | 's' => (pannelli.find((p) => !p.hidden)?.dataset.pan === 's' ? 's' : 'o');

  /* ---------- schede ---------- */
  const scegli = (v: 'o' | 's', { fuoco = false, url = true } = {}) => {
    for (const b of tabs) {
      const s = b.dataset.v === v;
      b.setAttribute('aria-selected', String(s));
      b.tabIndex = s ? 0 : -1;
      if (s && fuoco) b.focus();
    }
    for (const p of pannelli) p.hidden = p.dataset.pan !== v;
    for (const p of tempi) p.hidden = p.dataset.tempi !== v;
    sk.dataset.vista = v; // i dati dicono di chi sono le misure (audit finale 1, telefono #14)
    annunciaModello();
    if (url) {
      const u = new URL(location.href);
      if (v === iniziale) u.searchParams.delete('v');
      else u.searchParams.set('v', v === 's' ? 'stampa' : 'originale');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      document.dispatchEvent(new CustomEvent('galleria:url-cambiato'));
    }
    aggiornaBarra();
  };
  for (const b of tabs) {
    const onClick = () => scegli(b.dataset.v === 's' ? 's' : 'o');
    b.addEventListener('click', onClick);
    pulizie.push(() => b.removeEventListener('click', onClick));
  }
  const lista = acq.querySelector<HTMLElement>('[data-acq-tabs]');
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    const n = tabs.length;
    const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    scegli(tabs[j]!.dataset.v === 's' ? 's' : 'o', { fuoco: true });
  };
  lista?.addEventListener('keydown', onKey);
  pulizie.push(() => lista?.removeEventListener('keydown', onKey));

  /* ---------- originale ---------- */
  const fo = acq.querySelector<HTMLFormElement>('[data-acq-form="o"]');
  const originale = fo ? leggiJson<{ original?: CartProduct }>(fo, 'products').original : undefined;
  const nelCarrello = (p: CartProduct) => $cart.get().find((l) => l.key === lineKey(p))?.quantity ?? 0;
  const disegnaO = () => {
    if (!fo || !originale) return;
    const dentro = nelCarrello(originale) > 0;
    fo.querySelector<HTMLElement>('[data-acq-btn]')!.hidden = dentro;
    fo.querySelector<HTMLElement>('[data-acq-in]')!.hidden = !dentro;
  };
  if (fo && originale) {
    const onSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      if (nelCarrello(originale) > 0) return;
      addToCart(originale);
      // il fuoco resta su un comando visibile: il bottone sparisce, al suo posto c'è «Nel carrello»
      if (fo.contains(document.activeElement) || document.activeElement === barraBtn) {
        const dentro = fo.querySelector<HTMLElement>('[data-acq-in]');
        requestAnimationFrame(() => { if (document.activeElement === document.body || !document.activeElement?.checkVisibility?.()) dentro?.focus(); });
      }
    };
    fo.addEventListener('submit', onSubmit);
    pulizie.push(() => fo.removeEventListener('submit', onSubmit));
  }

  /* ---------- stampa ---------- */
  const fs = acq.querySelector<HTMLFormElement>('[data-acq-form="s"]');
  const prodotti = fs ? leggiJson<Record<string, CartProduct>>(fs, 'products') : {};
  const prezzi = fs ? leggiJson<Record<string, string>>(fs, 'prices') : {};
  const cents = fs ? leggiJson<Record<string, number>>(fs, 'cents') : {};
  const max = Number(fs?.dataset.max ?? 5);
  const scelto = (n: string) => fs?.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`)?.value ?? '';
  const chiaveScelta = () => `${scelto('formato')}:${scelto('supporto')}:${scelto('cornice') || 'none'}`;
  // differenza di prezzo accanto a carta e cornice («+ 45 €»), rispetto alla scelta più semplice
  const lingua = document.documentElement.dataset.lang === 'en' ? 'en-US' : 'it-IT';
  const fmt = new Intl.NumberFormat(lingua, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const piu = (c: number) => (fs?.dataset.tPiu ?? '+ {prezzo}').replace('{prezzo}', fmt.format(c / 100));
  const sincronizza = () => {
    if (!fs) return;
    const f = scelto('formato');
    const supporti = [...fs.querySelectorAll<HTMLInputElement>('input[name="supporto"]')];
    for (const s of supporti) s.disabled = !prodotti[`${f}:${s.value}:none`];
    if (supporti.find((s) => s.checked)?.disabled) {
      const primo = supporti.find((s) => !s.disabled);
      if (primo) primo.checked = true;
    }
    const s = scelto('supporto'), c = scelto('cornice') || 'none';
    const base = cents[`${f}:rag:${c}`];
    for (const el of fs.querySelectorAll<HTMLElement>('[data-delta-carta]')) {
      const v = cents[`${f}:${el.dataset.deltaCarta}:${c}`];
      el.textContent = v === undefined ? '' : v === base ? '' : piu(v - base!);
    }
    const senza = cents[`${f}:${s}:none`];
    for (const el of fs.querySelectorAll<HTMLElement>('[data-delta-cornice]')) {
      const v = cents[`${f}:${s}:${el.dataset.deltaCornice}`];
      el.textContent = v === undefined || v === senza ? '' : piu(v - senza!);
    }
    const out = fs.querySelector<HTMLElement>('[data-acq-prezzo]');
    if (out) out.textContent = prezzi[chiaveScelta()] ?? '';
    annunciaModello();
  };
  const disegnaS = () => {
    if (!fs) return;
    const p = prodotti[chiaveScelta()];
    const n = p ? nelCarrello(p) : 0;
    const btn = fs.querySelector<HTMLButtonElement>('[data-acq-btn]')!;
    const nota = fs.querySelector<HTMLElement>('[data-acq-nota]')!;
    const testo = nota.querySelector<HTMLElement>('[data-acq-nota-t]')!;
    btn.disabled = !p || n >= max;
    nota.hidden = n === 0;
    testo.textContent = n >= max ? (fs.dataset.tMax ?? '') : (fs.dataset.tN ?? '').replace('{n}', String(n));
  };
  if (fs) {
    const onChange = () => { sincronizza(); disegnaS(); aggiornaBarra(); };
    const onSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      const p = prodotti[chiaveScelta()];
      if (p) addToCart(p);
    };
    fs.addEventListener('change', onChange);
    fs.addEventListener('submit', onSubmit);
    pulizie.push(() => { fs.removeEventListener('change', onChange); fs.removeEventListener('submit', onSubmit); });
    sincronizza();
  }

  /* ---------- modello AR della scelta (edizione o formato di stampa) ---------- */
  function annunciaModello() {
    const chiave = corrente() === 'o' ? 'ed' : scelto('formato');
    document.documentElement.dataset.modelloAr = chiave;
    document.dispatchEvent(new CustomEvent('galleria:modello-ar', { detail: { chiave } }));
  }

  /* ---------- barra fissa in basso ---------- */
  const visibili = new Set<Element>();
  let io: IntersectionObserver | null = null;
  const mqBarra = window.matchMedia('(max-width: 1023.98px)');
  const box = sk.querySelector<HTMLElement>('.sk__box');
  function aggiornaBarra() {
    if (!barra || !barraBtn || !barraPrezzo) return;
    const v = corrente();
    const form = v === 's' ? fs : fo;
    const vendutaO = v === 'o' && !originale;
    const attiva = mqBarra.matches && !!form && !vendutaO;
    barra.hidden = !attiva;
    if (!attiva) { document.documentElement.style.setProperty('--ingombro-basso', '0px'); barra.removeAttribute('data-su'); return; }
    barraPrezzo.textContent = form!.querySelector('[data-acq-prezzo]')?.textContent ?? '';
    if (v === 'o' && originale && nelCarrello(originale) > 0) {
      barraBtn.textContent = fo!.querySelector('[data-acq-in]')?.textContent ?? '';
      barraBtn.classList.add('btn--linea');
      barraBtn.disabled = false;
    } else {
      barraBtn.textContent = testoAggiungi;
      barraBtn.classList.remove('btn--linea');
      barraBtn.disabled = v === 's' ? !!fs?.querySelector<HTMLButtonElement>('[data-acq-btn]')?.disabled : false;
    }
    // si vede quando nessun comando principale della scheda attiva è sullo schermo
    const comandi = [...form!.querySelectorAll<HTMLElement>('[data-acq-btn], [data-acq-in]')].filter((el) => !el.hidden);
    // …e mai sopra l'opera: finché il fondo dell'opera è nella fascia della barra la barra resta giù (320×568)
    const fondo = box?.getBoundingClientRect();
    const sopraOpera = !!fondo && fondo.bottom > window.innerHeight - barra.offsetHeight && fondo.top < window.innerHeight;
    // …e mai mentre il prezzo della scheda è (anche solo in parte) sullo schermo: lo taglierebbe e lo ripeterebbe
    // (audit finale 1, telefono #2: 393×852, «5.000 €» mezzo coperto dalla barra)
    const pr = form!.querySelector<HTMLElement>('[data-acq-prezzo]')?.getBoundingClientRect();
    const hd = document.querySelector<HTMLElement>('[data-hd]')?.getBoundingClientRect().bottom ?? 0;
    const prezzoInVista = !!pr && pr.height > 0 && pr.bottom > hd && pr.top < window.innerHeight;
    // …e mai prima di arrivare al blocco d'acquisto: sale solo dopo che è passato sopra (audit finale 2, telefono #2:
    // la venduta che apre su Stampa ha il blocco sotto la piega e la barra copriva la riga sopra)
    const sotto = comandi.some((el) => el.getBoundingClientRect().top > window.innerHeight - 72);
    const su = !comandi.some((el) => visibili.has(el)) && !sopraOpera && !prezzoInVista && !sotto;
    barra.toggleAttribute('data-su', su);
    barra.inert = !su;
    document.documentElement.style.setProperty('--ingombro-basso', su ? `${barra.offsetHeight}px` : '0px');
  }
  if (barra && barraBtn) {
    io = new IntersectionObserver((voci) => {
      for (const v of voci) { if (v.isIntersecting) visibili.add(v.target); else visibili.delete(v.target); }
      aggiornaBarra();
    }, { rootMargin: '0px 0px -72px 0px' });
    for (const el of acq.querySelectorAll('[data-acq-btn], [data-acq-in]')) io.observe(el);
    const onBarra = () => {
      const v = corrente();
      if (v === 'o' && originale && nelCarrello(originale) > 0) { fo?.querySelector<HTMLAnchorElement>('[data-acq-in]')?.click(); return; }
      (v === 's' ? fs : fo)?.requestSubmit();
    };
    barraBtn.addEventListener('click', onBarra);
    let rafBarra = 0;
    const onScroll = () => { if (!rafBarra) rafBarra = requestAnimationFrame(() => { rafBarra = 0; aggiornaBarra(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    pulizie.push(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(rafBarra); });
    const onMq = () => aggiornaBarra();
    mqBarra.addEventListener('change', onMq);
    pulizie.push(() => { barraBtn.removeEventListener('click', onBarra); mqBarra.removeEventListener('change', onMq); io?.disconnect(); });
  }

  const disegna = () => { disegnaO(); disegnaS(); aggiornaBarra(); };
  const stacca = $cart.subscribe(disegna);
  pulizie.push(stacca);
  pulizie.push(() => document.documentElement.style.setProperty('--ingombro-basso', '0px'));
  return () => { for (const p of pulizie) p(); };
}

/* ======================================================================= lente (C15, A13) */
const ZOOM = 2.5;
function avviaLente(): () => void {
  const dlg = document.querySelector<HTMLDialogElement>('dialog[data-lente]');
  if (!dlg) return () => {};
  const pulizie: (() => void)[] = [];
  const figure = [...dlg.querySelectorAll<HTMLElement>('[data-lente-f]')];
  const contatore = dlg.querySelector<HTMLElement>('[data-lente-n]');
  const zoomBtn = dlg.querySelector<HTMLButtonElement>('[data-lente-zoom-btn]');
  let i = 0;
  let ritorno: HTMLElement | null = null;
  let anim: Animation | null = null;
  // zoom: scala e spostamento del particolare corrente (in px, centro = 0)
  let z = 1, tx = 0, ty = 0;

  const zona = () => figure[i]?.querySelector<HTMLElement>('[data-lente-zoom]') ?? null;
  const limita = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const w = r.width / z, h = r.height / z; // misure senza zoom
    const mx = (w * (z - 1)) / 2, my = (h * (z - 1)) / 2;
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  };
  const applica = (liscio = false) => {
    const el = zona();
    if (!el) return;
    if (z > 1) limita(el);
    el.style.transition = liscio && movimento() ? 'transform 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none';
    el.style.transform = z > 1 ? `translate(${tx}px, ${ty}px) scale(${z})` : '';
    dlg.toggleAttribute('data-zoom', z > 1);
    if (zoomBtn) {
      zoomBtn.setAttribute('aria-pressed', String(z > 1));
      zoomBtn.textContent = (z > 1 ? dlg.dataset.tRiduci : dlg.dataset.tZoom) ?? '';
    }
  };
  /** zoom nel punto (x, y) dello schermo, o al centro */
  const zoomA = (x?: number, y?: number) => {
    const el = zona();
    if (!el) return;
    if (z > 1) { z = 1; tx = 0; ty = 0; applica(true); return; }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    z = ZOOM;
    tx = x === undefined ? 0 : -(x - cx) * (ZOOM - 1);
    ty = y === undefined ? 0 : -(y - cy) * (ZOOM - 1);
    applica(true);
  };
  const mostra = (n: number) => {
    i = (n + figure.length) % figure.length;
    z = 1; tx = 0; ty = 0;
    figure.forEach((f, k) => { f.hidden = k !== i; });
    for (const f of figure) { const el = f.querySelector<HTMLElement>('[data-lente-zoom]'); if (el) { el.style.transform = ''; el.style.transition = 'none'; } }
    dlg.removeAttribute('data-zoom');
    if (zoomBtn) { zoomBtn.setAttribute('aria-pressed', 'false'); zoomBtn.textContent = dlg.dataset.tZoom ?? ''; }
    if (contatore) contatore.textContent = figure.length > 1 ? (figure[i]!.dataset.tN ?? '') : '';
    // le foto grandi si caricano adesso (e la successiva subito dopo)
    for (const k of [i, (i + 1) % figure.length]) figure[k]?.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; });
  };

  const imgDi = (k: number) => figure[k]?.querySelector<HTMLElement>('picture') ?? null;
  let aprendo = false;
  const apri = async (n: number, da?: HTMLElement | null) => {
    if (dlg.open || aprendo) return;
    ritorno = da ?? null;
    const miniatura = da?.querySelector<HTMLElement>('picture') ?? null;
    const fai = () => {
      mostra(n);
      dlg.showModal();
      lockScroll();
      dlg.querySelector<HTMLElement>('[data-lente-chiudi]')?.focus({ preventScroll: true });
    };
    anim?.cancel();
    const vt = (document as Document & { startViewTransition?: (f: () => void) => { finished: Promise<void> } }).startViewTransition;
    if (movimento() && vt && miniatura) {
      // A13: il riquadro vola a schermo intero. La foto grande si decodifica prima (al massimo 200 ms; di solito è già
      // pronta, la scalda il passaggio del mouse): l'istantanea d'arrivo è la foto vera e non cambia durante il volo
      // (lavoro «animazioni fluide» 22/10; prima arrivava a volo iniziato e si disegnava a metà corsa)
      const grande = figure[((n % figure.length) + figure.length) % figure.length]?.querySelector('img');
      if (grande && !grande.complete) {
        aprendo = true;
        grande.loading = 'eager';
        await Promise.race([grande.decode().catch(() => {}), new Promise((ok) => setTimeout(ok, 200))]);
        aprendo = false;
        if (dlg.open) return;
      }
      miniatura.style.viewTransitionName = 'lente';
      document.documentElement.dataset.vtLente = '';
      const tr = vt.call(document, () => {
        miniatura.style.viewTransitionName = '';
        fai();
        const g = imgDi(i);
        if (g) g.style.viewTransitionName = 'lente';
      });
      tr.finished.finally(() => { const g = imgDi(i); if (g) g.style.viewTransitionName = ''; delete document.documentElement.dataset.vtLente; });
    } else {
      fai();
      anim = dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
    }
    storia.entra();
  };
  const chiudi = ({ subito = false } = {}) => {
    if (!dlg.open) return;
    anim?.cancel();
    if (subito) { dlg.close(); return; }
    anim = dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: movimento() ? 250 : 200, easing: movimento() ? EASE_OUT : 'linear' });
    anim.finished.then(() => dlg.close(), () => {});
  };
  const storia = storiaDialog({ hash: '#lente', chiave: 'galLente', aperto: () => dlg.open, chiudi: () => chiudi(), riapri: () => { void apri(i, ritorno); } });
  pulizie.push(() => storia.stacca());

  const onClose = () => { unlockScroll(); storia.esci(); ritorno?.focus({ preventScroll: true }); };
  const onCancel = (e: Event) => { e.preventDefault(); chiudi(); };
  dlg.addEventListener('close', onClose);
  dlg.addEventListener('cancel', onCancel);
  pulizie.push(() => { dlg.removeEventListener('close', onClose); dlg.removeEventListener('cancel', onCancel); });

  const onClickDoc = (e: MouseEvent) => {
    const b = (e.target as Element | null)?.closest?.<HTMLElement>('[data-lente-apri]');
    if (b) void apri(Number(b.dataset.lenteApri), b);
  };
  document.addEventListener('click', onClickDoc);
  pulizie.push(() => document.removeEventListener('click', onClickDoc));
  // le foto grandi partono appena si mostra l'intenzione di aprire
  const scalda = (e: Event) => {
    const b = (e.target as Element | null)?.closest?.<HTMLElement>('[data-lente-apri]');
    if (b) figure[Number(b.dataset.lenteApri)]?.querySelectorAll('img').forEach((im) => { im.loading = 'eager'; });
  };
  document.addEventListener('pointerover', scalda, { passive: true });
  document.addEventListener('focusin', scalda);
  pulizie.push(() => { document.removeEventListener('pointerover', scalda); document.removeEventListener('focusin', scalda); });

  const onClickDlg = (e: MouseEvent) => {
    const el = e.target as Element | null;
    if (el?.closest('[data-lente-chiudi]')) { chiudi(); return; }
    const vai = el?.closest<HTMLElement>('[data-lente-vai]');
    if (vai) { mostra(i + Number(vai.dataset.lenteVai)); return; }
    if (el?.closest('[data-lente-zoom-btn]')) { zoomA(); return; }
    if (el?.closest('[data-lente-zoom]') && !trascinato) zoomA(e.clientX, e.clientY);
  };
  dlg.addEventListener('click', onClickDlg);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && figure.length > 1) { e.preventDefault(); mostra(i + 1); }
    else if (e.key === 'ArrowLeft' && figure.length > 1) { e.preventDefault(); mostra(i - 1); }
  };
  dlg.addEventListener('keydown', onKey);

  // mouse: con lo zoom il particolare segue il puntatore; dito: si trascina
  let trascinato = false;
  let inizio: { x: number; y: number; tx: number; ty: number; id: number } | null = null;
  const onMove = (e: PointerEvent) => {
    const el = zona();
    if (!el || z === 1) return;
    if (e.pointerType === 'mouse') {
      const r = dlg.querySelector<HTMLElement>('[data-lente-vista]')!.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      tx = -px * w * (z - 1) * 1.1;
      ty = -py * h * (z - 1) * 1.1;
      applica();
    } else if (inizio && e.pointerId === inizio.id) {
      const dx = e.clientX - inizio.x, dy = e.clientY - inizio.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) trascinato = true;
      tx = inizio.tx + dx; ty = inizio.ty + dy;
      applica();
    }
  };
  const onDown = (e: PointerEvent) => {
    trascinato = false;
    if (e.pointerType !== 'mouse' && z > 1) inizio = { x: e.clientX, y: e.clientY, tx, ty, id: e.pointerId };
  };
  const onUp = () => { inizio = null; setTimeout(() => { trascinato = false; }, 0); };
  const vista = dlg.querySelector<HTMLElement>('[data-lente-vista]');
  vista?.addEventListener('pointermove', onMove);
  vista?.addEventListener('pointerdown', onDown);
  vista?.addEventListener('pointerup', onUp);
  vista?.addEventListener('pointercancel', onUp);
  pulizie.push(() => {
    dlg.removeEventListener('click', onClickDlg);
    dlg.removeEventListener('keydown', onKey);
    vista?.removeEventListener('pointermove', onMove);
    vista?.removeEventListener('pointerdown', onDown);
    vista?.removeEventListener('pointerup', onUp);
    vista?.removeEventListener('pointercancel', onUp);
  });

  return () => {
    if (dlg.open) { dlg.removeEventListener('close', onClose); dlg.close(); unlockScroll(); }
    for (const p of pulizie) p();
  };
}

/* ======================================================================= A3 */
// Il ClientRouter fa la view transition; qui si dice da che parte va la pagina (scheda.css fa il resto).
// La direzione sta su <html> della pagina vecchia (istantanea «old») e di quella nuova (lo swap del ClientRouter
// rimpiazza gli attributi di <html>), e si toglie a transizione finita.
let direzioneA3: string | null = null;
let scrollA3 = 0;
document.addEventListener('astro:before-preparation', (e) => {
  const da = (e as Event & { sourceElement?: Element }).sourceElement?.closest?.<HTMLElement>('[data-a3]');
  direzioneA3 = da?.dataset.a3 ?? null;
  scrollA3 = window.scrollY;
  if (direzioneA3) document.documentElement.dataset.a3 = direzioneA3;
  else delete document.documentElement.dataset.a3;
});
document.addEventListener('astro:before-swap', (e) => {
  const ev = e as Event & { newDocument?: Document; viewTransition?: { finished: Promise<void> } };
  if (!direzioneA3 || !ev.newDocument) return;
  ev.newDocument.documentElement.dataset.a3 = direzioneA3;
  ev.newDocument.documentElement.style.setProperty('--a3-y', `${-Math.round(scrollA3)}px`);
  const togli = () => { delete document.documentElement.dataset.a3; document.documentElement.style.removeProperty('--a3-y'); };
  if (ev.viewTransition) ev.viewTransition.finished.then(togli, togli);
  else setTimeout(togli, 0);
  direzioneA3 = null;
});

/* ======================================================================= avvio */
let spegni: (() => void) | null = null;
function avvia() {
  spegni?.();
  spegni = null;
  const sk = document.querySelector<HTMLElement>('[data-scheda]');
  if (!sk) return;
  const a = avviaAcquisto(sk);
  const l = avviaLente();
  spegni = () => { a(); l(); };
}
document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
