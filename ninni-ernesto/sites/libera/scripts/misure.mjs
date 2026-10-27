const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
// Misure di fluidità e peso (audit di ninni 22/10; rifatto per il lavoro «animazioni fluide» 22/10). Uso:
//   node scripts/misure.mjs --base http://localhost:4451 [--solo zoom|video|altre|peso] [--cpu 4]
//     [--viste 1280x832,1440x900] [--pannelli opere,isabella,altro] [--out cartella] [--tracce]
//
// ZOOM (A1 mappa → pagina, A2 Indietro → mappa) con CPU rallentata (CDP Emulation.setCPUThrottlingRate) e traccia
//   Chrome. Si misura quello che arriva davvero allo schermo, non i requestAnimationFrame (un'animazione sul
//   compositore va avanti anche col filo principale occupato):
//   - fotogrammi = Graphics.Pipeline.DrawAndSwap del compositore di schermo (viz) fra l'inizio e la fine del movimento;
//     «> 16,7» = intervallo > 20 ms (almeno un vsync a 60 Hz perso, 3 ms di tolleranza per il jitter), «> 33» = due o
//     più vsync persi;
//   - avvio = dal clic (o da Indietro) al primo fotogramma del movimento (evento galleria:zoom-parte);
//   - filo principale = somma e massimo dei task del filo principale del renderer durante il movimento;
//   - viz = tempo medio di disegno di un fotogramma nel compositore di schermo (qui in software, senza GPU: dipende
//     dalla macchina, non dal codice).
//   La pagina segna con console.timeStamp: z-clic, z-parte (galleria:zoom-parte), z-fine (nessuna animazione attiva).
// VIDEO: registrazione a ogni fotogramma (CDP Page.startScreencast, CPU ×1) dello zoom andata e ritorno; per ogni
//   fotogramma la differenza dal precedente (quanto cambia lo schermo) e la posizione del titolo misurata nella pagina
//   (rettangolo del testo del titolo, trasformazioni comprese: camera e FLIP). Fogli e grafico posizione/tempo in
//   <out>/video/<pannello>_<misura>/. Movimento continuo = differenza mai a zero a metà corsa (niente fermate), senza
//   picchi isolati (niente salti), curva senza scalini.
// ALTRE: le altre animazioni (cassetto, filtri, Indice, dialog AR, lente, fisarmonica, A3, titolo di Opere allo
//   scorrimento, cursore, passaggio sulle opere) con CPU rallentata: fotogrammi e filo principale.
// PESO: home e Opere a 1280×832, prima visita e con cache, rete 10 Mbit/s 40 ms e CPU ×4: LCP, TBT, byte.
import fs from 'node:fs/promises';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const B = arg('--base', 'http://localhost:4451').replace(/\/$/, '');
const CPU = Number(arg('--cpu', '4'));
const solo = arg('--solo', 'zoom');
const VISTE = arg('--viste', '1280x832').split(',').map((v) => v.split('x').map(Number));
const PANNELLI = arg('--pannelli', 'opere,isabella,altro').split(',');
const OUT = arg('--out', '/tmp/claude-0/qa/galleria/misure');
const TRACCE = process.argv.includes('--tracce');
const b = await chromium.launch();
const COOKIE = () => { try { localStorage.setItem('galleria:cookie:v1', JSON.stringify({ necessari: true, statistici: false, marketing: false, data: 'prova' })); } catch {} };
const telefono = (w, h) => Math.min(w, h) < 500;
await fs.mkdir(OUT, { recursive: true });

