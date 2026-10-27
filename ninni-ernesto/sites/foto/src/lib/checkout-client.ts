/**
 * P10 Checkout nel browser (pezzo 5). Macchina a stati, validazione, pagamento finto e ordine: `createCheckout` del core
 * (DemoPaymentProvider: nessun dato esce dal browser, la carta non si salva). Qui: passi, riepilogo (chiuso sul telefono,
 * colonna da 1024), errori sotto i campi (showFieldErrors del core, campi vuoti raggruppati), conferma e anteprima
 * dell'email (renderOrderEmail del core, tema di DIREZIONE §3). Logica presa da Casa (`sites/casa/src/lib/checkout-client.ts`).
 * Carte: 4242 4242 4242 4242 → ordine · 4000 0000 0000 0002 → rifiutata · altre → «solo la carta di prova»; rate → ok.
 */
import { $cart, $cartTotals, $cartCountry, setCartCountry } from '@ne/core/cart';
import { createCheckout, validateCard, checkoutErrorKey, type CheckoutState } from '@ne/core/checkout';
import { renderOrderEmail } from '@ne/core/email';
import {
  INSTALLMENTS, calculateInstallments, formatPrice, preparationDays,
  type CartLine, type CartTotals, type Locale,
} from '@ne/core';
import { formToObject, readTranslator, showFieldErrors, announce } from '@ne/core/ui';
import { centesimiRighe, centesimiConto, dateConsegna, leggiCatalogo, miniatura, metaRiga, righeConto, disegnaConto, movimento, type Catalogo } from './carrello-client';

