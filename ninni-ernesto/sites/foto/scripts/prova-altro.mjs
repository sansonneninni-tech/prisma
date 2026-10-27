const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
// Prova di comportamento del pezzo 6 (Altro, Proposte, Prossimamente). Uso: node scripts/prova-altro.mjs --base http://localhost:4322
import { mkdirSync } from 'node:fs';
const ia = process.argv.indexOf('--base'); const B = ia > 0 ? process.argv[ia + 1].replace(/\/$/, '') : 'http://localhost:4322';
const OUT = '/tmp/claude-0/qa/galleria/pezzo-6/prova/'; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ok = (c, m) => console.log(c ? '✓' : '✗', m);
const errori = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
// banner cookie (pezzo 7): scelta già fatta, così non copre i comandi in basso
await ctx.addInitScript(() => { try { localStorage.setItem('galleria:cookie:v1', JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'prova' })); } catch {} });
const p = await ctx.newPage(); p.on('console', (m) => m.type() === 'error' && errori.push(m.text())); p.on('pageerror', (e) => errori.push(String(e)));

// Altro → hover miniatura
await p.goto(B + '/it/altro/'); await p.hover('.al__v:nth-child(2) .al__a'); await p.waitForTimeout(450);
await p.screenshot({ path: OUT + 'altro_hover_1440.png' });
ok(await p.$eval('.al__v:nth-child(2) .al__mini .isa-picture', (e) => ['0px', '0px 0px', 'none'].includes(getComputedStyle(e).translate)), 'A12 miniatura al passaggio'); // 22/10 «animazioni fluide»: la cornice arriva dall'angolo con translate (prima clip-path sul riquadro)
// ClientRouter: Altro → Prossimamente
await p.click('.al__v:nth-child(2) .al__a'); await p.waitForURL('**/prossimamente/'); await p.waitForTimeout(300);
ok(await p.$$eval('[data-px-voce][data-aperta]', (x) => x.length) === 0, 'voci chiuse all’arrivo');
await p.click('#vasi [data-px-b]'); await p.waitForTimeout(150); await p.screenshot({ path: OUT + 'a11_150ms.png' }); await p.waitForTimeout(700);
ok(new URL(p.url()).hash === '#vasi', 'URL con #vasi dopo apertura (' + p.url() + ')');
ok(await p.$eval('#vasi [data-px-b]', (e) => e.getAttribute('aria-expanded')) === 'true', 'aria-expanded true');
ok((await p.$eval('header', (h) => [...h.querySelectorAll('a[hreflang]')].map((a) => a.getAttribute('href')).join(' '))).includes('#vasi'), 'link lingua seguono #vasi');
await p.$eval('#vasi', (e) => e.scrollIntoView()); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + 'vasi_aperto_1440.png' });
// striscia: tastiera
const s = '#vasi [data-px-striscia]';
await p.focus(s); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
const l1 = await p.$eval(s, (e) => e.scrollLeft); ok(l1 > 100, 'freccia → scorre la striscia (' + l1 + ')');
await p.keyboard.press('Home'); await p.waitForTimeout(600);
ok(await p.$eval(s, (e) => e.scrollLeft) === 0, 'Home torna all’inizio');
// trascinamento
const r = await p.$eval(s, (e) => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + 100 }; });
await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x - 150, r.y, { steps: 5 }); await p.mouse.move(r.x - 300, r.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(700);
const l2 = await p.$eval(s, (e) => e.scrollLeft); ok(l2 > 150, 'trascinamento scorre (' + l2 + ')');
// modulo: errori
await p.click('#vasi-form button[type=submit]'); await p.waitForTimeout(200);
await p.screenshot({ path: OUT + 'form_errori_1440.png' });
ok(await p.$$eval('#vasi-form [aria-invalid=true]', (x) => x.length) === 2, 'due errori (email + privacy)');
ok(await p.evaluate(() => document.activeElement?.matches('[data-error-summary]')), 'fuoco al riepilogo');
await p.fill('#vasi-form-email', 'prova@esempio'); await p.waitForTimeout(50);
ok(await p.$eval('#vasi-form-email', (e) => e.getAttribute('aria-invalid')) === 'true', 'email incompleta resta in errore');
await p.fill('#vasi-form-email', 'prova@esempio.it');
ok(await p.$eval('#vasi-form-email', (e) => !e.hasAttribute('aria-invalid')), 'errore email via appena a posto');
await p.check('#vasi-form-privacy');
ok(await p.$eval('#vasi-form [data-error-summary]', (e) => e.hidden), 'riepilogo via quando tutto a posto');
await p.click('#vasi-form button[type=submit]'); await p.waitForTimeout(200);
ok(await p.$eval('#vasi [data-px-ok]', (e) => !e.hidden && e.textContent.includes('prova@esempio.it')), 'conferma demo con email');
await p.screenshot({ path: OUT + 'form_ok_1440.png' });
// chiudi: hash via
await p.click('#vasi [data-px-b]'); await p.waitForTimeout(600);
ok(new URL(p.url()).hash === '', 'chiudendo, l’àncora sparisce');
ok(await p.$eval('#vasi [data-px-pan]', (e) => getComputedStyle(e).visibility === 'hidden'), 'pannello chiuso nascosto (visibility)');
// Proposte: àncora + aggiungi stampa
await p.goto(B + '/it/proposte/'); await p.click('.pr__ia >> nth=2'); await p.waitForTimeout(800);
const top = await p.$eval('#smeraldo-oro', (e) => Math.round(e.getBoundingClientRect().top));
ok(top > 40 && top < 120, 'àncora #smeraldo-oro sotto l’header (' + top + ')');
await p.click('#rosso-notte [data-pr-btn]'); await p.waitForTimeout(400);
const n = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('cart')) ?? 'x') ?? 'null'));
ok(JSON.stringify(n ?? '').includes('10'), 'stampa nel carrello (storage)');
ok(await p.$eval('#rosso-notte [data-pr-nota]', (e) => !e.hidden), '«Nel carrello: 1» visibile');
ok((await p.textContent('.conta')).includes('1'), 'contatore header 1');
await p.$eval('#rosso-notte', (e) => e.scrollIntoView()); await p.waitForTimeout(200);
await p.screenshot({ path: OUT + 'proposte_carrello_1440.png' });
// Avvisami dall'oggetto → prossimamente#candele aperta (ClientRouter)
await p.click('#rosso-notte .pz__avvisami'); await p.waitForURL('**/prossimamente/#candele-the-moon'); await p.waitForTimeout(800);
ok(await p.$eval('#candele-the-moon', (e) => e.hasAttribute('data-aperta')), 'arrivo con #candele-the-moon: voce aperta');
const t2 = await p.$eval('#candele-the-moon', (e) => Math.round(e.getBoundingClientRect().top));
ok(t2 >= 0 && t2 < 200, 'scroll alla voce (' + t2 + ')');
await p.screenshot({ path: OUT + 'arrivo_candele_1440.png' });
// Indietro → proposte
await p.goBack(); await p.waitForTimeout(800); ok(p.url().includes('/proposte/'), 'Indietro torna a Proposte');
// cambio lingua conserva l'àncora
await p.goto(B + '/it/prossimamente/#abiti-dipinti'); await p.waitForTimeout(300);
await p.click('header a[hreflang="en"]'); await p.waitForTimeout(800);
ok(p.url().endsWith('/en/prossimamente/#abiti-dipinti') && await p.$eval('#abiti-dipinti', (e) => e.hasAttribute('data-aperta')), 'EN con la stessa voce aperta');
ok(errori.length === 0, 'console pulita ' + errori.join(' | '));
await b.close();