async function pagina(w, h) {
  const tel = telefono(w, h);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(tel ? { hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : {}) });
  await ctx.addInitScript(COOKIE);
  await ctx.addInitScript(() => {
    window.__lt = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch {}
    window.__lcp = 0;
    try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    // segni per la traccia: clic, inizio del movimento, fine (nessuna animazione attiva e niente data-zoom)
    window.__segni = {};
    const segna = (n) => { window.__segni[n] = performance.now(); console.timeStamp(n); };
    window.__segna = segna;
    window.__attendiFine = () => {
      const giro = () => {
        const attive = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity && !(a.timeline instanceof (window.ScrollTimeline ?? class {})));
        if (window.__segni['z-parte'] && !attive.length && !document.documentElement.dataset.zoom) { segna('z-fine'); return; }
        requestAnimationFrame(giro);
      };
      requestAnimationFrame(giro);
    };
    document.addEventListener('galleria:zoom-parte', () => { if (!window.__segni['z-parte']) segna('z-parte'); });
    // la posizione del titolo a ogni fotogramma (letta dal DOM nel requestAnimationFrame): il titolo del pannello sulla
    // home, l'h1 sulle pagine. In A2, nei due fotogrammi in cui la view transition tiene a schermo la pagina lasciata, il
    // DOM ha già la home a scala 1: lì la curva salta ma lo schermo no (si guardano i fogli)
    window.__curva = [];
    window.__traccia = (attiva) => {
      window.__curvaOn = attiva;
      const passo = (t) => {
        if (!window.__curvaOn) return;
        window.__curva.push([t, ...window.__titolo()]);
        requestAnimationFrame(passo);
      };
      if (attiva) requestAnimationFrame(passo);
    };
    window.__titolo = () => {
      // il rettangolo del testo del titolo, trasformazioni comprese (camera sulla mappa, FLIP dell'h1): il titolo del
      // pannello sulla home, l'h1 sulle pagine
      const testo = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
      const pan = document.querySelector('a[data-zoom="' + (window.__pan || 'opere') + '"] .pan__t span');
      const h1 = document.querySelector('main h1');
      const el = pan && pan.getClientRects().length ? pan : h1;
      if (!el) return [0, 0, 0];
      const r = testo(el);
      return [r.left, r.top, r.height];
    };
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  errore nella pagina:', String(e)));
  const cdp = await ctx.newCDPSession(p);
  return { ctx, p, cdp, tel };
}

