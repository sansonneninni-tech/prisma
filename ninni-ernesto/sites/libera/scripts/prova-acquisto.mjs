#!/usr/bin/env node
/**
 * Galleria — prove di comportamento di cassetto, carrello e checkout (pezzo 5). Adattato da Casa.
 * Uso (server acceso, es. `astro preview`): node sites/galleria/scripts/prova-acquisto.mjs --base http://127.0.0.1:4325
 * Controlla: «Carrello (n)» → cassetto (non naviga), Esc/velo e fuoco che torna, cassetto a tutto schermo a 375,
 * carrello misto con IVA 5% e 22% (importi = core) per Italia / Germania / USA, dazi fuori UE, quantità, Rimuovi e
 * fuoco, carrello vuoto con due porte, venduta nel frattempo, checkout vuoto, errori, carte 0002 / altra / non valida,
 * termini, 4242 → conferma ed email, carrello svuotato, rate, Indietro/Avanti fra i passi, ricarica a metà,
 * nessuna richiesta verso altri domini, console pulita.
 */
import { calculateTotals } from '../../../packages/core/src/pricing/totals.ts';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const i = process.argv.indexOf('--base');
const base = (i > 0 ? process.argv[i + 1] : 'http://127.0.0.1:4325').replace(/\/$/, '');
let ok = 0, ko = 0;
const prova = (nome, cond, extra = '') => { if (cond) { ok++; console.log(`✓ ${nome}`); } else { ko++; console.log(`✗ ${nome} ${extra}`); } };

/* carrello misto: originale (IVA 5%) + due stampe (IVA 22%) */
const MISTO = [
  { kind: 'original', artworkId: '04', slug: 'dea-alea', title: 'Dea Alea', unitPriceCents: 500000, longestSideCm: 140, image: { src: '/assets/opere/04/opera-04_miniatura_400.webp', width: 400, height: 500, alt: 'Dea Alea' }, url: '/it/opere/dea-alea/', key: 'original:04', quantity: 1, addedAt: 1 },
  { kind: 'print', artworkId: '21', slug: 'onde-interne', title: 'Onde Interne', unitPriceCents: 28060, print: { formatId: '70x50', material: 'canvas', widthCm: 70, heightCm: 50 }, image: { src: '/assets/opere/21/opera-21_miniatura_400.webp', width: 400, height: 500, alt: 'Onde Interne' }, url: '/it/opere/onde-interne/', key: 'print:21:70x50:canvas', quantity: 2, addedAt: 2 },
  { kind: 'print', artworkId: '08', slug: 'segni-in-dialogo', title: 'Segni in dialogo', unitPriceCents: 10980, print: { formatId: '40x60', material: 'paper', widthCm: 40, heightCm: 60 }, image: { src: '/assets/opere/08/opera-08_miniatura_400.webp', width: 400, height: 500, alt: 'Segni in dialogo' }, url: '/it/opere/segni-in-dialogo/', key: 'print:08:40x60:paper', quantity: 1, addedAt: 3 },
];
/* un originale già venduto nel catalogo (Le donzelle, id 24) rimasto in un carrello vecchio */
const VENDUTA = [{ ...MISTO[0], artworkId: '24', slug: 'le-donzelle', title: 'Le donzelle', key: 'original:24', url: '/it/opere/le-donzelle/' }, MISTO[2]];

const browser = await chromium.launch();
async function nuovo(w = 1440, h = 900, carrello = null) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024, isMobile: w < 1024 });
  // banner cookie (pezzo 7): scelta già fatta, così non copre i comandi in basso
  await ctx.addInitScript(() => { try { localStorage.setItem('galleria:cookie:v1', JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'prova' })); } catch {} });
  if (carrello) {
    await ctx.addInitScript((c) => { try { if (!sessionStorage.getItem('prova:fatto')) { localStorage.setItem('isa:cart:v1', c); sessionStorage.setItem('prova:fatto', '1'); } } catch {} }, JSON.stringify(carrello));
  }
  const page = await ctx.newPage();
  const fuori = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !/^(data|blob|about):/.test(u.protocol)) fuori.push(r.url()); });
  const errori = [];
  page.on('pageerror', (e) => errori.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()); });
  return { ctx, page, fuori, errori };
}
const carrello = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('isa:cart:v1') || '[]'));
const testo = (page, sel) => page.locator(sel).first().innerText().then((s) => s.trim());
const euro = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
const aperto = (page) => page.locator('[data-cassetto]').evaluate((d) => d.open);

