# Realtà aumentata — "Visualizza nella stanza"

Ultimo aggiornamento: 19/10/2026 (richieste di Casa, vedi `CHANGELOG.md` 0.2.0).

Con il telefono il visitatore vede il quadro **appeso alla sua parete, alla misura reale**.
La realtà aumentata è vera: non è un fotomontaggio. Usa le app già presenti nei telefoni:

| Dispositivo | Cosa si apre | File usato |
|---|---|---|
| Android (Chrome) | **Scene Viewer** di Google (oppure WebXR nel browser) | `NN.glb` |
| iPhone / iPad (Safari) | **AR Quick Look** di Apple | `NN.usdz` |
| iPhone / iPad senza WebGL | niente anteprima 3D, ma il bottone apre lo stesso Quick Look (link `<a rel="ar">` diretto) | `NN.usdz` |
| Computer (finestra ≥ 768 px, mouse) | anteprima 3D ruotabile + **QR code** per aprire la pagina sul telefono | `NN.glb` |
| Computer con finestra stretta | anteprima 3D, niente QR (`data-ar="non-supportato"`, senza avviso) | `NN.glb` |
| Telefono senza AR | anteprima 3D + messaggio che spiega cosa fare | `NN.glb` |

In tutti i casi il quadro va **sulla parete** e la **scala è bloccata** (non si può ingrandire o rimpicciolire con le dita): così la misura che si vede è quella vera.

---

## 1. I file

```
siti/assets/ar/
  01.glb … 26.glb        modelli per Android e anteprima 3D (≈ 0,2–0,7 MB l'uno)
  01.usdz … 26.usdz      modelli per iPhone/iPad (stesso peso)
  index.json             misure usate, pesi, note per ogni opera

siti/packages/core/
  components/ArViewer.astro      il componente da mettere nelle pagine
  src/ar/index.ts                testi IT/EN/ZH, modelliAr(id) → percorsi dei file, misureAr(id) → misure del modello
  src/ar/client.ts               la parte che gira nel browser (non si importa a mano)
  scripts/ar/genera_ar.py        crea i modelli (GLB + USDZ) da dati e immagini
  scripts/ar/override.json       correzioni di misura per singola opera
  scripts/ar/verifica_glb.mjs    controllo dei .glb (validatore ufficiale Khronos)
  scripts/ar/verifica_usdz.py    controllo dei .usdz (validatori ufficiali OpenUSD)
  scripts/ar/requirements.txt    librerie Python (usd-core, pillow)
  scripts/ar/prova/              pagina di prova, prova automatica e screenshot
```

### Com'è fatto il modello

- Un parallelepipedo grande come il quadro vero: **1 unità = 1 metro**.
  Esempio: *The Of Us* = 2,00 × 1,50 m × 4 cm.
- **Fronte**: la foto della tela (`assets/opere/NN/…_tela_….jpg`).
- **Lati**: continuano i colori del bordo del dipinto (come una tela dipinta anche sui lati).
  Nelle opere fotografate con la cornice (09) i lati diventano neri come la cornice.
- **Retro**: color legno chiaro. È la faccia che va contro il muro.
- **Spessore**: 3 cm; 4 cm se un lato è ≥ 150 cm (tele grandi hanno telai più spessi); 4 cm per la 09 con cornice.
- **Texture**: JPEG qualità 85 con lati potenza di 2, al massimo 4096 px e 8 Mpx (es. 4096 × 2048 o 2048 × 4096).
  Parte dalla tela più grande del manifest (webp 2400/3200 ingrandita), non dal jpg di circa 1000 px:
  con quello, sul telefono, Le Donzelle aveva circa 5,5 px/cm e si vedeva sgranata (audit di Casa, 19/10).
  Ora il minimo è circa 17 px/cm. Ogni file pesa da 0,35 a 1,4 MB. `--solo-jpg` torna alla vecchia sorgente.
- **Ancoraggio a parete**:
  - Android: model-viewer apre Scene Viewer con `enable_vertical_placement=true` e `resizable=false`.
  - iPhone: nel file USDZ ci sono `preliminary:anchoring:type = "plane"` e
    `preliminary:planeAnchoring:alignment = "vertical"`; model-viewer aggiunge `#allowsContentScaling=0` (scala fissa).

---

## 2. Usare il componente in un sito

### Esempio

