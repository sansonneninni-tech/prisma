const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
// Prova di comportamento del pezzo 8 (movimento): zoom A1/A2, Indietro, cambio lingua, scroll nativo, cursore A7,
// riduci movimento, telefono. Uso: node scripts/prova-movimento.mjs --base http://localhost:4322
// Si contano le animazioni della view transition sugli pseudo-elementi e quelle della «camera» sulla mappa.
// Aggiornata il 22/10 (audit di ninni, lavoro_ninni_2): lo zoom non anima più le istantanee per 1 s ma la mappa vera
// (camera 0,65 s + velo del pannello); la view transition fa solo la dissolvenza di 0,15 s (A1) o un taglio (A2).
// Correzioni n4 (22/10): A1 è un taglio e l'h1 parte dal titolo del pannello (FLIP 0,3 s, solo transform); A2 tiene
// l'istantanea della pagina lasciata (new(root) a opacità 0, tolta quando parte la camera) per due fotogrammi.
// Lavoro «animazioni fluide» (22/10): A1 si monta senza view transition (taglio come prima, ma senza l'istantanea:
// «vt nessuna» resta vero) e A2 fa partire il titolo del pannello da dove era l'h1 (controllo «titolo A2 dall'h1»).
// Lenis è stato tolto apposta: la prova della «rotella morbida» è diventata «rotella nativa».
const ia = process.argv.indexOf('--base'); const B = ia > 0 ? process.argv[ia + 1].replace(/\/$/, '') : 'http://localhost:4322';
const b = await chromium.launch();
let ko = 0;
const ok = (c, m) => { if (!c) ko++; console.log(c ? '✓' : '✗', m); };
const errori = [];
async function nuova(w, h, o = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...o });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('galleria:cookie:v1', JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'prova' })); } catch {}
    // registro dei cambi pagina: modo dello zoom e animazioni degli pseudo-elementi
    window.__cambi = [];
    // camera sulla mappa: A1 parte al clic (prima del cambio pagina), A2 dopo il montaggio della home
    const camera = () => document.getAnimations().filter((a) => a.effect?.target?.classList?.contains('mappa'))
      .map((a) => Math.round(a.effect.getTiming().duration));
    let cam = [];
    // A2: il titolo del pannello al primo fotogramma della camera deve stare dove era l'h1 della pagina lasciata
    const testo = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
    let h1Via = null;
    document.addEventListener('astro:before-preparation', () => { const h = document.querySelector('main h1'); h1Via = h ? { t: h.textContent.trim(), r: testo(h) } : null; });
    document.addEventListener('galleria:zoom-parte', () => {
      cam = camera();
      if (document.documentElement.dataset.zoom === 'fuori' && h1Via) {
        const da = h1Via;
        const span = [...document.querySelectorAll('.pan__t span')].find((x) => x.textContent.trim() === da.t);
        if (span) { const r = testo(span); window.__titoloA2 = Math.round(Math.max(Math.abs(r.left - da.r.left), Math.abs(r.top - da.r.top), Math.abs(r.height - da.r.height))); }
      }
      // A2: la camera parte dopo il montaggio (due fotogrammi dopo): va al cambio pagina appena registrato
      const ult = window.__cambi.at(-1);
      if (ult && ult.zoom === 'fuori' && !ult.camera.length) { ult.camera = cam; cam = []; }
    });
    // A1: FLIP dell'h1 della pagina nuova (durata e scala di partenza)
    // dal 22/10 (correzioni di fluidità n7, 1b) il FLIP nasce nel primo fotogramma della pagina nuova (rAF chiesto da
    // movimento.ts in after-swap): si legge in un rAF chiesto dopo il suo, nello stesso fotogramma
    document.addEventListener('astro:after-swap', () => queueMicrotask(() => requestAnimationFrame(() => {
      const ult = window.__cambi.at(-1);
      const h = document.querySelector('main h1');
      const a = h?.getAnimations().find((x) => x.effect?.getKeyframes()[0]?.transform);
      if (ult && a) ult.titolo = `${Math.round(a.effect.getTiming().duration)}`;
    }))); // dopo l'ascoltatore di movimento.ts, che crea il FLIP
    document.addEventListener('astro:before-swap', (e) => {
      const r = { zoom: document.documentElement.dataset.zoom ?? '', anim: [], camera: cam };
      cam = [];
      window.__cambi.push(r);
      document.addEventListener('astro:after-swap', () => { if (!r.camera.length) r.camera = camera(); }, { once: true });
      e.viewTransition?.ready.then(() => requestAnimationFrame(() => {
        r.anim = document.getAnimations().filter((a) => /view-transition-(old|new)\(root\)/.test(a.effect?.pseudoElement ?? ''))
          .map((a) => `${a.effect.pseudoElement.includes('old') ? 'old' : 'new'}:${Math.round(a.effect.getTiming().duration)}`).sort();
      }));
    });
  });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errori.push(m.text()));
  p.on('pageerror', (e) => errori.push(String(e)));
  return p;
}
const ultimo = (p) => p.evaluate(() => window.__cambi.at(-1) ?? null);
const centro = (p, s) => p.$eval(s, (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + Math.min(r.height / 2, 120)]; });

