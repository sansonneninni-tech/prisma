/**
 * Ninni & Ernesto — prova del flusso d'acquisto: edizione limitata (Tulipano) + stampa con carta e cornice (Pugno),
 * prezzo che cambia con le scelte, carrello (cassetto e pagina), checkout fino alla conferma con la carta 4242.
 * Uso: node scripts/prova-flusso-ne.mjs --base http://localhost:4330 [--out DIR]
 */
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const a = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const B = a('--base', 'http://localhost:4330').replace(/\/$/, '');
const OUT = a('--out', null);
let ko = 0;
const ok = (c, m) => { if (!c) ko++; console.log(c ? '✓' : '✗', m); };
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
  await ctx.addInitScript(() => { try { localStorage.setItem('galleria:cookie:v1', JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'prova' })); } catch {} });
  const p = await ctx.newPage();
  const errori = []; p.on('pageerror', (e) => errori.push(String(e))); p.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  const shot = async (n) => OUT && p.screenshot({ path: `${OUT}/${n}_${w}.png` });
  // edizione
  await p.goto(B + '/it/ninni/tulipano/', { waitUntil: 'networkidle' });
  // audit 28/10: si apre su Stampa, l'edizione limitata è la seconda scheda
  ok(await p.locator('[role=tab][aria-selected=true]').getAttribute('data-v') === 's', `${w}: la scheda si apre su Stampa`);
  // anteprima: la cornice scelta cambia la foto, la didascalia e la figura in scala
  const vb0 = await p.locator('[data-scala] svg').getAttribute('viewBox');
  await p.locator('[data-acq-form="s"] input[name="cornice"][value="walnut"]').check({ force: true }); await p.waitForTimeout(200);
  const dida = await p.locator('[data-anteprima-dida]').textContent();
  ok(await p.locator('[data-anteprima]').getAttribute('data-cornice') === 'walnut' && /noce/.test(dida) && vb0 !== await p.locator('[data-scala] svg').getAttribute('viewBox'), `${w}: anteprima e figura in scala seguono la cornice (${dida})`);
  await p.locator('[data-acq-form="s"] input[name="cornice"][value="none"]').check({ force: true });
  // lente: clic (tocco) sulla foto la apre, secondo clic la chiude
  await p.locator('[data-anteprima]').click({ position: { x: 60, y: 80 } }); await p.waitForTimeout(300);
  const lenteSu = await p.locator('[data-lente]').isVisible();
  await p.locator('[data-anteprima]').click({ position: { x: 60, y: 80 } }); await p.waitForTimeout(200);
  ok(lenteSu && !(await p.locator('[data-lente]').isVisible()), `${w}: lente si apre e si chiude`);
  await p.locator('#sk-tab-o').click(); await p.waitForTimeout(200);
  ok(await p.locator('.ed__s--attuale').count() === 1, `${w}: scala dell'edizione con lo scalino attuale`);
  await p.locator('[data-acq-form="o"] [data-acq-btn]').click(); await p.waitForTimeout(700);
  await shot('cassetto');
  const n1 = await p.evaluate(() => JSON.parse(localStorage.getItem('ne:cart:v1') || '[]').length);
  ok(n1 === 1, `${w}: edizione nel carrello (${n1})`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // stampa con cornice
  await p.goto(B + '/it/ninni/pugno/', { waitUntil: 'networkidle' });
  const prezzo = () => p.locator('[data-acq-form="s"] [data-acq-prezzo]').textContent();
  const p0 = await prezzo();
  await p.locator('[data-acq-form="s"] input[name="cornice"][value="oak"]').check({ force: true }); await p.waitForTimeout(150);
  const p1 = await prezzo();
  await p.locator('[data-acq-form="s"] input[name="supporto"][value="baryta"]').check({ force: true }); await p.waitForTimeout(150);
  const p2 = await prezzo();
  ok(p0 !== p1 && p1 !== p2, `${w}: prezzo stampa ${p0} → rovere ${p1} → baryta ${p2}`);
  await shot('stampa');
  await p.locator('[data-acq-form="s"] [data-acq-btn]').click(); await p.waitForTimeout(700);
  const righe = await p.evaluate(() => JSON.parse(localStorage.getItem('ne:cart:v1') || '[]').map((r) => r.key));
  ok(righe.length === 2 && righe.some((k) => /oak/.test(k)), `${w}: stampa con rovere nel carrello (${righe.join(', ')})`);
  // pagina carrello
  await p.goto(B + '/it/carrello/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  await shot('carrello');
  const testo = await p.locator('main').innerText();
  ok(!/IVA/i.test(testo), `${w}: carrello senza righe IVA`);
  ok(/Rovere/i.test(testo) && /Baryta/i.test(testo), `${w}: carrello mostra carta e cornice`);
  // checkout
  await p.goto(B + '/it/checkout/', { waitUntil: 'networkidle' });
  const f = p.locator('form[data-form="details"]');
  const D = { email: 'prova@example.com', phone: '+39 333 123 4567', firstName: 'Anna', lastName: 'Bianchi', address1: 'Via Roma 1', postalCode: '20121', city: 'Milano' };
  for (const [k, v] of Object.entries(D)) await f.locator(`[name="${k}"]`).fill(v);
  await f.locator('select[name="country"]').selectOption('IT');
  await f.locator('button[type=submit]').click();
  await p.locator('form[data-form="shipping"] button[type=submit]').click();
  await p.waitForSelector('[data-ck-pan="payment"]:not([hidden])');
  const pf = p.locator('form[data-form="payment"]');
  await pf.locator('[name=number]').fill('4242 4242 4242 4242'); await pf.locator('[name=expiry]').fill('12/30');
  await pf.locator('[name=cvc]').fill('123'); await pf.locator('[name=holder]').fill('Anna Bianchi');
  await p.evaluate(() => { const x = document.querySelector('form[data-form="payment"] [name=acceptTerms]'); x.checked = true; x.dispatchEvent(new Event('change', { bubbles: true })); });
  await shot('pagamento');
  await pf.locator('[data-ck-paga]').click();
  await p.waitForFunction(() => document.querySelector('[data-checkout]')?.getAttribute('data-step') === 'confirmation', null, { timeout: 10000 }).catch(() => {});
  await shot('conferma');
  ok(await p.locator('[data-checkout]').getAttribute('data-step') === 'confirmation', `${w}: conferma d'ordine`);
  const ck = await p.locator('main').innerText();
  ok(!/IVA|Isabella|quadr/i.test(ck), `${w}: conferma senza IVA né testi del vecchio sito`);
  ok(errori.length === 0, `${w}: console pulita ${errori.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close();
console.log(ko ? `${ko} da sistemare` : 'tutto a posto');
process.exit(ko ? 1 : 0);