/* ---------------------------------------------------------------- lettura della traccia */
function leggiTraccia(json) {
  const ev = json.traceEvents ?? json;
  const thr = new Map();
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') thr.set(`${e.pid}:${e.tid}`, e.args.name);
  const segni = {};
  let pid = null;
  for (const e of ev) if (e.name === 'TimeStamp' && e.args?.data?.message) { segni[e.args.data.message] = e.ts; pid = e.pid; }
  // DrawAndSwap: coppie b/e asincrone con lo stesso id, in ordine di tempo
  const ds = ev.filter((e) => e.name === 'Graphics.Pipeline.DrawAndSwap' && (e.ph === 'b' || e.ph === 'e')).sort((a, c) => a.ts - c.ts);
  const aperti = new Map();
  const swapDur = [];
  for (const e of ds) {
    const k = e.id2?.local ?? e.id;
    if (e.ph === 'b') aperti.set(k, e.ts);
    else if (aperti.has(k)) { swapDur.push([aperti.get(k), e.ts - aperti.get(k)]); aperti.delete(k); }
  }
  const swap = ds.filter((e) => e.ph === 'b').map((e) => e.ts);
  const main = ev.filter((e) => e.pid === pid && thr.get(`${e.pid}:${e.tid}`) === 'CrRendererMain' && e.ph === 'X' && e.name === 'ThreadControllerImpl::RunTask');
  return { segni, swap, swapDur, main };
}
function metriche(t, da, a) {
  // fotogrammi del movimento: dall'ultimo disegno prima dell'inizio fino al primo dopo la fine
  const dentro = t.swap.filter((x) => x >= da && x <= a + 17000);
  const prima = [...t.swap].reverse().find((x) => x < da);
  const serie = prima ? [prima, ...dentro] : dentro;
  const d = []; for (let i = 1; i < serie.length; i++) d.push((serie[i] - serie[i - 1]) / 1000);
  const task = t.main.filter((e) => e.ts + e.dur > da && e.ts < a).map((e) => (Math.min(e.ts + e.dur, a) - Math.max(e.ts, da)) / 1000);
  const viz = t.swapDur.filter(([s]) => s >= da && s <= a).map(([, x]) => x / 1000);
  const durata = (a - da) / 1000;
  return {
    durata: Math.round(durata), fotogrammi: dentro.length, fps: Math.round(dentro.length / (durata / 1000)),
    oltre20: d.filter((x) => x > 20).length, oltre33: d.filter((x) => x > 33.4).length, max: Math.round(Math.max(0, ...d)),
    main: Math.round(task.reduce((s, x) => s + x, 0)), mainMax: Math.round(Math.max(0, ...task)),
    viz: Math.round(viz.reduce((s, x) => s + x, 0) / Math.max(1, viz.length) * 10) / 10,
  };
}
const CATEGORIE = ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'viz', 'benchmark', 'toplevel'];
async function conTraccia(p, file, azione) {
  await b.startTracing(p, { path: file, categories: CATEGORIE });
  try { await azione(); } finally { await b.stopTracing(); }
  const t = leggiTraccia(JSON.parse(await fs.readFile(file, 'utf8')));
  if (!TRACCE) await fs.rm(file);
  return t;
}
const riga = (m) => `durata ${String(m.durata).padStart(4)} ms · fotogrammi ${String(m.fotogrammi).padStart(3)} (${m.fps} fps) · >16,7: ${String(m.oltre20).padStart(2)} · >33: ${String(m.oltre33).padStart(2)} · max ${String(m.max).padStart(4)} ms · filo principale ${String(m.main).padStart(4)} ms (task max ${String(m.mainMax).padStart(3)}) · viz ${m.viz} ms/fotogramma`;

