#!/usr/bin/env node
/**
 * Galleria — controllo visivo e responsive (copiato da Casa e adattato; riusabile da tutti i pezzi e dai revisori).
 *
 * Per ogni URL × larghezza (320, 375, 430, 768, 1024, 1280, 1440, 1920):
 *   - screenshot (pagina intera, o solo viewport con --viewport)
 *   - OVERFLOW: scroll orizzontale della pagina ed elementi oltre il bordo destro
 *   - TOCCO: bersagli interattivi < 44 px (sotto 768 px è errore, da 768 a 1023 avviso);
 *            l'area reale si misura con elementFromPoint, così conta anche un ::after che allarga il bersaglio
 *   - SOVRAPPOSIZIONI: elementi interattivi che si coprono fra loro
 *   - TAGLIATI: testi con ellissi o tagliati da overflow:hidden (avviso)
 *   - FONT: Inter Tight caricato davvero (document.fonts)
 *
 * Uso (il sito deve girare: `npm run dev -w sites/galleria` oppure `npm run preview -w sites/galleria`, porta 4322):
 *   node sites/galleria/scripts/qa.mjs --base http://localhost:4322 --urls /it/,/en/,/zh/ --nome galleria/pezzo-2
 * Opzioni:
 *   --base URL          server (default http://localhost:4322)
 *   --urls a,b,c        percorsi (default /it/,/en/,/zh/)
 *   --larghezze a,b     sottoinsieme delle 8 larghezze
 *   --nome NOME         sottocartella dei risultati in /tmp/claude-0/qa/NOME (default "galleria/qa")
 *   --out DIR           cartella risultati (vince su --nome)
 *   --viewport          screenshot solo della finestra (default: pagina intera)
 *   --con-overlay       non pre-impostare cookie e lingua (mostra il banner cookie)
 *   --orizzontale       telefono in orizzontale: 667×375, 844×390, 932×430 (al posto delle 8 larghezze)
 *   --carrello N        mette N stampe finte nel carrello prima del caricamento (per «Carrello (n)» a 2 cifre)
 *   --storage k=v       valore in localStorage prima del caricamento (ripetibile; v è testo semplice)
 *   --click SELETTORE   clic prima dello screenshot (es. "[data-indice-apri]"); ripetibile, in ordine
 *   --scroll N          scorre di N px prima dello screenshot
 *   --lingua-browser xx lingua del browser (default it-IT)
 *   --ridotto           prefers-reduced-motion: reduce
 *   --attesa MS         attesa dopo il caricamento/azioni (default 400)
 *   --azioni FILE.mjs   modulo con `export default async (page, { url, larghezza }) => {}` eseguito dopo i clic
 *                       (per stati che chiedono di scrivere nei campi, es. i passi del checkout: scripts/qa-azioni/)
 * Esce con codice 1 se trova errori (overflow, tocco < 44 sotto 768, sovrapposizioni, font mancanti, console).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const LARGHEZZE = [320, 375, 430, 768, 1024, 1280, 1440, 1920];
const ALTEZZE = { 320: 568, 375: 812, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };

function args(argv) {
  const o = { base: 'http://localhost:4322', urls: ['/it/', '/en/', '/zh/'], larghezze: LARGHEZZE, nome: 'galleria/qa', out: null, orizzontale: false, carrello: 0,
    viewport: false, overlay: false, storage: [], click: [], scroll: 0, linguaBrowser: 'it-IT', ridotto: false, attesa: 400, azioni: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => argv[++i];
    if (a === '--base') o.base = v().replace(/\/$/, '');
    else if (a === '--urls') o.urls = v().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--larghezze') o.larghezze = v().split(',').map(Number);
    else if (a === '--nome') o.nome = v();
    else if (a === '--out') o.out = v();
    else if (a === '--viewport') o.viewport = true;
    else if (a === '--con-overlay') o.overlay = true;
    else if (a === '--storage') o.storage.push(v());
    else if (a === '--click') o.click.push(v());
    else if (a === '--scroll') o.scroll = Number(v());
    else if (a === '--lingua-browser') o.linguaBrowser = v();
    else if (a === '--ridotto') o.ridotto = true;
    else if (a === '--attesa') o.attesa = Number(v());
    else if (a === '--azioni') o.azioni = v();
    else if (a === '--orizzontale') o.orizzontale = true;
    else if (a === '--carrello') o.carrello = Number(v());
    else if (a === '--help' || a === '-h') { console.log('Vedi l\'intestazione di scripts/qa.mjs'); process.exit(0); }
  }
  o.out ??= join('/tmp/claude-0/qa', o.nome);
  return o;
}

/** Eseguito nella pagina: restituisce i problemi trovati. */
async function controlla({ larghezza }) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const out = { overflow: [], tocco: [], sovrapposizioni: [], tagliati: [], font: {}, scrollOrizzontale: 0 };
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const cls = [...el.classList].slice(0, 2).join('.');
    if (cls) s += `.${cls}`;
    const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return txt ? `${s} «${txt}»` : s;
  };
  const visibile = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (el.closest('[hidden], [inert], dialog:not([open]), [aria-hidden="true"]')) return false;
    // contenuto di un <details> chiuso (tranne il suo <summary>)
    const d = el.closest('details:not([open])');
    return !d || !!el.closest('summary');
  };
  // un antenato con overflow diverso da visible "taglia" il contenuto: lì lo sforamento non crea scroll
  const tagliatoDaAntenato = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1) return true;
      }
      if (cs.position === 'fixed') return false;
    }
    return false;
  };

  out.scrollOrizzontale = Math.max(0, document.documentElement.scrollWidth - vw);
  for (const el of document.body.querySelectorAll('*')) {
    if (!visibile(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !tagliatoDaAntenato(el)) out.overflow.push(`${desc(el)} → right ${Math.round(r.right)} > ${vw}`);
    if (r.left < -1 && !tagliatoDaAntenato(el) && getComputedStyle(el).position !== 'fixed') out.overflow.push(`${desc(el)} → left ${Math.round(r.left)} < 0`);
  }
  out.overflow = out.overflow.slice(0, 30);

  // testi tagliati (ellissi o overflow nascosto su un elemento con testo)
  for (const el of document.body.querySelectorAll('*')) {
    if (!visibile(el) || !el.childNodes.length || el.getBoundingClientRect().width <= 1) continue;
    const haTesto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!haTesto) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.tagliati.push(desc(el));
  }

  // bersagli di tocco
  const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])';
  // con un dialog modale aperto (menu mobile…) il resto della pagina è inerte: si controlla solo il dialog
  const modale = document.querySelector('dialog:modal');
  const interattivi = [...document.querySelectorAll(SEL)].filter((el) => visibile(el) && !el.disabled && (!modale || modale.contains(el)));
  const colpisce = (el, x, y) => {
    if (x < 0 || y < 0 || x >= vw || y >= vh) return null; // fuori dalla finestra: non si può verificare
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || (el.labels && [...el.labels].some((l) => l.contains(hit))));
  };
  for (const el of interattivi) {
    const r = el.getBoundingClientRect();
    if (larghezza >= 1024) break; // da 1024: puntatore, il controllo non serve
    if (r.width >= 44 && r.height >= 44) continue;
    // link in mezzo a una frase: eccezione WCAG 2.5.8 (inline)
    const p = el.parentElement;
    if (el.tagName === 'A' && p && /^(P|LI|SPAN)$/.test(p.tagName) && [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3)) continue;
    // fila contigua di bersagli (pallini-smalto nelle card strette): alti 44, larghi ≥ 24 e senza spazi morti fra loro.
    // Eccezione voluta e documentata (revisione 4–5, WCAG 2.5.8): non è un errore
    if (el.closest('[data-tocco-fila]') && r.width >= 24 && r.height >= 44) continue;
    // area reale: si porta l'elemento in vista e si sonda a ±22 px dal centro
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const q = el.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const larg = q.width >= 44 || (colpisce(el, cx - 21.5, cy) !== false && colpisce(el, cx + 21.5, cy) !== false);
    const alt = q.height >= 44 || (colpisce(el, cx, cy - 21.5) !== false && colpisce(el, cx, cy + 21.5) !== false);
    if (!larg || !alt) out.tocco.push(`${desc(el)} ${Math.round(q.width)}×${Math.round(q.height)}`);
  }
  window.scrollTo(0, 0);
  // l'header che si ritira (A10) torna al suo posto dopo l'evento scroll + transizione: si aspetta prima di misurare
  await new Promise((r) => setTimeout(r, 450));

  // sovrapposizioni fra interattivi (stessa "pila": si ignorano antenato/discendente e label↔input)
  // rettangolo visibile: tagliato dagli antenati che scorrono o nascondono (es. il corpo del menu mobile)
  const rettVisibile = (el) => {
    const b = el.getBoundingClientRect();
    let r = { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const q = p.getBoundingClientRect();
        r = { left: Math.max(r.left, q.left), right: Math.min(r.right, q.right), top: Math.max(r.top, q.top), bottom: Math.min(r.bottom, q.bottom) };
      }
    }
    return r;
  };
  // dentro una barra fissa (es. barra mobile di scheda e carrello): il contenuto le scorre sotto per scelta
  const dentroFisso = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (p.matches('dialog')) return false; if (getComputedStyle(p).position === 'fixed') return true; } return false; };
  const rects = interattivi.map((el) => ({ el, r: rettVisibile(el) })).filter(({ r }) => r.right - r.left > 1 && r.bottom - r.top > 1)
    .filter(({ el, r }) => getComputedStyle(el).position !== 'fixed' && (modale || !dentroFisso(el)) && (modale || !el.closest('dialog, [popover], [data-cookie]'))
      && r.bottom > 0 && r.top < vh); // solo ciò che si vede nella finestra
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 1 && h > 1) out.sovrapposizioni.push(`${desc(a.el)} ⟷ ${desc(b.el)} (${Math.round(w)}×${Math.round(h)})`);
  }

  out.font = {
    inter: document.fonts.check('560 20px "Inter Tight"') && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Inter Tight' && f.status === 'loaded'),
    caricati: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.style} ${f.weight}`),
    bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0],
    displayFont: (() => { const d = document.querySelector('.t-display, h1'); return d ? getComputedStyle(d).fontFamily.split(',')[0] : null; })(),
  };
  out.larghezza = larghezza;
  return out;
}

const o = args(process.argv.slice(2));
await mkdir(o.out, { recursive: true });
const azioni = o.azioni ? (await import(new URL(o.azioni, `file://${process.cwd()}/`).href)).default : null;
const browser = await chromium.launch({ executablePath: undefined });
const report = [];
let errori = 0;