type Passo = CheckoutState['step'];
type T = ReturnType<typeof readTranslator>;
const PASSI: Passo[] = ['details', 'shipping', 'payment', 'confirmation'];
const NOMI: Record<Passo, string> = {
  details: 'checkout.passo_dati', shipping: 'checkout.passo_spedizione', payment: 'checkout.passo_pagamento', confirmation: 'galleria.acquisto.grazie',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Riga del riepilogo: miniatura, titolo, tipo · misure, «× 2» per le stampe ripetute, prezzo. Niente comandi. */
function rigaRiepilogo(l: CartLine, t: T, lang: Locale, cat: Catalogo, cents: 'always' | 'auto'): HTMLLIElement {
  const li = el('li', `rc rc--${l.kind}`);
  li.append(miniatura({ ...l, url: undefined }, cat, 'rc__img'));
  const testo = el('div', 'rc__testo');
  testo.append(el('p', 'rc__titolo', l.title), el('p', 'rc__meta', metaRiga(l, t, lang, cat)));
  if (l.quantity > 1) testo.append(el('p', 'rc__q-n num', `× ${l.quantity}`));
  li.append(testo);
  const destra = el('div', 'rc__destra');
  destra.append(el('p', 'rc__prezzo num', formatPrice(l.unitPriceCents * l.quantity, lang, { cents })));
  li.append(destra);
  return li;
}

/** Errori nell'ordine dei campi del modulo: il riepilogo in alto e il primo fuoco seguono la pagina. */
function inOrdine(form: HTMLFormElement, errors: Record<string, string>): Record<string, string> {
  const nomi = [...form.elements].map((e) => (e as HTMLInputElement).name).filter(Boolean);
  const pos = (k: string) => { const i = nomi.indexOf(k); return i < 0 ? Infinity : i; };
  return Object.fromEntries(Object.entries(errors).sort(([a], [b]) => pos(a) - pos(b)));
}

/** Errori all'invio: sotto i campi, riepilogo in cima (campi vuoti in una riga), fuoco al riepilogo sotto l'header. */
function mostraErrori(form: HTMLFormElement, errors: Record<string, string>, t: T, fuoco = true): void {
  showFieldErrors(form, errors, t, { focus: false, group: true });
  // le etichette che finiscono col punto (la casella dei termini) davano «condizioni.: Per completare…»
  form.querySelectorAll<HTMLElement>('[data-error-summary] a, [data-error-summary] li').forEach((x) => {
    if (x.childElementCount === 0 && /[.。]\s*[:：]/.test(x.textContent ?? '')) x.textContent = (x.textContent ?? '').replace(/[.。]\s*([:：])/, '$1');
  });
  if (!fuoco || !Object.keys(errors).length) return;
  const sommario = form.querySelector<HTMLElement>('[data-error-summary]:not([hidden])');
  const primo = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  (sommario ?? primo)?.focus({ preventScroll: true });
  (sommario ?? primo)?.scrollIntoView({ block: 'start', behavior: movimento() ? 'smooth' : 'auto' });
}

export function initCheckout(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('[data-checkout]');
  if (!root) return null;
  const spegni: (() => void)[] = [];
  const t = readTranslator(root);
  const lang = (root.dataset.lang ?? 'it') as Locale;
  const cat = leggiCatalogo(root);
  let paesi: Record<string, string> = {};
  try { paesi = JSON.parse(root.dataset.paesi ?? '{}'); } catch { /* niente */ }
  const prezzo = (c: number) => formatPrice(c, lang);
  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const checkout = createCheckout({ lang });
  const forms = {
    details: q<HTMLFormElement>('form[data-form="details"]'),
    shipping: q<HTMLFormElement>('form[data-form="shipping"]'),
    payment: q<HTMLFormElement>('form[data-form="payment"]'),
  };
  const riep = q<HTMLDetailsElement>('[data-ck-riep]');
  const h1 = q('[data-ck-h1]');
  const boxTitolo = h1.parentElement!;

  /* ---- bozza (sessionStorage del core: dati sì, carta mai) ---- */
  const bozza = checkout.$state.get();
  for (const [name, value] of Object.entries(bozza.customer)) {
    const f = forms.details.elements.namedItem(name);
    if (f instanceof HTMLInputElement && f.type === 'checkbox') f.checked = Boolean(value);
    else if (f instanceof HTMLInputElement || f instanceof HTMLSelectElement || f instanceof HTMLTextAreaElement) f.value = String(value ?? '');
  }
  const paeseSel = forms.details.elements.namedItem('country') as HTMLSelectElement;
  if (!paeseSel.value && lang === 'it') paeseSel.value = 'IT';
  // il riepilogo segue il paese scelto qui (senza, nel checkout comparirebbe «Spedizione: al checkout»)
  const syncPaese = () => { if (paeseSel.value && paeseSel.value !== $cartCountry.get()) setCartCountry(paeseSel.value); };
  syncPaese();
  paeseSel.addEventListener('change', syncPaese);
  (forms.shipping.elements.namedItem('isGift') as HTMLInputElement).checked = bozza.shipping.isGift;
  (forms.shipping.elements.namedItem('giftMessage') as HTMLTextAreaElement).value = bozza.shipping.giftMessage;
  const metodo0 = forms.payment.querySelector<HTMLInputElement>(`input[name="method"][value="${bozza.method}"]`);
  if (metodo0) metodo0.checked = true;

  /* ---- campi che compaiono ---- */
  const lega = (form: HTMLFormElement, casella: string, area: string) => {
    const c = form.elements.namedItem(casella) as HTMLInputElement;
    const a = q(area);
    const sync = () => { a.hidden = !c.checked; };
    c.addEventListener('change', sync);
    sync();
  };
  lega(forms.details, 'wantsInvoice', '[data-ck-fattura]');
  lega(forms.shipping, 'isGift', '[data-ck-regalo]');

  const syncMetodo = () => {
    const m = (forms.payment.querySelector<HTMLInputElement>('input[name="method"]:checked')?.value ?? 'card') as 'card' | 'installments';
    checkout.setMethod(m);
    q('[data-ck-carta]').hidden = m !== 'card';
    showFieldErrors(forms.payment, {}, t, { focus: false });
  };
  forms.payment.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).name === 'method') syncMetodo(); });

  /* numero della carta a gruppi di 4 mentre scrivi (si può incollare); scadenza MM/AA */
  const numero = forms.payment.elements.namedItem('number') as HTMLInputElement;
  numero.addEventListener('input', () => {
    const nuovo = numero.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
    if (nuovo !== numero.value) numero.value = nuovo;
  });
  const scad = forms.payment.elements.namedItem('expiry') as HTMLInputElement;
  scad.addEventListener('input', (e) => {
    if ((e as InputEvent).inputType?.startsWith('delete')) return;
    const c = scad.value.replace(/\D/g, '').slice(0, 4);
    scad.value = c.length > 2 ? `${c.slice(0, 2)}/${c.slice(2)}` : c;
  });

  /* «Usa la carta di prova»: riempie la carta che funziona */
  q('[data-ck-carta-prova]').addEventListener('click', () => {
    const card = forms.payment.querySelector<HTMLInputElement>('input[value="card"]')!;
    if (!card.checked) { card.checked = true; syncMetodo(); }
    const f = forms.payment.elements;
    const anno = String((new Date().getFullYear() + 3) % 100).padStart(2, '0');
    const c = checkout.$state.get().customer;
    const valori: Record<string, string> = { number: '4242 4242 4242 4242', expiry: `12/${anno}`, cvc: '123', holder: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() };
    for (const [n, v] of Object.entries(valori)) {
      const x = f.namedItem(n) as HTMLInputElement | null;
      if (x && (n !== 'holder' || !x.value)) { x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    (f.namedItem('acceptTerms') as HTMLInputElement | null)?.focus();
  });

  /* errori: solo all'invio, e via appena il campo è a posto */
  const ripulisci = (form: HTMLFormElement) => (e: Event) => {
    const x = e.target as HTMLInputElement;
    if (!x.name || !x.hasAttribute('aria-invalid')) return;
    if (x.type === 'checkbox' ? !x.checked : !x.value.trim()) return;
    x.removeAttribute('aria-invalid');
    const box = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(x.name)}"]`);
    if (box) { box.hidden = true; box.textContent = ''; }
    const sommario = form.querySelector<HTMLElement>('[data-error-summary]');
    if (sommario && !form.querySelector('[aria-invalid="true"]')) sommario.hidden = true;
  };
  Object.values(forms).forEach((f) => { const r = ripulisci(f); f.addEventListener('input', r); f.addEventListener('change', r); });

  /* ---- navigazione fra i passi ---- */
  root.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-go], [data-passo]');
    if (!b || !root.contains(b) || b.disabled) return;
    checkout.goTo((b.dataset.go ?? b.dataset.passo) as Passo);
  });
  forms.details.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!checkout.submitDetails(new FormData(forms.details))) mostraErrori(forms.details, inOrdine(forms.details, checkout.$state.get().errors), t);
    else showFieldErrors(forms.details, {}, t, { focus: false });
  });
  forms.shipping.addEventListener('submit', (e) => {
    e.preventDefault();
    checkout.submitShipping(new FormData(forms.shipping));
  });
  forms.payment.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formToObject(forms.payment);
    const card = { number: String(d.number ?? ''), expiry: String(d.expiry ?? ''), cvc: String(d.cvc ?? ''), holder: String(d.holder ?? '') };
    const ok = await checkout.pay({ acceptTerms: d.acceptTerms === 'on', card });
    const s = checkout.$state.get();
    // il core controlla i termini prima della carta: senza termini mostro insieme anche gli errori della carta
    let errori = s.errors;
    if (!ok && errori.acceptTerms && s.method === 'card') errori = { ...validateCard(card).errors, ...errori };
    if (!ok && s.step === 'payment' && !s.formError) mostraErrori(forms.payment, inOrdine(forms.payment, errori), t);
    if (!ok && s.step === 'payment' && s.formError) { showFieldErrors(forms.payment, {}, t, { focus: false }); q('[data-ck-errore]').focus(); }
    if (!ok && s.step === 'details') mostraErrori(forms.details, inOrdine(forms.details, s.errors), t);
    if (ok) forms.payment.reset();
  });

  /* ---- riepilogo: chiuso sotto 1024 (si apre), sempre aperto da 1024 ---- */
  const mq = window.matchMedia('(min-width: 1024px)');
  const syncRiep = () => { if (mq.matches) riep.open = true; else if (!riep.dataset.toccato) riep.open = false; };
  const onSummary = (e: Event) => { if (mq.matches) { e.preventDefault(); return; } riep.dataset.toccato = '1'; };
  riep.querySelector('summary')!.addEventListener('click', onSummary);
  mq.addEventListener('change', syncRiep);
  spegni.push(() => mq.removeEventListener('change', syncRiep));
  syncRiep();

  const disegnaRiepilogo = (lines: readonly CartLine[], totals: CartTotals) => {
    const cents = centesimiConto(totals) === 'always' ? 'always' : centesimiRighe(lines);
    q('[data-ck-righe]').replaceChildren(...lines.map((l) => rigaRiepilogo(l, t, lang, cat, cents)));
    disegnaConto(q('[data-ck-conto]'), righeConto(totals, t, lang));
    q('[data-ck-riep-tot]').textContent = prezzo(totals.totalCents);
    const s = totals.shipping;
    const consegna = q('[data-ck-consegna]');
    if (s) {
      consegna.textContent = t('galleria.acquisto.consegna', { date: dateConsegna(lines, s, lang) });
    }
    consegna.hidden = !s || checkout.$state.get().step === 'confirmation';
    q('[data-ck-dazi]').hidden = !s?.dutiesMayApply;
  };

  const disegnaSpedizione = (totals: CartTotals) => {
    const c = checkout.$state.get().customer;
    const ind = q('[data-ck-indirizzo]');
    ind.replaceChildren();
    [`${c.firstName ?? ''} ${c.lastName ?? ''}`, c.address1, c.address2, `${c.postalCode ?? ''} ${c.city ?? ''}${c.province ? ` (${c.province})` : ''}`, paesi[c.country ?? ''] ?? c.country, c.email, c.phone]
      .filter((x) => x && String(x).trim())
      .forEach((r, i) => { if (i) ind.append(document.createElement('br')); ind.append(String(r)); });
    const s = totals.shipping;
    q('[data-ck-sped-l]').textContent = s ? `${t('carrello.spedizione')} · ${t(`core.zone.${s.zone}`)}` : t('carrello.spedizione');
    q('[data-ck-sped-costo]').textContent = s ? (s.totalCents === 0 ? t('galleria.acquisto.inclusa') : prezzo(s.totalCents)) : '';
    q('[data-ck-sped-giorni]').textContent = s ? t('core.cart.consegna_giorni', { min: s.deliveryDays.min, max: s.deliveryDays.max }) : '';
    q('[data-ck-sped-dazi]').hidden = !s?.dutiesMayApply;
  };

  const disegnaPagamento = (totals: CartTotals) => {
    const piano = calculateInstallments(totals.totalCents);
    const radio = forms.payment.querySelector<HTMLInputElement>('input[value="installments"]')!;
    radio.disabled = !piano.eligible;
    if (!piano.eligible && radio.checked) { forms.payment.querySelector<HTMLInputElement>('input[value="card"]')!.checked = true; syncMetodo(); }
    q('[data-ck-rate-n]').textContent = piano.eligible
      ? t('checkout.metodo_rate_dettaglio', { importo: prezzo(piano.amounts[0] ?? 0) })
      : t('core.checkout.rate_non_disponibili', { min: prezzo(INSTALLMENTS.minCents), max: prezzo(INSTALLMENTS.maxCents) });
  };

  /* ---- email di conferma: anteprima nella pagina ---- */
  const frame = q<HTMLIFrameElement>('[data-ck-email-frame]');
  const misura = () => {
    try {
      const doc = frame.contentDocument;
      const h = doc?.documentElement.scrollHeight;
      if (h) frame.style.height = `${h + 2}px`;
    } catch { /* resta l'altezza del CSS */ }
  };
  frame.addEventListener('load', misura);
  const ro = new ResizeObserver(() => misura());
  ro.observe(frame);
  spegni.push(() => ro.disconnect());
  let emailFatta: string | null = null;
  const mostraEmail = (o: NonNullable<CheckoutState['order']>) => {
    if (emailFatta === o.number) return;
    emailFatta = o.number;
    // nelle email la miniatura dev'essere JPEG (molti programmi di posta non leggono WebP)
    const ordine = { ...o, lines: o.lines.map((l) => { const jpg = cat[l.artworkId]?.jpg; return l.image && jpg ? { ...l, image: { ...l.image, src: jpg } } : l; }) };
    const email = renderOrderEmail(ordine, {
      t, baseUrl: location.origin,
      theme: {
        brandName: 'Ninni & Ernesto', logoUrl: '/logo-email.png', logoWidth: 48,
        accentColor: '#000000', backgroundColor: '#FFFFFF', surfaceColor: '#FFFFFF', textColor: '#000000',
        mutedColor: '#6B6B6B', borderColor: '#000000',
        fontFamily: 'Helvetica, Arial, sans-serif', headingFontFamily: 'Helvetica, Arial, sans-serif',
      },
    });
    q('[data-ck-email-ogg]').textContent = email.subject;
    // solo nell'anteprima: il numero d'ordine non va a capo (l'html del core non cambia)
    const [testa, corpo = ''] = email.html.split('<body');
    // sul telefono i margini interni da 40 px dell'email (pensati per 600 px) si riducono, solo qui nell'anteprima
    const stile = '<style>.ck-nowrap{white-space:nowrap}@media (max-width:480px){td[style*="32px 16px"]{padding:12px 0!important}'
      + 'td[style*="40px"]{padding-left:16px!important;padding-right:16px!important}}</style>';
    frame.srcdoc = testa!.replace('</head>', `${stile}</head>`) + '<body'
      + corpo.split(ordine.number).join(`<span class="ck-nowrap">${ordine.number}</span>`);
    q('[data-ck-email]').hidden = false;
  };

  /* ---- passi nella storia del browser ----
   * Ogni passo ha una voce della storia (stesso indirizzo, `history.state.galCk`): Indietro e Avanti del telefono si
   * muovono fra i passi invece di uscire dal checkout, e una ricarica riapre il passo in cui si era. Il popstate passa
   * prima da window.__galPop (Base.astro), così il ClientRouter non rifà la pagina. Logica di Casa. */
  const STORIA = 'galCk';
  const percorso = location.pathname;
  const statoStoria = () => (history.state ?? {})[STORIA] as Passo | undefined;
  const scriviStoria = (passo: Passo, nuova: boolean) => {
    const st = { ...(history.state ?? {}), [STORIA]: passo };
    if (nuova) history.pushState(st, ''); else history.replaceState(st, '');
  };
  let daStoria = false;
  let ignora = 0;
  let versoConferma = false;
  const onPop = (e: PopStateEvent) => {
    if (location.pathname !== percorso) return;
    const passo = (e.state ?? {})[STORIA] as Passo | undefined;
    if (!passo) return; // un'altra pagina: ci pensa il ClientRouter
    e.stopImmediatePropagation();
    if (versoConferma) { versoConferma = false; scriviStoria('confirmation', false); return; }
    if (ignora > 0) { ignora--; return; }
    const s = checkout.$state.get();
    if (s.step === 'confirmation') { scriviStoria('confirmation', false); return; }
    const i = PASSI.indexOf(passo);
    daStoria = true;
    if (i < PASSI.indexOf(s.step)) checkout.goTo(passo);
    else if (i > PASSI.indexOf(s.step)) {
      let ok = s.step !== 'details' || checkout.submitDetails(new FormData(forms.details));
      if (ok && i === 2 && checkout.$state.get().step === 'shipping') ok = checkout.submitShipping(new FormData(forms.shipping));
      if (!ok) mostraErrori(forms.details, inOrdine(forms.details, checkout.$state.get().errors), t);
    }
    daStoria = false;
    const ora = checkout.$state.get().step;
    if (ora !== passo) scriviStoria(ora, false);
  };
  const porta = (window as unknown as { __galPop?: Set<(e: PopStateEvent) => void> }).__galPop;
  if (porta) { porta.add(onPop); spegni.push(() => porta.delete(onPop)); }
  else { window.addEventListener('popstate', onPop, { capture: true }); spegni.push(() => window.removeEventListener('popstate', onPop, { capture: true })); }

  // ricarica (o ritorno da un'altra pagina) a metà: si riapre il passo della voce, se i dati della bozza bastano
  const voluto = statoStoria();
  if ((voluto === 'shipping' || voluto === 'payment') && $cart.get().length) {
    if (checkout.submitDetails(new FormData(forms.details)) && voluto === 'payment') checkout.submitShipping(new FormData(forms.shipping));
    else showFieldErrors(forms.details, {}, t, { focus: false });
  }
  if (statoStoria() !== checkout.$state.get().step) scriviStoria(checkout.$state.get().step, false);

  /* ---- disegno dello stato ---- */
  let passoPrima: Passo | null = null;
  const fitTitolo = boxTitolo.dataset.fitTitolo, fitGrazie = boxTitolo.dataset.fitGrazie;
  const disegna = (s: CheckoutState) => {
    root.dataset.step = s.step;
    const vuoto = $cart.get().length === 0 && s.step !== 'confirmation';
    q('[data-ck-vuoto]').hidden = !vuoto;
    q('[data-ck-corpo]').hidden = vuoto;
    root.toggleAttribute('data-vuoto', vuoto);

    root.querySelectorAll<HTMLElement>('[data-ck-pan]').forEach((p) => { p.hidden = p.dataset.ckPan !== s.step; });
    const ora = PASSI.indexOf(s.step);
    root.querySelectorAll<HTMLButtonElement>('[data-passo]').forEach((b) => {
      const i = PASSI.indexOf(b.dataset.passo as Passo);
      b.disabled = i >= ora || s.step === 'confirmation';
      if (i === ora) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      if (i < ora) b.setAttribute('aria-label', t('galleria.acquisto.passo_fatto', { nome: t(NOMI[b.dataset.passo as Passo]) }));
      else b.removeAttribute('aria-label');
    });

    // conferma: il titolo diventa «Grazie», gigante
    const fatto = s.step === 'confirmation' && !!s.order;
    // ordine chiuso: l'header non è più ridotto, torna «Indice» (audit finale 1, #8)
    const ck = document.querySelector<HTMLElement>('[data-hd-indice-ck]');
    if (ck) ck.hidden = !fatto;
    const testoH1 = fatto ? t('galleria.acquisto.grazie') : t('checkout.titolo');
    if (h1.textContent !== testoH1) h1.textContent = testoH1;
    const f = fatto ? fitGrazie : fitTitolo;
    if (f) boxTitolo.style.setProperty('--fit', f); else boxTitolo.style.removeProperty('--fit');

    const totals = $cartTotals.get();
    if (s.step === 'shipping') disegnaSpedizione(totals);
    if (s.step === 'payment') disegnaPagamento(totals);
    if (fatto && s.order) {
      const o = s.order;
      const [prima = '', dopo = ''] = t('checkout.numero_ordine', { numero: '\u0001' }).split('\u0001');
      q('[data-ck-ordine]').replaceChildren(prima, el('span', 'num', o.number), dopo);
      q('[data-ck-pagato]').textContent = o.payment.method === 'installments' && o.payment.installments
        ? t('galleria.acquisto.pagato_rate', { importo: prezzo(o.payment.installments.amounts[0] ?? 0) })
        : t('galleria.acquisto.pagato_carta', { n: o.payment.last4 ?? '' });
      disegnaRiepilogo(o.lines, o.totals);
      mostraEmail(o);
    }

    // pagamento: barretta che si allunga + «Un momento…» (aria-busy), errore generale (rifiutata, solo carta di prova…)
    const paga = q<HTMLButtonElement>('[data-ck-paga]');
    paga.disabled = s.processing;
    paga.setAttribute('aria-busy', String(s.processing));
    const pagaT = q('[data-ck-paga-t]');
    pagaT.textContent = s.processing ? t('checkout.elaborazione') : t('checkout.paga_demo');
    if (s.processing && !paga.querySelector('.btn__barra')) paga.prepend(el('span', 'btn__barra'));
    if (!s.processing) paga.querySelector('.btn__barra')?.remove();
    const err = q('[data-ck-errore]');
    err.textContent = s.formError ? t(checkoutErrorKey(s, t) ?? s.formError, { min: prezzo(INSTALLMENTS.minCents), max: prezzo(INSTALLMENTS.maxCents) }) : '';
    err.hidden = !s.formError;

    if (passoPrima !== null && passoPrima !== s.step && !daStoria && statoStoria() === passoPrima) {
      const da = PASSI.indexOf(passoPrima), a = PASSI.indexOf(s.step);
      if (s.step === 'confirmation') {
        // ordine fatto: le voci dei passi non servono più; si torna alla prima e la si fa diventare la conferma
        if (da > 0) { versoConferma = true; history.go(-da); } else scriviStoria('confirmation', false);
      } else if (a > da) scriviStoria(s.step, true);
      else { ignora++; history.go(a - da); } // indietro coi bottoni della pagina: la storia segue
    }
    if (passoPrima !== null && passoPrima !== s.step) {
      // il titolo del passo (o «Grazie») sotto l'header, poi il fuoco (annunciato dai lettori di schermo)
      const h = fatto ? h1 : q(`#ck-h-${s.step}`);
      h.focus({ preventScroll: true });
      const hdr = document.querySelector<HTMLElement>('[data-hd]')?.offsetHeight ?? 0;
      const bersaglio = fatto ? root : q('.ck__passi');
      const y = bersaglio.getBoundingClientRect().top;
      if (y < hdr + 8 || y > window.innerHeight * 0.4) {
        window.scrollTo({ top: Math.max(0, y + window.scrollY - hdr - 16), behavior: movimento() ? 'smooth' : 'auto' });
      }
      if (fatto && s.order) {
        announce(q('[data-ck-stato]'), `${t('galleria.acquisto.grazie')}. ${s.order.number}`);
        document.dispatchEvent(new CustomEvent('isa:order-confirmed', { detail: s.order }));
      }
    }
    passoPrima = s.step;
  };

  spegni.push(checkout.$state.subscribe(disegna));
  spegni.push($cartTotals.subscribe((tot) => {
    const s = checkout.$state.get();
    if (s.step !== 'confirmation') disegnaRiepilogo($cart.get(), tot);
    if (s.step === 'shipping') disegnaSpedizione(tot);
    if (s.step === 'payment') disegnaPagamento(tot);
  }));
  spegni.push($cart.listen(() => disegna(checkout.$state.get())));
  syncMetodo();
  return () => spegni.forEach((f) => f());
}