```astro
---
import ArViewer from '@ne/core/components/ArViewer.astro';
import { misureAr, modelliAr } from '@ne/core/ar';
import { getArtwork, getArtworkImage } from '@ne/core/catalog';

const art = getArtwork('04');
const { glb, usdz } = modelliAr(art.id);               // /assets/ar/04.glb e /assets/ar/04.usdz
const misure = misureAr(art.id);                       // { larghezzaCm, altezzaCm, profonditaCm } (cornice compresa) o null
const poster = getArtworkImage(art.id, 'canvas', { width: 960 }).src;
---
<ArViewer glb={glb} usdz={usdz} alt={art.title} titolo={art.title}
          poster={poster} lingua={lang} class="scheda__ar" />
```

### Props

| Prop | Obbligatoria | Cosa fa |
|---|---|---|
| `glb` | sì | URL del `.glb` |
| `usdz` | consigliata | URL del `.usdz`. Senza, su iPhone la realtà aumentata non parte |
| `alt` | sì | descrizione per chi usa lo screen reader (di solito il titolo) |
| `poster` | no | immagine mostrata finché il 3D non è pronto (consigliata: la tela) |
| `titolo` | no | titolo che Scene Viewer mostra su Android |
| `lingua` | no | `'it'` (predefinita), `'en'`, `'zh'`: sceglie i testi predefiniti. Con `t`, predefinita `t.lang` |
| `t` | no | traduttore del sito: legge `core.ar.*` (stessi nomi di `testi`), così valgono i testi del sito (dalla 0.3.0) |
| `testi` | no | sostituisce uno o più testi: `{ bottone, qrTitolo, qrTesto, nonSupportato, errore, erroreModello, etichetta3d }` |
| `urlQr` | no | indirizzo assoluto nel QR code. Predefinito: la pagina corrente + `#id-del-viewer`. Vince su `hashQr` (anche come `data-url-qr` impostato dal browser) |
| `hashQr` | no | QR = pagina corrente (calcolata nel browser, con la query) + questo hash, es. `hashQr="#stanza-ar"` |
| `nascondiBarra` | no | `false` per lasciare visibile la barra di caricamento di model-viewer anche a modello pronto (predefinito: nascosta) |
| `qr` | no | `false` per non mostrare il QR code su computer. Il QR compare comunque solo con finestra ≥ 768 px e puntatore non "coarse" |
| `caricamento` | no | `'pigro'` (predefinito: il 3D si carica quando il riquadro si avvicina allo schermo) o `'subito'` |
| `arModes` | no | ordine delle modalità di model-viewer. Predefinito `'scene-viewer webxr quick-look'` |
| `id`, `class` | no | come in HTML |