/* ---------------- cassetto ---------------- */
{
  const { ctx, page, errori, fuori } = await nuovo(1440, 900, MISTO);
  await page.goto(`${base}/it/opere/`, { waitUntil: 'networkidle' });
  await page.locator('.hd [data-carrello]').click();
  await page.waitForTimeout(600);
  prova('Carrello (n) → cassetto aperto, nessuna navigazione', (await aperto(page)) && /\/it\/opere\/(#carrello)?$/.test(page.url())); // #carrello: voce di storia del cassetto (audit finale 1)
  prova('titolo "Carrello (4)" (pezzi) e 3 righe', /Carrello \(4\)/.test(await testo(page, '[data-cas-titolo]')) && (await page.locator('[data-cas-righe] .rc').count()) === 3);
  prova('fuoco dentro il cassetto', await page.evaluate(() => !!document.activeElement?.closest('[data-cassetto]')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  prova('Esc chiude e il fuoco torna a "Carrello"', !(await aperto(page)) && await page.evaluate(() => document.activeElement?.hasAttribute('data-carrello')));
  await page.locator('.hd [data-carrello]').click();
  await page.waitForTimeout(600);
  await page.mouse.click(30, 450); // velo
  await page.waitForTimeout(600);
  prova('clic sul velo chiude', !(await aperto(page)));
  // dopo un cambio pagina (ClientRouter) il cassetto funziona ancora
  await page.locator('.hd a[href="/it/info/"], footer a[href^="/it/info/"]').first().click().catch(() => page.goto(`${base}/it/info/`));
  await page.waitForTimeout(800);
  await page.locator('.hd [data-carrello]').click();
  await page.waitForTimeout(600);
  prova('dopo un cambio pagina il cassetto si apre ancora', await aperto(page));
  await page.locator("button[data-cas-chiudi]").click();
  await page.waitForTimeout(600);
  prova('console pulita (cassetto)', errori.length === 0, errori.join(' | '));
  prova('nessuna richiesta verso altri domini (cassetto)', fuori.length === 0, fuori.join(' '));
  await ctx.close();
}
{
  const { ctx, page } = await nuovo(375, 812, MISTO);
  await page.goto(`${base}/it/opere/`, { waitUntil: 'networkidle' });
  await page.locator('.hd [data-carrello]').click();
  await page.waitForTimeout(700);
  const w = await page.locator('[data-cas-pan]').evaluate((d) => d.getBoundingClientRect().width);
  prova('375: cassetto a tutto schermo', w === 375, String(w));
  await ctx.close();
}
{
  const { ctx, page } = await nuovo();
  await page.goto(`${base}/en/opere/`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.goto(`${base}/en/`, { waitUntil: 'networkidle' });
  await page.locator('.hd [data-carrello]').click();
  await page.waitForTimeout(600);
  prova('cassetto vuoto: riga e due porte', await page.locator('[data-cas-vuoto]').isVisible() && (await page.locator('[data-cas-vuoto] .porta').count()) === 2);
  await ctx.close();
}

/* ---------------- pagina carrello ---------------- */
{
  const { ctx, page, errori, fuori } = await nuovo(1440, 900, MISTO);
  await page.goto(`${base}/it/carrello/`, { waitUntil: 'networkidle' });
  const righe = await carrello(page);
  prova('carrello misto: 1 originale + 2 stampe', righe.filter((l) => l.kind === 'original').length === 1 && righe.filter((l) => l.kind === 'print').length === 2);
  prova('lingua it senza paese salvato: Italia scelta', (await page.locator('[data-car-paese]').inputValue()) === 'IT');
  const ivaRighe = await page.locator('.conto__riga--iva-det dt').allInnerTexts();
  prova('due righe IVA (5% originali, 22% stampe)', ivaRighe.some((s) => s.includes('5%')) && ivaRighe.some((s) => s.includes('22%')), ivaRighe.join('|'));
  for (const paese of ['IT', 'DE', 'US']) {
    await page.selectOption('[data-car-paese]', paese);
    await page.waitForTimeout(300);
    const atteso = calculateTotals(righe, { country: paese });
    const sped = euro(await testo(page, '.conto__riga--sped dd'));
    const tot = euro(await testo(page, '.conto__riga--tot dd'));
    const iva = (await page.locator('.conto__riga--iva-det dd').allInnerTexts()).map(euro);
    prova(`${paese}: spedizione ${atteso.shipping.totalCents / 100} € e totale ${atteso.totalCents / 100} € come il core`,
      Math.round(sped * 100) === atteso.shipping.totalCents && Math.round(tot * 100) === atteso.totalCents, `${sped} ${tot}`);
    prova(`${paese}: IVA come il core`, atteso.vat.every((v, k) => Math.round(iva[k] * 100) === v.vatCents), iva.join(','));
    prova(`${paese}: nota dazi ${atteso.shipping.dutiesMayApply ? 'visibile' : 'nascosta'}`, (await page.locator('[data-car-dazi]').isVisible()) === atteso.shipping.dutiesMayApply);
    prova(`${paese}: consegna stimata`, /^Consegna stimata: \d/.test(await testo(page, '[data-car-consegna]')));
  }
  const decimali = (await page.locator('.conto dd').allInnerTexts()).filter((s) => /\d/.test(s));
  prova('colonna del conto coerente (tutti con i centesimi)', decimali.every((s) => /,\d\d/.test(s)), decimali.join(' | '));
  await page.selectOption('[data-car-paese]', 'IT');
  const stampa = righe.find((l) => l.kind === 'print' && l.quantity === 1);
  await page.locator(`.car [data-key="${stampa.key}"] .rc__qb`).nth(1).click();
  await page.waitForTimeout(300);
  prova('+ aumenta la quantità della stampa', (await carrello(page)).find((l) => l.key === stampa.key).quantity === 2);
  prova('fuoco resta sul +', await page.evaluate(() => document.activeElement?.classList.contains('rc__qb')));
  prova('originale senza − n +', (await page.locator('.car .rc--original .rc__qb').count()) === 0);
  await page.locator(`.car [data-key="${stampa.key}"] .rc__togli`).click();
  await page.waitForTimeout(300);
  prova('Rimuovi toglie la riga e il fuoco va a un altro Rimuovi', !(await carrello(page)).some((l) => l.key === stampa.key) && await page.evaluate(() => document.activeElement?.classList.contains('rc__togli')));
  while ((await carrello(page)).length > 0) { await page.locator('.car .rc__togli').first().click(); await page.waitForTimeout(250); }
  prova('carrello vuoto: riga e due porte', await page.locator('[data-car-vuoto]').isVisible() && (await page.locator('[data-car-vuoto] .porta').count()) === 2);
  prova('fuoco sul titolo del carrello vuoto', await page.evaluate(() => document.activeElement?.id === 'car-titolo'));
  { await page.waitForTimeout(1000); const h = await testo(page, '.hd [data-carrello]'); prova('header "Carrello (0)"', /\(0\)/.test(h.replace(/\s/g, '')), JSON.stringify(h)); }
  prova('console pulita (carrello)', errori.length === 0, errori.join(' | '));
  prova('nessuna richiesta verso altri domini (carrello)', fuori.length === 0, fuori.join(' '));
  await ctx.close();
}
{
  const { ctx, page } = await nuovo(1440, 900, VENDUTA);
  await page.goto(`${base}/it/carrello/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  prova('venduta nel frattempo: avviso con link alle commissioni', await page.locator('[data-car-avvisi] .avviso').isVisible() && (await page.locator('[data-car-avvisi] a[href*="su-commissione"]').count()) === 1);
  prova('venduta: l\'originale è uscito dal carrello', !(await carrello(page)).some((l) => l.key === 'original:24'));
  await page.locator('[data-car-avvisi] button').click();
  await page.waitForTimeout(200);
  prova('Chiudi toglie l\'avviso', (await page.locator('[data-car-avvisi] .avviso').count()) === 0);
  await ctx.close();
}

/* ---------------- checkout ---------------- */
const DATI = { email: 'giulia.rossi@example.com', phone: '+39 333 123 4567', firstName: 'Giulia', lastName: 'Rossi', address1: 'Via Orsini 12', postalCode: '76123', city: 'Andria' };
async function finoAlPagamento(page, paese = 'IT') {
  await page.goto(`${base}/it/checkout/`, { waitUntil: 'networkidle' });
  const f = page.locator('form[data-form="details"]');
  for (const [k, v] of Object.entries(DATI)) await f.locator(`[name="${k}"]`).fill(v);
  await f.locator('select[name="country"]').selectOption(paese);
  await f.locator('button[type=submit]').click();
  await page.locator('form[data-form="shipping"] button[type=submit]').click();
  await page.waitForSelector('[data-ck-pan="payment"]:not([hidden])');
}
const spunta = (page, sel, v = true) => page.evaluate(([s, v]) => { const x = document.querySelector(s); x.checked = v; x.dispatchEvent(new Event('change', { bubbles: true })); x.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
async function carta(page, numero, termini = true) {
  const f = page.locator('form[data-form="payment"]');
  await f.locator('[name=number]').fill(numero); await f.locator('[name=expiry]').fill('12/30');
  await f.locator('[name=cvc]').fill('123'); await f.locator('[name=holder]').fill('Giulia Rossi');
  await spunta(page, 'form[data-form="payment"] [name=acceptTerms]', termini);
  await f.locator('[data-ck-paga]').click();
  await page.waitForFunction(() => !document.querySelector('[data-ck-paga]')?.disabled, null, { timeout: 8000 });
  await page.waitForTimeout(200);
}
const passo = (page) => page.locator('[data-checkout]').getAttribute('data-step');
{
  const { ctx, page } = await nuovo();
  await page.goto(`${base}/it/checkout/`, { waitUntil: 'networkidle' });
  prova('checkout senza carrello: stato vuoto', await page.locator('[data-ck-vuoto]').isVisible());
  await ctx.close();
}
{
  const { ctx, page, errori, fuori } = await nuovo(1440, 900, MISTO);
  await page.goto(`${base}/it/checkout/`, { waitUntil: 'networkidle' });
  prova('header ridotto: niente Indice', (await page.locator('.hd [data-indice-apri]').count()) === 0 && !/Indice/.test(await testo(page, '.hd')));
  await page.locator('.hd [data-carrello]').click();
  await page.waitForURL('**/it/carrello/');
  prova('nel checkout "Carrello" porta alla pagina carrello (niente cassetto)', page.url().endsWith('/it/carrello/'));
  await page.goto(`${base}/it/checkout/`, { waitUntil: 'networkidle' });
  prova('passo 1 con riepilogo aperto da 1024 e 3 righe', await page.locator('[data-ck-riep]').evaluate((d) => d.open) && (await page.locator('[data-ck-righe] .rc').count()) === 3);
  await page.locator('form[data-form="details"] button[type=submit]').click();
  await page.waitForTimeout(300);
  prova('invio vuoto: riepilogo errori + campi aria-invalid', await page.locator('form[data-form="details"] [data-error-summary]').isVisible() && (await page.locator('form[data-form="details"] [aria-invalid="true"]').count()) >= 6);
  await finoAlPagamento(page, 'IT');
  await carta(page, '4242 4242 4242 4242', false);
  prova('senza termini: errore sulla casella', (await page.locator('[name=acceptTerms][aria-invalid="true"]').count()) === 1);
  await carta(page, '4000 0000 0000 0002');
  const rif = await testo(page, '[data-ck-errore]');
  prova('carta 0002: rifiutata con messaggio', rif.length > 5 && (await passo(page)) === 'payment', rif);
  await carta(page, '5555 5555 5555 4444');
  const altra = (await page.locator('[data-ck-errore]').textContent()) + (await page.locator('form[data-form=payment] .isa-field__error').allInnerTexts()).join(' ');
  prova('altra carta valida: non accettata', (await passo(page)) === 'payment' && /prova/i.test(altra), altra);
  await carta(page, '4242 4242 4242 4241');
  prova('numero non valido: errore sul campo', (await page.locator('[name=number][aria-invalid="true"]').count()) === 1);
  await carta(page, '4242 4242 4242 4242');
  await page.waitForSelector('[data-ck-pan="confirmation"]:not([hidden])', { timeout: 8000 });
  prova('4242: conferma con numero d\'ordine', /\d/.test(await testo(page, '[data-ck-ordine]')));
  prova('carrello svuotato dopo l\'ordine', (await carrello(page)).length === 0);
  await page.waitForTimeout(800);
  const em = await page.evaluate(() => { const f = document.querySelector('[data-ck-email-frame]'); const d = f.contentDocument; return { w: d.documentElement.scrollWidth, fw: f.clientWidth, testo: d.body.innerText, img: d.images.length }; });
  prova('email d\'ordine in anteprima con le righe e il logo', /Dea Alea/.test(em.testo) && /Onde Interne/.test(em.testo) && em.img >= 3, JSON.stringify({ img: em.img }));
  prova('email senza scorrimento orizzontale', em.w <= em.fw, `${em.w} > ${em.fw}`);
  prova('console pulita (checkout)', errori.length === 0, errori.join(' | '));
  prova('nessuna richiesta verso altri domini (checkout)', fuori.length === 0, fuori.join(' '));
  await ctx.close();
}
{
  const { ctx, page, errori } = await nuovo(375, 812, [MISTO[0]]);
  await finoAlPagamento(page, 'US');
  prova('375: riepilogo chiuso in cima con il totale', !(await page.locator('[data-ck-riep]').evaluate((d) => d.open)) && /€/.test(await testo(page, '[data-ck-riep-tot]')));
  const atteso = calculateTotals([MISTO[0]], { country: 'US' });
  const tot = await page.locator('[data-ck-conto] .conto__riga--tot dd').textContent();
  prova(`USA: totale ${atteso.totalCents / 100} € come il core`, Math.round(euro(tot) * 100) === atteso.totalCents, tot);
  prova('USA: nota dazi nel riepilogo', await page.locator('[data-ck-dazi]').evaluate((e) => !e.hidden));
  await spunta(page, 'form[data-form="payment"] input[value="installments"]');
  await page.waitForTimeout(200);
  prova('rate: campi carta nascosti', !(await page.locator('[data-ck-carta]').isVisible()));
  await spunta(page, 'form[data-form="payment"] [name=acceptTerms]');
  await page.locator('[data-ck-paga]').click();
  await page.waitForSelector('[data-ck-pan="confirmation"]:not([hidden])', { timeout: 8000 });
  const pag = await testo(page, '[data-ck-pagato]');
  prova('rate: ordine confermato con 3 rate', /rata/i.test(pag), pag);
  await page.waitForTimeout(800);
  const em = await page.evaluate(() => { const f = document.querySelector('[data-ck-email-frame]'); return { w: f.contentDocument.documentElement.scrollWidth, fw: f.clientWidth }; });
  prova('375: email senza scorrimento orizzontale', em.w <= em.fw, JSON.stringify(em));
  prova('console pulita (rate)', errori.length === 0, errori.join(' | '));
  await ctx.close();
}
{
  // Indietro / Avanti del browser fra i passi, ricarica a metà, conferma
  const { ctx, page, errori } = await nuovo(390, 844, MISTO);
  await finoAlPagamento(page, 'IT');
  await page.evaluate(() => { window.__pl = 0; document.addEventListener('astro:page-load', () => window.__pl++); });
  await page.goBack(); await page.waitForTimeout(500);
  prova('Indietro del browser dal pagamento → Spedizione', (await passo(page)) === 'shipping' && page.url().endsWith('/it/checkout/'));
  await page.goBack(); await page.waitForTimeout(500);
  prova('Indietro ancora → I tuoi dati', (await passo(page)) === 'details');
  await page.goForward(); await page.waitForTimeout(400); await page.goForward(); await page.waitForTimeout(500);
  prova('Avanti, Avanti → di nuovo Pagamento', (await passo(page)) === 'payment');
  prova('Indietro/Avanti non rifanno la pagina', (await page.evaluate(() => window.__pl)) === 0);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  prova('ricarica a metà: resta al Pagamento con i dati', (await passo(page)) === 'payment' && (await page.locator('form[data-form="details"] [name=email]').inputValue()) === DATI.email);
  await page.locator('[data-passo="details"]').click().catch(() => {});
  await page.waitForTimeout(300);
  prova('la riga dei passi riporta a "I tuoi dati"', (await passo(page)) === 'details');
  await page.goForward(); await page.waitForTimeout(400); await page.goForward(); await page.waitForTimeout(500);
  prova('il clic sul passo segue la storia: Avanti torna al Pagamento', (await passo(page)) === 'payment');
  await page.click('[data-ck-carta-prova]');
  prova('"Usa la carta di prova" riempie la carta 4242', (await page.locator('[name=number]').inputValue()).replace(/\s/g, '') === '4242424242424242');
  await spunta(page, 'form[data-form="payment"] [name=acceptTerms]');
  await page.locator('[data-ck-paga]').click();
  await page.waitForSelector('[data-ck-pan="confirmation"]:not([hidden])', { timeout: 8000 });
  await page.goBack(); await page.waitForTimeout(1200);
  prova('Indietro dalla conferma esce dal checkout', !page.url().includes('/checkout/'), page.url());
  prova('console pulita (storia)', errori.length === 0, errori.join(' | '));
  await ctx.close();
}
await browser.close();
console.log(`\n${ok} ok, ${ko} da sistemare`);
process.exit(ko ? 1 : 0);