const MISURE = o.orizzontale ? [[667, 375], [844, 390], [932, 430]] : o.larghezze.map((w) => [w, ALTEZZE[w] ?? 900]);
for (const url of o.urls) {
  for (const [w, altezza] of MISURE) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: altezza },
      deviceScaleFactor: 1,
      locale: o.linguaBrowser,
      reducedMotion: o.ridotto ? 'reduce' : 'no-preference',
      hasTouch: w < 1024 || o.orizzontale,
      isMobile: w < 1024 || o.orizzontale, // barre di scorrimento sovrapposte, come su telefono e tablet
    });
    const storage = Object.fromEntries(o.storage.map((s) => { const k = s.indexOf('='); return [s.slice(0, k), s.slice(k + 1)]; }));
    if (!o.overlay) {
      storage['galleria:cookie:v1'] ??= JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'qa' });
      storage['isa:lang'] ??= url.split('/').filter(Boolean)[0] || 'it';
    }
    // stampe finte (righe da massimo 5, il massimo del core per riga) per vedere «Carrello (n)» con n a una o due cifre
    if (o.carrello) storage['isa:cart:v1'] ??= JSON.stringify(Array.from({ length: Math.ceil(o.carrello / 5) }, (_, i) => ({ kind: 'print', artworkId: '21', slug: 'onde-interne', title: 'Onde Interne', unitPriceCents: 28060, quantity: Math.min(5, o.carrello - i * 5), print: { formatId: `qa${i}`, materialId: 'qa', label: 'QA' } })));
    await ctx.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch {} }, storage);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(o.base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const sel of o.click) { await page.click(sel); await page.waitForTimeout(500); }
    if (azioni) await azioni(page, { url, larghezza: w });
    if (o.scroll) { await page.mouse.wheel(0, o.scroll); await page.waitForTimeout(300); await page.evaluate((y) => window.scrollTo(0, y), o.scroll); }
    await page.waitForTimeout(o.attesa);
    const r = await page.evaluate(controlla, { larghezza: w });
    const nome = `${url.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root'}_${w}${o.orizzontale ? `x${altezza}` : ''}.png`;
    if (o.scroll) await page.evaluate((y) => window.scrollTo(0, y), o.scroll);
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(o.out, nome), fullPage: !o.viewport && !o.click.length && !o.scroll });
    r.url = url; r.screenshot = join(o.out, nome); r.erroriConsole = errs;
    const toccoErr = w < 768 ? r.tocco : [];
    const fontKo = !r.font.inter;
    const n = (r.scrollOrizzontale > 0 ? 1 : 0) + r.overflow.length + toccoErr.length + r.sovrapposizioni.length + (fontKo ? 1 : 0) + errs.length;
    errori += n;
    const segno = n ? '✗' : '✓';
    console.log(`${segno} ${url} @${w}: scrollX ${r.scrollOrizzontale} · oltre bordo ${r.overflow.length} · tocco<44 ${r.tocco.length}${w >= 768 && r.tocco.length ? ' (avviso)' : ''} · sovrapp. ${r.sovrapposizioni.length} · tagliati ${r.tagliati.length} · font ${fontKo ? 'NO' : 'ok'} · console ${errs.length}`);
    for (const k of ['overflow', 'tocco', 'sovrapposizioni', 'tagliati']) for (const x of r[k].slice(0, 8)) console.log(`    ${k}: ${x}`);
    for (const x of errs.slice(0, 5)) console.log(`    console: ${x}`);
    report.push(r);
    await ctx.close();
  }
}
await browser.close();
await writeFile(join(o.out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`\n${errori ? `✗ ${errori} problemi` : '✓ nessun problema'} — screenshot e report.json in ${o.out}`);
process.exit(errori ? 1 : 0);