Slot: `icona` (contenuto prima del testo del bottone, es. un'icona SVG) e uno slot senza nome
(contenuto dopo il viewer, es. una didascalia con le misure).

Per i testi si possono usare quelli del sito: `t={t}` (chiavi `core.ar.*`) oppure
`testi={{ bottone: t('opera.ar.bottone') }}`. L'etichetta del 3D e il titolo sono uniti con `sep(lingua).dp`
(in cinese «：»).

### Vestirlo (nessuno stile imposto)

Il componente produce questo HTML (semplificato):

```html
<isa-ar-viewer class="isa-ar …" data-ar="qr">
  <model-viewer class="isa-ar__modello">…</model-viewer>
  <button class="isa-ar__bottone"><span class="isa-ar__bottone-testo">Visualizza nella stanza</span></button>
  <div class="isa-ar__qr">
    <p class="isa-ar__qr-titolo">…</p> <div class="isa-ar__qr-codice"><svg>…</svg></div> <p class="isa-ar__qr-testo">…</p>
  </div>
  <p class="isa-ar__avviso" role="status">…</p>
</isa-ar-viewer>
```

- **Stato** in `data-ar`: `attesa` → poi `disponibile` (bottone visibile), `qr` (computer),
  `non-supportato` (telefono senza AR, avviso visibile; oppure computer con finestra stretta, senza avviso) o `errore`.
  Gli elementi non pertinenti hanno l'attributo `hidden`.
- **Altri attributi** su `isa-ar-viewer`: `data-modello="caricato"` (modello 3D pronto), `data-webgl="no"`
  (model-viewer ha segnalato che WebGL manca: il sito può mostrare la foto della tela al posto del riquadro vuoto),
  `data-quick-look="diretto"` (iPhone/iPad: il bottone usa il link `<a rel="ar">` diretto).
- **Variabili CSS**:

| Variabile | Predefinito | Uso |
|---|---|---|
| `--isa-ar-altezza` | `26rem` | altezza dell'anteprima 3D |
| `--isa-ar-sfondo` | trasparente | sfondo dell'anteprima |
| `--isa-ar-margine` | `1.1` | aria attorno al quadro nell'anteprima (1 = bordo a bordo) |
| `--isa-ar-qr-lato` | `9rem` | lato del QR code |
| `--isa-ar-qr-colore` | `#000` | colore dei quadratini del QR |
| `--isa-ar-qr-sfondo` | `#fff` | sfondo del QR (tenerlo chiaro: alcuni telefoni non leggono i QR "in negativo") |

- Le regole di base del componente hanno specificità zero (`:where`), quindi qualunque regola del sito vince.
- **Attenzione agli stili "scoped" di Astro**: nel `<style>` di una pagina le classi del componente non vengono
  raggiunte. Usare `:global(.isa-ar__bottone) { … }`, oppure `<style is:global>`, oppure il CSS globale del sito.
- Il bottone sta **fuori** dal riquadro 3D: si può spostare dove si vuole con il CSS
  (`isa-ar-viewer` è `position: relative`, quindi anche sovrapposto al 3D con `position: absolute`).
- Evento: `isa-ar-stato` (bubbles) con `detail.stato`, per chi vuole reagire ai cambi di stato.

### Cose da sapere per i siti

1. **Modelli nella build.** L'integrazione di `@ne/core` copia `opere`, `foto` e `ar` (predefinito) e scrive
   `_headers` per Netlify. In sviluppo `/assets/ar/…` è già servito, con il tipo giusto per `.glb` e `.usdz`.
2. **Dipendenze**: `@google/model-viewer` e `qrcode` sono nelle dipendenze di `@ne/core`;
   basta `npm install` dalla cartella `siti/`. model-viewer (~1 MB) viene scaricato **solo** nelle pagine
   con il componente e solo quando il riquadro si avvicina allo schermo.
3. **HTTPS e indirizzo pubblico**: Scene Viewer (Android) scarica il `.glb` dai server Google, quindi il sito
   deve essere online su https (Netlify va bene). Da `localhost` sul telefono non funziona.
4. **Tipo dei file sul server**: dopo la pubblicazione controllare
   `curl -I https://…/assets/ar/01.usdz` → deve dire `content-type: model/vnd.usdz+zip`
   (per `.glb`: `model/gltf-binary`). Se Safari scarica il file invece di aprire la AR, il motivo è quasi
   sempre questo. Fuori da Netlify: configurazione per Vercel e nginx nel README del core, §12.
5. **iPhone/iPad senza WebGL** (WebGL disattivato nelle impostazioni, Modalità isolamento): model-viewer non riesce a
   disegnare e lancia `TypeError: … 'supportsPresentation'`. Il componente intercetta l'errore (niente "uncaught" in
   console), mette `data-webgl="no"` e, se il browser supporta `<a rel="ar">` e c'è `usdz`, mostra il bottone che apre
   `NN.usdz#allowsContentScaling=0` con un link diretto (Quick Look non usa WebGL).
6. **Misure in scala**: per viste "in scala" coerenti con la AR usare `misureAr(id)` (es. 09 = 90 × 90 cm con la
   cornice, mentre `artwork.dimensions` = 71 × 71), non importare `assets/ar/index.json` a mano.

---

## 3. Rigenerare i modelli

Quando cambiano misure o foto. **Non creare ambienti Python o `node_modules` dentro la cartella condivisa.**

```bash
# una volta: ambiente Python in una cartella temporanea
python3 -m venv /tmp/ar-venv
/tmp/ar-venv/bin/pip install -r siti/packages/core/scripts/ar/requirements.txt

# tutte le opere (scrive siti/assets/ar/NN.glb, NN.usdz e index.json)
PYTHONDONTWRITEBYTECODE=1 /tmp/ar-venv/bin/python siti/packages/core/scripts/ar/genera_ar.py

# solo alcune opere
PYTHONDONTWRITEBYTECODE=1 /tmp/ar-venv/bin/python siti/packages/core/scripts/ar/genera_ar.py --solo 04 09

# controlli
PYTHONDONTWRITEBYTECODE=1 /tmp/ar-venv/bin/python siti/packages/core/scripts/ar/verifica_usdz.py
npm run ar:verifica -w packages/core        # dopo npm install in siti/ (usa gltf-validator)
```

Opzioni utili di `genera_ar.py`: `--spessore-cm 3`, `--spessore-grande-cm 4`, `--qualita 85` (JPEG),
`--lato-max 4096`, `--solo-jpg`, `--allineamento-ios vertical|any|horizontal`, `--uscita <cartella>`, `--siti <cartella siti>`.

