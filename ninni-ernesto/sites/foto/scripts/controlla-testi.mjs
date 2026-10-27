#!/usr/bin/env node
/**
 * Controllo testi di Galleria (copiato da Casa e adattato, DIREZIONE §11).
 *   node scripts/controlla-testi.mjs            → chiavi uguali nelle 3 lingue (src/i18n/*.{it,en,zh}.json)
 *   node scripts/controlla-testi.mjs dist       → + legge le pagine compilate e segnala, per lingua:
 *       IT/EN  parole da brochure (DIREZIONE §11), punti esclamativi, trattini lunghi nel testo corrente;
 *       EN     inglese britannico come i testi comuni (en-GB): nessun controllo di grafia;
 *       中文   你 (Galleria dà del 您, come il core 0.3.0 e i testi comuni), 购物袋 (si usa 购物车),
 *              punteggiatura ASCII attaccata ai caratteri cinesi, "cm" dopo un numero (si usa 厘米).
 *       tutte  segnaposto tra [quadre] e note di lavoro (BOZZA, «da confermare»…): la demo deve sembrare finita.
 * Le descrizioni delle opere vengono da `dati/opere.json` (testi del sito attuale): le frasi segnalate lì sono elencate
 * a parte, perché si cambiano solo con Isabella (annotarle nel diario del cantiere).
 * Esce con 1 se trova chiavi diverse o problemi fuori dalle descrizioni delle opere.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = dirname(fileURLToPath(import.meta.url));
const I18N = join(qui, '../src/i18n');
let errori = 0;

/* ---------- 1. chiavi */
const piatte = (o, p = '', out = new Set()) => {
  if (Array.isArray(o)) o.forEach((v, i) => piatte(v, `${p}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) piatte(v, p ? `${p}.${k}` : k, out);
  else out.add(p);
  return out;
};
const basi = [...new Set(readdirSync(I18N).filter((f) => f.endsWith('.json')).map((f) => f.split('.')[0]))];
for (const b of basi) {
  const [it, en, zh] = ['it', 'en', 'zh'].map((l) => piatte(JSON.parse(readFileSync(join(I18N, `${b}.${l}.json`), 'utf8'))));
  for (const [nome, s] of [['en', en], ['zh', zh]]) {
    const manca = [...it].filter((k) => !s.has(k));
    const extra = [...s].filter((k) => !it.has(k));
    if (manca.length || extra.length) { errori++; console.log(`✗ ${b}.${nome}: mancano ${manca.join(', ') || '-'} · in più ${extra.join(', ') || '-'}`); }
  }
  console.log(`  ${b}: ${it.size} chiavi`);
}

/* ---------- 2. pagine compilate */
const dist = process.argv[2];
if (dist) {
  const opere = JSON.parse(readFileSync(join(qui, '../../../dati/opere.json'), 'utf8'));
  const descrizioni = opere.map((o) => o.descrizione_it).filter(Boolean);
  const daOpere = (riga) => descrizioni.some((d) => d.includes(riga.slice(0, 60)) || riga.includes(d.slice(0, 60)));

  /* correzioni audit 1 (D1/M7): nella demo non si vede nessun segnaposto tra [quadre] e nessuna nota di lavoro */
  const SEGNAPOSTO = [
    [/[\[［][^\]］]{1,160}[\]］]/g, 'segnaposto tra [quadre]'],
    [/\b(BOZZA|DRAFT)\b|草稿|\b(da confermare|da verificare|da definire|da compilare|to be confirmed|to be checked|to be defined)\b|待确认|待核实|待补充/g, 'nota di lavoro'],
  ];
  const REGOLE = {
    it: [
      [/\b(Scopri|scopri|Immergiti|immergiti|viaggio|emozion\w*|unic[oaie]|esperienz\w*|magi[ac]\w*|anima\b|senza tempo|esplora\w*|cuore|passione|iconic\w*|esclusiv\w*|mondo di|ogni opera racconta)\b/g, 'parola da evitare'],
      [/\bNon solo\b/g, '«Non solo… ma»'],
      [/!/g, 'punto esclamativo'],
      [/ — /g, 'trattino lungo'],
    ],
    en: [
      [/\b(Discover|discover|Immerse|immerse|journey|emotion\w*|unique|one-of-a-kind|timeless|soul\b|passion\w*|iconic|exclusive|a world of|experience)\b/g, 'parola da evitare'],
      [/!/g, 'punto esclamativo'],
      [/ — /g, 'trattino lungo'],
    ],
    zh: [
      [/你/g, '你 (Galleria dà del 您)'],
      [/购物袋/g, '购物袋 (si usa 购物车)'],
      [/[一-鿿][,;!?]|[,;!?][一-鿿]|[一-鿿]\.(\s|$)|[一-鿿]:\s|[一-鿿] ?\(|\)[一-鿿]/g, 'punteggiatura ASCII'],
      [/\d cm\b/g, '"cm" (si usa 厘米)'],
    ],
  };
  const testo = (html) => {
    const attr = [...html.matchAll(/\s(?:alt|aria-label|placeholder|title)="([^"]*)"/g)].map((m) => m[1]);
    const corpo = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<template[\s\S]*?<\/template>/g, ' ')
      .replace(/<(?:p|li|h\d|div|br|tr|td|th|button|a|label|figcaption|dt|dd|span|option)\b[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
    return [...corpo.split('\n'), ...attr].map((s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()).filter(Boolean);
  };
  /* Noti, non correggibili da Casa: l'alt del visore 3D è composto nel core (`${etichetta3d}: ${alt}`, ArViewer.astro;
     richiesta in direzioni/casa/richieste_core.md) e la nota cornice di Unique è un dato italiano di opere.json (lang="it"). */
  const NOTI = [/^真实尺寸 3D 预览: /, /^Opera venduta con cornice/];
  const pagine = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? pagine(p) : f === 'index.html' ? [p] : []; });
  for (const lang of ['it', 'en', 'zh']) {
    const visti = new Map();
    for (const p of pagine(join(dist, lang))) {
      if (p.includes('/styleguide/')) continue;
      for (const riga of new Set(testo(readFileSync(p, 'utf8')))) {
        for (const [re, nome] of [...REGOLE[lang], ...SEGNAPOSTO]) {
          re.lastIndex = 0;
          if (re.test(riga)) {
            const k = `${nome} | ${riga.slice(0, 160)}`;
            if (!visti.has(k)) visti.set(k, { nome, riga, pagina: p.slice(dist.length), opera: daOpere(riga) });
          }
        }
      }
    }
    const tutti = [...visti.values()];
    const noti = tutti.filter((v) => !v.opera && NOTI.some((r) => r.test(v.riga)));
    const veri = tutti.filter((v) => !v.opera && !noti.includes(v));
    const opereV = tutti.filter((v) => v.opera);
    console.log(`\n${lang}: ${veri.length} da correggere, ${opereV.length} nelle descrizioni delle opere (dati di Isabella), ${noti.length} noti (core/dati)`);
    for (const v of veri) console.log(`  ✗ [${v.nome}] ${v.riga.slice(0, 140)}  (${v.pagina})`);
    if (process.env.OPERE) for (const v of opereV) console.log(`  · [${v.nome}] ${v.riga.slice(0, 100)}`);
    errori += veri.length;
  }
}
console.log(errori ? `\n${errori} problemi` : '\nTutto a posto.');
process.exit(errori ? 1 : 0);