/* ---------------------------------------------------------------- zoom */
async function preparaMappa(w, h, pan) {
  const pg = await pagina(w, h);
  await pg.p.goto(B + '/it/#indice', { waitUntil: 'networkidle' });
  await pg.p.waitForTimeout(800);
  await pg.p.evaluate((x) => { window.__pan = x; document.querySelector(`a[data-zoom="${x}"]`)?.scrollIntoView({ block: 'nearest' }); }, pan);
  await pg.p.waitForTimeout(300);
  const r = await pg.p.$eval(`a[data-zoom="${pan}"]`, (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + Math.min(r.height / 2, 200)]; });
  if (!pg.tel) await pg.p.mouse.move(r[0], r[1]);
  await pg.p.waitForTimeout(1200); // pagina scaricata, letta e immagini decodificate al passaggio (o nei momenti liberi)
  return { ...pg, r };
}
async function clicca(pg) {
  await pg.p.evaluate(() => { window.__segni = {}; addEventListener('click', () => window.__segna('z-clic'), { capture: true, once: true }); window.__attendiFine(); });
  if (pg.tel) await pg.p.touchscreen.tap(pg.r[0], pg.r[1]); else await pg.p.mouse.click(pg.r[0], pg.r[1]);
}
async function indietro(pg) {
  await pg.p.evaluate(() => { window.__segni = {}; window.__segna('z-clic'); window.__attendiFine(); history.back(); });
}
async function attendiSegni(p) {
  await p.waitForFunction(() => window.__segni['z-fine'], null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(300);
  return p.evaluate(() => window.__segni);
}
async function zoom(w, h) {
  const righe = [];
  for (const pan of PANNELLI) {
    const pg = await preparaMappa(w, h, pan);
    await pg.cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const misura = async (nome, azione) => {
      const t = await conTraccia(pg.p, `${OUT}/trace_${pan}_${w}x${h}_${nome}.json`, async () => { await azione(pg); await attendiSegni(pg.p); });
      const s = t.segni;
      if (!s['z-parte'] || !s['z-fine']) return { nome, errore: 'movimento non trovato' };
      const avvio = Math.round(((t.swap.find((x) => x > s['z-parte']) ?? s['z-parte']) - s['z-clic']) / 1000);
      return { nome, avvio, ...metriche(t, s['z-parte'], s['z-fine']) };
    };
    righe.push([pan, await misura('A1', clicca)]);
    await pg.p.waitForTimeout(1500);
    righe.push([pan, await misura('A2', indietro)]);
    await pg.ctx.close();
  }
  const testo = [`\nZOOM ${w}×${h}${telefono(w, h) ? ' (tocco)' : ''}, CPU ×${CPU}: fotogrammi a schermo dall'inizio alla fine del movimento`];
  for (const [pan, m] of righe) testo.push(`${pan.padEnd(9)} ${m.nome}  ` + (m.errore ?? `avvio ${String(m.avvio).padStart(4)} ms · ${riga(m)}`));
  console.log(testo.join('\n'));
}

/* ---------------------------------------------------------------- video (screencast) */
async function video(w, h) {
  for (const pan of PANNELLI) {
    const dir = `${OUT}/video/${pan}_${w}x${h}`;
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    const pg = await preparaMappa(w, h, pan);
    const registra = async (nome, azione) => {
      const fotogrammi = [];
      const su = async (f) => { fotogrammi.push({ t: f.metadata.timestamp * 1000, data: f.data }); try { await pg.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {} };
      pg.cdp.on('Page.screencastFrame', su);
      await pg.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
      await pg.p.waitForTimeout(300);
      await pg.p.evaluate(() => { window.__curva = []; window.__traccia(true); });
      await azione(pg);
      const segni = await attendiSegni(pg.p);
      await pg.p.waitForTimeout(200);
      await pg.cdp.send('Page.stopScreencast');
      pg.cdp.off('Page.screencastFrame', su);
      const curva = await pg.p.evaluate(() => { window.__traccia(false); return { c: window.__curva, o: performance.timeOrigin }; });
      const clic = curva.o + (segni['z-clic'] ?? 0);
      const fine = curva.o + (segni['z-fine'] ?? 2000);
      const scelti = fotogrammi.filter((f) => f.t >= clic - 50 && f.t <= fine + 150);
      for (const [i, f] of scelti.entries()) await fs.writeFile(`${dir}/${nome}_${String(i).padStart(3, '0')}.jpg`, Buffer.from(f.data, 'base64'));
      const punti = curva.c.map(([t, x, y, hh]) => [Math.round(curva.o + t - clic), Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(hh * 10) / 10]);
      await fs.writeFile(`${dir}/${nome}_curva.json`, JSON.stringify({ tempi: scelti.map((f) => Math.round(f.t - clic)), punti, parte: Math.round((segni['z-parte'] ?? 0) - (segni['z-clic'] ?? 0)), fine: Math.round(fine - clic) }));
      return { nome, n: scelti.length };
    };
    const a1 = await registra('a1', clicca);
    await pg.p.waitForTimeout(1500);
    const a2 = await registra('a2', indietro);
    await pg.ctx.close();
    for (const m of [a1, a2]) await analizza(dir, m.nome, w, h);
    console.log(`video ${pan} ${w}×${h}: A1 ${a1.n} fotogrammi, A2 ${a2.n} → ${dir}`);
  }
}
let pAnalisi = null;
async function analizza(dir, nome, w, h) {
  if (!pAnalisi) pAnalisi = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const file = (await fs.readdir(dir)).filter((f) => f.startsWith(nome + '_') && f.endsWith('.jpg')).sort();
  const info = JSON.parse(await fs.readFile(`${dir}/${nome}_curva.json`, 'utf8'));
  const immagini = await Promise.all(file.map(async (f) => 'data:image/jpeg;base64,' + (await fs.readFile(`${dir}/${f}`)).toString('base64')));
  // differenza media per pixel fra fotogrammi consecutivi (0–255), su una copia ridotta a 160 px di larghezza
  const diff = await pAnalisi.evaluate(async (srcs) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const W = 160; const dati = [];
    for (const s of srcs) {
      const i = await load(s); const H = Math.round(W * i.height / i.width);
      const c = new OffscreenCanvas(W, H); const x = c.getContext('2d'); x.drawImage(i, 0, 0, W, H);
      dati.push(x.getImageData(0, 0, W, H).data);
    }
    const out = [0];
    for (let k = 1; k < dati.length; k++) { let s = 0; const a = dati[k], p = dati[k - 1]; for (let j = 0; j < a.length; j += 4) s += Math.abs(a[j] - p[j]) + Math.abs(a[j + 1] - p[j + 1]) + Math.abs(a[j + 2] - p[j + 2]); out.push(Math.round(s / (a.length / 4) / 3 * 10) / 10); }
    return out;
  }, immagini);
  await fs.writeFile(`${dir}/${nome}_diff.json`, JSON.stringify(info.tempi.map((t, i) => [t, diff[i]])));
  const col = w > h ? 6 : 10;
  const tw = Math.floor(1588 / col) - 6;
  await pAnalisi.setContent(`<body style="margin:0;background:#888;font:12px sans-serif"><div style="display:grid;grid-template-columns:repeat(${col},${tw}px);gap:6px;padding:6px">` +
    immagini.map((s, i) => `<figure style="margin:0;background:#fff"><img src="${s}" style="width:100%;display:block"><figcaption style="padding:2px 4px">${info.tempi[i]} ms · Δ ${diff[i]}</figcaption></figure>`).join('') + '</div></body>');
  await pAnalisi.waitForTimeout(100);
  await pAnalisi.screenshot({ path: `${dir}/${nome}_foglio.png`, fullPage: true });
  await pAnalisi.setContent(`<body style="margin:0;background:#fff">${grafico(info, diff, nome)}</body>`);
  await pAnalisi.screenshot({ path: `${dir}/${nome}_curva.png`, clip: { x: 0, y: 0, width: 900, height: 420 } });
}
function grafico(info, diff, nome) {
  const W = 900, H = 420, L = 50, R = 20, T = 30, Bm = 40;
  const pts = info.punti.filter(([t]) => t >= -50 && t <= info.fine + 150);
  const tMax = Math.max(info.fine + 150, 200);
  const X = (t) => L + (t + 50) / (tMax + 50) * (W - L - R);
  const lin = [[1, '#1565c0'], [2, '#2e7d32'], [3, '#c62828']].map(([k, col]) => {
    const v = pts.map((p) => p[k]); const lo = Math.min(...v), hi = Math.max(...v);
    const Y = (y) => T + (1 - (y - lo) / ((hi - lo) || 1)) * (H - T - Bm);
    return `<polyline fill="none" stroke="${col}" stroke-width="1.5" points="${pts.map((p) => `${X(p[0]).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ')}"/>` +
      pts.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[k]).toFixed(1)}" r="1.8" fill="${col}"/>`).join('');
  }).join('');
  const dMax = Math.max(1, ...diff);
  const barre = info.tempi.map((t, i) => `<rect x="${X(t) - 1}" y="${H - Bm - diff[i] / dMax * 60}" width="2" height="${diff[i] / dMax * 60}" fill="#999"/>`).join('');
  const ass = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600].filter((t) => t <= tMax).map((t) => `<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H - Bm}" stroke="#eee"/><text x="${X(t)}" y="${H - Bm + 14}" font-size="11" text-anchor="middle">${t}</text>`).join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">${ass}${barre}${lin}
    <line x1="${X(info.parte)}" x2="${X(info.parte)}" y1="${T}" y2="${H - Bm}" stroke="#000" stroke-dasharray="3 3"/>
    <text x="${L}" y="18" font-size="12">${nome.toUpperCase()}: titolo nel tempo (ms dal clic), ogni serie normalizzata: blu = sinistra, verde = alto, rosso = altezza; grigio = Δ fra fotogrammi a schermo</text></svg>`;
}

/* ---------------------------------------------------------------- altre animazioni */
async function altre() {
  const out = [];
  const prove = [
    // [nome, [w, h], url, azione]
    ['cassetto (apre)', [1280, 832], '/it/opere/', (p) => p.click('header [data-carrello]')],
    ['filtri (apre)', [1280, 832], '/it/opere/', (p) => p.click('[data-filtri-apri]')],
    ['filtri (apre, telefono)', [390, 844], '/it/opere/', (p) => p.tap('[data-filtri-apri]')],
    ['Indice (telefono)', [390, 844], '/it/opere/', (p) => p.tap('[data-indice-apri]:visible')],
    ['dialog AR', [1280, 832], '/it/opere/golden-mom/', (p) => p.click('[data-parete-apri]')],
    ['lente', [1280, 832], '/it/opere/golden-mom/', (p) => p.click('[data-lente-apri]')],
    ['fisarmonica', [1280, 832], '/it/prossimamente/', (p) => p.click('[data-px-voce]:not([data-aperta]) [data-px-b]')],
    ['A3 opera successiva', [1280, 832], '/it/opere/golden-mom/', (p) => p.click('a[data-a3="avanti"]')],
  ];
  for (const [nome, [w, h], url, azione] of prove) {
    const pg = await pagina(w, h);
    await pg.p.goto(B + url, { waitUntil: 'networkidle' });
    await pg.p.waitForTimeout(800);
    await pg.cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    try {
      const t = await conTraccia(pg.p, `${OUT}/trace_altre_${nome.replace(/\W+/g, '_')}.json`, async () => {
        await pg.p.evaluate(() => {
          window.__segni = {}; window.__segna('z-clic');
          // inizio = la prima animazione che parte; fine = nessuna animazione attiva (al massimo 3 s)
          const giro = () => {
            const a = document.getAnimations().filter((x) => x.playState === 'running' && x.effect?.getTiming().iterations !== Infinity && !(x.timeline instanceof (window.ScrollTimeline ?? class {})));
            if (a.length && !window.__segni['z-parte']) window.__segna('z-parte');
            if ((window.__segni['z-parte'] && !a.length) || performance.now() - window.__segni['z-clic'] > 3000) { window.__segna('z-fine'); return; }
            requestAnimationFrame(giro);
          };
          requestAnimationFrame(giro);
        });
        await azione(pg.p);
        await pg.p.waitForFunction(() => window.__segni['z-fine'], null, { timeout: 6000 }).catch(() => {});
        await pg.p.waitForTimeout(200);
      });
      const s = t.segni;
      if (!s['z-parte']) out.push(`${nome.padEnd(26)} nessuna animazione trovata`);
      else out.push(`${nome.padEnd(26)} ${w}×${h} · avvio ${String(Math.round((s['z-parte'] - s['z-clic']) / 1000)).padStart(3)} ms · ${riga(metriche(t, s['z-parte'], s['z-fine']))}`);
    } catch (e) { out.push(`${nome.padEnd(26)} errore: ${String(e).split('\n')[0]}`); }
    await pg.ctx.close();
  }
  // titolo di Opere allo scorrimento (A5), cursore, passaggio sulle opere: si muove la rotella o il mouse
  for (const [nome, url, w, h, azione] of [
    ['A5 titolo allo scorrimento', '/it/opere/', 1280, 832, async (p) => { await p.mouse.move(640, 500); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 40); await p.waitForTimeout(16); } }],
    ['cursore sulle opere', '/it/opere/', 1280, 832, async (p) => { for (let i = 0; i < 60; i++) { await p.mouse.move(200 + i * 12, 400 + Math.sin(i / 6) * 150); await p.waitForTimeout(16); } }],
    ['passaggio sulle opere', '/it/opere/', 1280, 832, async (p) => { for (const [x, y] of [[250, 500], [640, 500], [1000, 500], [250, 700]]) { await p.mouse.move(x, y, { steps: 6 }); await p.waitForTimeout(350); } }],
  ]) {
    const pg = await pagina(w, h);
    await pg.p.goto(B + url, { waitUntil: 'networkidle' });
    await pg.p.waitForTimeout(800);
    await pg.cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const t = await conTraccia(pg.p, `${OUT}/trace_altre_${nome.replace(/\W+/g, '_')}.json`, async () => {
      await pg.p.evaluate(() => { window.__segni = {}; window.__segna('z-parte'); });
      await azione(pg.p);
      await pg.p.waitForTimeout(400);
      await pg.p.evaluate(() => window.__segna('z-fine'));
    });
    out.push(`${nome.padEnd(26)} ${w}×${h} · ${riga(metriche(t, t.segni['z-parte'], t.segni['z-fine']))}`);
    await pg.ctx.close();
  }
  console.log(`\nALTRE ANIMAZIONI, CPU ×${CPU}\n` + out.join('\n'));
}

/* ---------------------------------------------------------------- peso */
async function carica(p, cdp, url) {
  const byte = { script: 0, image: 0, totale: 0, css: 0, font: 0, doc: 0 };
  const tipi = new Map();
  const suRisposta = (e) => tipi.set(e.requestId, e.type);
  const suFine = (e) => {
    const t = tipi.get(e.requestId) ?? 'Other';
    byte.totale += e.encodedDataLength;
    if (t === 'Script') byte.script += e.encodedDataLength;
    else if (t === 'Image') byte.image += e.encodedDataLength;
    else if (t === 'Stylesheet') byte.css += e.encodedDataLength;
    else if (t === 'Font') byte.font += e.encodedDataLength;
    else if (t === 'Document') byte.doc += e.encodedDataLength;
  };
  cdp.on('Network.responseReceived', suRisposta);
  cdp.on('Network.loadingFinished', suFine);
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  cdp.off('Network.responseReceived', suRisposta);
  cdp.off('Network.loadingFinished', suFine);
  const m = await p.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const tbt = window.__lt.filter(([s]) => s >= fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
    return { lcp: Math.round(window.__lcp), fcp: Math.round(fcp), tbt: Math.round(tbt) };
  });
  return { ...m, ...Object.fromEntries(Object.entries(byte).map(([k, v]) => [k, Math.round(v / 1024)])) };
}
async function peso() {
  console.log(`\nPESO 1280×832, rete 10 Mbit/s 40 ms, CPU ×${CPU} (KB trasferiti nei primi 6 s)`);
  for (const [nome, url] of [['home', '/it/'], ['opere', '/it/opere/']]) {
    const { ctx, p, cdp } = await pagina(1280, 832);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    const freddo = await carica(p, cdp, B + url);
    const caldo = await carica(p, cdp, B + url);
    for (const [k, m] of [['prima visita', freddo], ['con cache', caldo]]) {
      console.log(`${nome.padEnd(6)} ${k.padEnd(13)} LCP ${String(m.lcp).padStart(5)} ms · FCP ${String(m.fcp).padStart(5)} · TBT ${String(m.tbt).padStart(4)} ms · JS ${String(m.script).padStart(4)} KB · immagini ${String(m.image).padStart(5)} KB · CSS ${m.css} · font ${m.font} · totale ${m.totale} KB`);
    }
    await ctx.close();
  }
}

if (solo === 'zoom') for (const [w, h] of VISTE) await zoom(w, h);
if (solo === 'video') for (const [w, h] of VISTE) await video(w, h);
if (solo === 'altre') await altre();
if (solo === 'peso') await peso();
await b.close();