### Da dove prende i dati

| Dato | File | Campo |
|---|---|---|
| id, titolo | `siti/dati/opere.json` | `id`, `titolo` |
| misure | `siti/dati/opere.json` | `misure.larghezza_cm`, `misure.altezza_cm` (accetta anche `larghezza_cm`/`altezza_cm` in cima, e `profondita_cm`) |
| immagine | `siti/assets/manifest.json` | `immagini.tela.jpg.file` (se manca: il `…_tela_….jpg` più grande in `assets/opere/NN/`) |
| correzioni | `scripts/ar/override.json` | per id: `larghezza_cm`, `altezza_cm`, `profondita_cm`, `nota` (vincono su opere.json) |

Regole automatiche:
- **Orientamento**: comanda la foto. Se la foto è orizzontale e le misure dicono il contrario, larghezza e altezza
  si scambiano (succedeva per 01 e 21 nella scheda originale; in `opere.json` sono già corrette).
- Se le proporzioni della foto e delle misure differiscono più del 6% lo script lo scrive in `index.json` (`note`).
  Oggi nessuna opera supera il 6%.
- Opere senza misure: saltate e annotate in `index.json` → `saltate`. Oggi nessuna.

### Misure usate (26 opere)

Tutte da `dati/opere.json`, tranne la **09 Unique: 90 × 90 cm con cornice** (scelta del coordinamento:
la foto include la cornice nera; la tela da sola è 71 × 71) — impostata in `override.json`.

Da confermare con Isabella (non bloccano, ma cambiano la misura in AR):
- **22 Rory** — la foto mostra una cornice dorata; 60 × 80 cm è con o senza cornice?
- **18 Emerald** — "cornice nera minimal inclusa", ma nella foto non si vede: 80 × 90 cm è con o senza cornice?
- **26 Two** — "tela con cornice" secondo la scheda, nella foto senza cornice (in `dati/opere.json` la nota ora è
  nel campo `cornice_note`, → `artwork.frameNote`; `cornice` = "Tela con cornice").
- Spessore reale delle tele (usati 3 / 4 cm).

---

## 4. Cosa è stato verificato (e cosa no)

**Verificato qui, in automatico:**
- 26 GLB: **0 errori, 0 avvisi** con il validatore ufficiale Khronos (`gltf-validator` 2.0.0-dev.3.10).
- 26 USDZ: **0 errori** con i validatori ufficiali OpenUSD 26.08 (`usd-core`, gli stessi di `usdchecker`,
  inclusi quelli per i pacchetti USDZ); zip senza compressione con dati allineati a 64 byte; metri; asse Y in alto;
  misure del riquadro uguali a quelle attese; ancoraggio `plane` / `vertical` presente.
- I file USDZ, aperti con un lettore indipendente (USDLoader di three.js), mostrano immagine dritta, lati e cornice corretti.
- Componente in una build Astro 7.4 (TypeScript e `astro check` senza errori), provato con Chromium (Playwright):
  - il 3D si carica e si disegna (model-viewer riporta 2 m × 1,5 m × 4 cm per *The Of Us*); ruotandolo si vedono spessore e lati;
  - **computer 1440 px**: niente bottone, compare il QR code con l'indirizzo della pagina;
  - **Android simulato 390 px**: bottone "Visualizza nella stanza" visibile; il tocco prepara l'apertura di Scene Viewer con
    `enable_vertical_placement=true` (parete) e `resizable=false` (scala fissa);
  - **iPhone simulato 390 px**: bottone visibile; il tocco apre `01.usdz#allowsContentScaling=0` con `rel="ar"` (Quick Look, scala fissa);
  - **telefono senza AR**: bottone nascosto, compare l'avviso;
  - (19/10, `packages/core/playground/tests/e2e.mjs`, pagina `/it/ar/`) **computer 1280 px**: QR con `#stanza-ar`
    (prop `hashQr`), barra di caricamento nascosta a modello pronto; **finestra 375 px**: niente QR;
    **iPhone simulato senza WebGL**: l'errore `supportsPresentation` è intercettato, bottone visibile, il tocco apre
    `/assets/ar/09.usdz#allowsContentScaling=0` con un `<a rel="ar"><img></a>` diretto;
  - testi in italiano e inglese; nessun errore in console.
- Screenshot: `scripts/ar/prova/screenshot/`.