/* 1. A1 / A2 a 1440 con mouse */
let p = await nuova(1440, 900);
await p.goto(B + '/it/#indice', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const yMappa = await p.evaluate(() => scrollY);
let [x, y] = await centro(p, 'a[data-zoom="opere"]');
await p.mouse.move(x, y); await p.waitForTimeout(400);
ok(await p.$eval('[data-cur]', (e) => getComputedStyle(e).opacity === '1' && e.textContent === 'Apri'), 'A7 «Apri» sul pannello');
await p.mouse.click(x, y); await p.waitForTimeout(1500);
let c = await ultimo(p);
ok(p.url().endsWith('/it/opere/') && c?.zoom === 'dentro', `A1 mappa → Opere (zoom ${c?.zoom})`);
// 22/10: la camera sulla mappa vera (0,65 s), poi la pagina compare in 0,15 s; l'istantanea vecchia non si muove
ok(c && c.camera.join() === '650' && c.anim.length === 0 && c.titolo === '300', `A1 camera 0,65 s sulla mappa, taglio e titolo al suo posto in 0,3 s (camera ${c?.camera.join()}, vt ${c?.anim.join(' ') || 'nessuna'}, titolo ${c?.titolo})`);
ok(await p.evaluate(() => !document.documentElement.dataset.zoom && scrollY === 0), 'A1 finita: niente data-zoom, pagina in cima');
// Indietro → A2 verso la mappa, allo stesso punto
await p.goBack(); await p.waitForTimeout(1600);
c = await ultimo(p);
ok(c?.zoom === 'fuori' && c.camera.join() === '650' && c.anim.every((x) => x === 'new:1500'), `Indietro → A2: pagina lasciata tenuta, taglio e camera 0,65 s (zoom ${c?.zoom}, camera ${c?.camera.join()}, vt ${c?.anim.join(' ') || 'nessuna'})`);
const sc = await p.evaluate(() => window.__titoloA2);
ok(typeof sc === 'number' && sc <= 2, `titolo A2 dall'h1: al primo fotogramma della camera il titolo è dove era l'h1 (scarto ${sc} px)`);
ok(Math.abs((await p.evaluate(() => scrollY)) - yMappa) <= 2, `Indietro: mappa allo stesso punto (${yMappa})`);
// «Indice» da Isabella → A2
await p.goto(B + '/it/isabella/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
await p.click('.hd__idx-link'); await p.waitForTimeout(1600);
c = await ultimo(p);
ok(c?.zoom === 'fuori' && new URL(p.url()).hash === '#indice', `«Indice» → A2 (${c?.zoom})`);
ok(Math.abs((await p.evaluate(() => scrollY)) - yMappa) <= 2, 'mappa in vista dopo A2');
// link della riga sotto la tavola (Proposte di Isa) → A1 dal pannello Altro
await p.click('.mappa__riga a[href="/it/proposte/"]'); await p.waitForTimeout(1500);
c = await ultimo(p);
ok(p.url().endsWith('/it/proposte/') && c?.zoom === 'dentro', `riga sotto la tavola → A1 (${c?.zoom})`);
// pagina senza pannello (Info) → dissolvenza
await p.goto(B + '/it/info/', { waitUntil: 'networkidle' });
await p.click('.hd__idx-link'); await p.waitForTimeout(800);
c = await ultimo(p);
ok(c?.zoom === '' && c.anim.join(' ') === 'new:300 old:300', `Info → mappa: dissolvenza 0,3 s (${c?.anim.join(' ')})`);
// apertura (mappa non in vista) → scheda: dissolvenza, niente zoom
await p.goto(B + '/it/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
await p.click('[data-seq-a]'); await p.waitForTimeout(900);
c = await ultimo(p);
ok(c?.zoom === '' && /\/it\/opere\/[^/]+\/$/.test(p.url()), `opera della sequenza → scheda senza zoom (${p.url()})`);

/* 2. Cambio lingua: stessa pagina, stesso punto, niente zoom */
await p.goto(B + '/it/isabella/', { waitUntil: 'networkidle' });
await p.$eval('#contatti', (e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 300)); await p.waitForTimeout(400);
const daIt = await p.$eval('#contatti', (e) => Math.round(e.getBoundingClientRect().top));
await p.click('header a[data-lingua=en]'); await p.waitForTimeout(1000);
const daEn = await p.$eval('#contatti', (e) => Math.round(e.getBoundingClientRect().top));
c = await ultimo(p);
ok(p.url().endsWith('/en/isabella/') && Math.abs(daEn - daIt) < 80 && c?.zoom === '', `lingua IT → EN resta a Contatti (${daIt} → ${daEn} px dal bordo)`);
await p.mouse.move(700, 450);
// cursore tradotto
await p.goto(B + '/en/opere/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
[x, y] = await centro(p, '[data-card]');
await p.mouse.move(x - 5, y); await p.mouse.move(x, y); await p.waitForTimeout(400);
ok(await p.$eval('[data-cur]', (e) => e.textContent === 'View' && getComputedStyle(e).opacity === '1'), 'A7 «View» su una card in inglese');
await p.mouse.move(x, 30); await p.waitForTimeout(400);
ok(await p.$eval('[data-cur]', (e) => getComputedStyle(e).opacity === '0'), 'A7 sparisce fuori dai bersagli');

/* 3. Scroll nativo (Lenis tolto il 22/10): la rotella sposta subito la pagina; nei dialog scorre il dialog */
await p.goto(B + '/it/opere/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
await p.mouse.move(700, 500); await p.mouse.wheel(0, 600); await p.waitForTimeout(150);
const yFine = await p.evaluate(() => scrollY);
ok(Math.abs(yFine - 600) <= 2, `rotella nativa, niente scorrimento morbido (${yFine} dopo 150 ms)`);
await p.click('[data-filtri-apri]'); await p.waitForTimeout(700);
const yPag = await p.evaluate(() => scrollY);
const fl = await p.$eval('dialog[open]', (d) => { const r = d.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await p.mouse.move(...fl); await p.mouse.wheel(0, 400); await p.waitForTimeout(600);
ok(await p.evaluate(() => scrollY) === yPag, 'filtri aperti: la pagina sotto non scorre');
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
await p.mouse.wheel(0, 300); await p.waitForTimeout(1300);
ok((await p.evaluate(() => scrollY)) > yPag + 250, 'filtri chiusi: la rotella riprende');
await p.context().close();

/* 4. A1 sul telefono (375, tocco): zoom sì, cursore no */
p = await nuova(375, 812, { hasTouch: true, isMobile: true });
await p.goto(B + '/it/#indice', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
ok(await p.$eval('[data-cur]', (e) => getComputedStyle(e).display === 'none'), 'telefono: niente cursore');
await p.tap('a[data-zoom="isabella"]'); await p.waitForTimeout(1500);
c = await ultimo(p);
ok(p.url().endsWith('/it/isabella/') && c?.zoom === 'dentro', `375: A1 dal pannello impilato (${c?.zoom})`);
await p.goBack(); await p.waitForTimeout(1600);
c = await ultimo(p);
ok(c?.zoom === 'fuori', `375: Indietro → A2 (${c?.zoom})`);
await p.context().close();

/* 5. Riduci movimento: solo dissolvenze di 0,2 s, niente camera, sequenza ferma */
p = await nuova(1440, 900, { reducedMotion: 'reduce' });
await p.goto(B + '/it/', { waitUntil: 'networkidle' });
const accesa = () => p.$eval('[data-seq-pic][data-on]', (e) => e.dataset.seqPic ?? e.outerHTML.slice(0, 80)).catch(() => 'prima');
const s0 = await accesa(); await p.waitForTimeout(3000);
ok(s0 === (await accesa()) && (await p.$$eval('.seq button', (x) => x.filter((b) => b.offsetParent).length)) === 0, 'riduci movimento: sequenza ferma, niente Pausa');
await p.goto(B + '/it/#indice', { waitUntil: 'networkidle' });
await p.click('a[data-zoom="opere"]'); await p.waitForTimeout(700);
c = await ultimo(p);
const styleRid = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--d-page'));
ok(c?.zoom === '' && !c.camera.length && c.anim.join(' ') === 'new:200 old:200', `riduci movimento: mappa → Opere in dissolvenza 0,2 s, niente camera (${c?.anim.join(' ')}, --d-page ${styleRid.trim()})`);
await p.mouse.move(700, 500); await p.mouse.wheel(0, 600); await p.waitForTimeout(60);
ok((await p.evaluate(() => scrollY)) === 600, 'riduci movimento: scroll nativo');
await p.goBack(); await p.waitForTimeout(700);
c = await ultimo(p);
ok(c?.zoom === '' && c.anim.join(' ') === 'new:200 old:200', `riduci movimento: Indietro in dissolvenza 0,2 s (${c?.anim.join(' ')})`);
ok(await p.$eval('[data-cur]', (e) => getComputedStyle(e).display === 'none'), 'riduci movimento: niente cursore');
await p.context().close();

ok(errori.length === 0, 'console pulita' + (errori.length ? ': ' + errori.join(' | ') : ''));
console.log(ko ? `${ko} da sistemare` : 'tutto a posto');
await b.close();
process.exit(ko ? 1 : 0);