**NON verificato (serve un telefono vero):**
- che Scene Viewer e Quick Look trovino la parete e mostrino il quadro appeso e dritto;
- che la misura vista in camera corrisponda davvero (va misurata con un metro);
- colori e luce in AR; lettura del QR code da un telefono;
- tipo dei file (`content-type`) sul server Netlify.

Il punto più incerto è **iPhone**: l'orientamento del quadro sulla parete con l'ancoraggio verticale
segue la documentazione Apple (retro del quadro contro il muro, asse Y in alto), ma non l'abbiamo potuto vedere.
19/10: su iPhone vero il quadro usciva dal muro come una mensola. Causa: con l'ancoraggio verticale ARKit usa l'asse Y locale come normale del muro. Correzione in `genera_ar.py`: per l'USDZ la geometria sta sotto `/Quadro/Geometria`, ruotata di -90° su X (fronte verso +Y, alto verso -Z). I GLB per Android non cambiano (fronte +Z, alto +Y, come vuole Scene Viewer). Verificato con due controlli indipendenti su tutti i 26 modelli. Dopo ogni rigenerazione aumentare `VERSIONE_MODELLI_AR` in `src/ar/index.ts`, così telefoni e CDN non riaprono i file vecchi.

---

## 5. Checklist per la prova su telefono (Ninni)

Prima: sito pubblicato su https con una pagina che contiene il componente
(si può usare `scripts/ar/prova/pagina-prova.astro`, copiata per esempio in `sites/casa/src/pages/prova-ar.astro`).
Serve una parete libera ben illuminata, possibilmente non tutta bianca e liscia (le pareti
completamente uniformi sono le più difficili da riconoscere per i telefoni). Tenere a portata un metro.

**iPhone (Safari)**
1. [ ] Aprire la pagina: si vede l'anteprima 3D e il bottone "Visualizza nella stanza".
2. [ ] Toccare il bottone: si apre la fotocamera (AR Quick Look), non un download.
3. [ ] Puntare la parete e muovere piano il telefono: il quadro si attacca alla **parete**, dritto e non sdraiato.
4. [ ] Provare a "pizzicare" con due dita: il quadro **non** deve cambiare misura.
5. [ ] Misurare con il metro il quadro sulla parete (es. 01 *The Of Us*: 200 × 150 cm; 16 *Black*: 50 × 70 cm).
6. [ ] L'immagine è dritta (non a specchio, non capovolta) e i colori sono credibili.
7. [ ] Provare anche un'opera con cornice (09 *Unique*: 90 × 90, cornice nera) e una panoramica (25: 280 × 125).
8. [ ] Ripetere in Chrome su iPhone (se non parte, va bene: l'avviso deve dire di usare Safari).

**Android (Chrome)**
1. [ ] Aprire la pagina: anteprima 3D e bottone visibili.
2. [ ] Toccare il bottone: si apre Scene Viewer (Google) oppure la AR nel browser.
   Se chiede di installare "Servizi Google Play per AR", accettare.
3. [ ] Il quadro va sulla parete (se Scene Viewer chiede di puntare il pavimento, puntare invece la parete).
4. [ ] Pizzico con due dita: la misura non cambia.
5. [ ] Misurare con il metro come sopra.
6. [ ] Il titolo dell'opera compare in alto in Scene Viewer.

**Computer**
1. [ ] Si vede l'anteprima 3D che si può girare un po' con il mouse; niente bottone AR.
2. [ ] C'è il QR code: inquadrandolo con il telefono si apre la stessa pagina all'altezza del quadro.

**Telefono vecchio o browser non adatto** (es. Firefox su Android)
1. [ ] Niente bottone, compare il messaggio che spiega cosa usare.

Annotare per ogni prova: modello di telefono, browser, opera, cosa si è visto, misura con il metro, foto dello schermo.

19/10 (pomeriggio): texture rigenerate dalle tele grandi (vedi Texture), `VERSIONE_MODELLI_AR` portata a '3'. Controlli: misure, ancoraggio, orientamento e non specchiatura di tutti i 26 USDZ e GLB, 0 errori.

Se sull'iPhone vero il quadro appare capovolto (alto e basso invertiti): Apple non documenta il verso dell'alto (-Z) per l'ancoraggio verticale. In `genera_ar.py` cambiare `AddRotateXOp().Set(-90.0)` in `+90.0`, rigenerare, portare `VERSIONE_MODELLI_AR` a '4' e provare prima con l'opera 25 (Le Muse del Sole), che ha un alto e un basso evidenti. (Nota dall'audit AR di Galleria, 19/10.)
