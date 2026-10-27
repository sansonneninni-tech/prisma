# Changelog — @ne/core

## 0.3.0 — 19/10/2026: richieste di Casa (seconda parte) e decisioni del 19/10

Risponde alle richieste ancora aperte di `direzioni/casa/richieste_core.md`: sezioni "19/10 pezzo 11",
"19/10 Revisione pezzi 12–13", "19/10 Pezzo 8", "19/10 Revisione testi", "Date nel cinese" ed "Email d'ordine, misure
che vanno a capo". La numerazione continua quella della 0.2.0.
Cambiano anche i testi comuni (`siti/testi/*.json`, `LEGGIMI.md`).

**Compatibile con la 0.2.0**: nessuna API tolta o rinominata. Cambia l'output in questi punti:
- inglese americano e cinese con 您;
- `LOCALE_TAGS.en = 'en-US'`;
- misure con spazi non separabili;
- alt di ripiego senza trattino lungo;
- massimo 5 stampe uguali.

Verificato così:
- vitest 96/96 (nuovo `test/casa-requests-030.test.ts`);
- `tsc` e `astro check` del playground puliti;
- `sites/casa` compila senza toccare i suoi file: 236 pagine, 0 errori.

Il diff di Casa è descritto in fondo, in "Effetto su Casa".

---

### 15. Stampe: gli 8 formati di Dual Soul
- **Fatto, in modo facoltativo.** I prezzi di `dati/catalogo_altro.md` sono chiari. Per questo i 4 formati in più
  (60×90, 80×100, 90×120, 90×150) sono in `EXTRA_PORTRAIT_PRINT_FORMATS`.
  - Si accendono con `getPrintOptions(art, { formats: 'all' })`, `getPrints({ formats: 'all' })`,
    `toPrintCartProducts(…, { formats: 'all' })` e `<AddToCart printFormats="all">`.
  - `toPrintCartProduct` accetta sempre tutti gli 8.
  - Il valore predefinito resta di 4 formati, così Casa non cambia.
- **Non fatto:** i quadrati restano 3. Per Urban Soul il negozio dice solo "da 240 €": non ci sono prezzi chiari.
- **Casa può:** passare `{ formats: 'all' }` in `formatiStampa()` (`src/lib/stampe.ts`) se vuole la griglia "2 × 4".

### 16. Un solo massimo per le stampe uguali: 5
- **Fatto.** `MAX_PRINT_QUANTITY = 5` in `src/config/prints.ts` è l'unico valore. Lo usano `maxQuantityFor`,
  `addToCart`, `setQuantity`, la lettura del carrello salvato e `CartView`.
- **Casa può togliere:**
  - `MAX_STAMPE_UGUALI` in `src/lib/preparazione.ts` e `Math.min(…, MAX_STAMPE_UGUALI)` in `carrello-client.ts`;
  - `MAX_STAMPE` in `src/lib/stampe.ts`, usando `MAX_PRINT_QUANTITY`.

### 17. Tempi di preparazione e regola telaio/tubo nel core
- **Fatto.**
  - `PREPARATION_BUSINESS_DAYS = { original: 5, print: 3 }` e `preparationDays(righe)`, in `src/config/shipping.ts`:
    un ordine aspetta il pezzo più lento.
  - `canvasPrintPacking(formato, zona = 'italy')` dà `'stretcher'` oppure `'tube'`. In Italia va in tubo da 8.000 cm²
    (`TUBE_MIN_AREA_CM2`); all'estero sempre in tubo.
  - Sono valori demo da confermare con Isabella. Le schede del negozio dicono "SENZA telaio".
- **Casa può togliere:**
  - `PREPARAZIONE_GG` e `giorniPreparazione` (`preparazione.ts`);
  - `PREPARAZIONE_STAMPE_GG` e `spedizioneTela` (`stampe.ts`): `'stretcher'` vale `'telaio'`, `'tube'` vale `'tubo'`.

  La soglia è la stessa di Casa. Il core aggiunge solo la zona.

### 18. `INSTALLMENTS.providerLabel`
- **Fatto.** Ora vale `'Scalapay'`.
- **Casa può togliere:** niente, perché non usa il campo.

### 19. `maxQuantityFor('print')` = 10
- **Fatto** con la 16. `addToCart` e `setQuantity` si fermano a 5.

### 20. Testi comuni: `[Klarna / Scalapay]` e `[N]` di preparazione
- **Fatto** in it, en e zh.
  - Ovunque c'è "Scalapay": `etichette.rate`, `checkout.metodo_rate`, `legale.termini.sezioni[3]`, `legale.privacy.sezioni[3]`.
  - Tempi di 5 giorni (originali) e 3 (stampe): `etichette.tempi_*`, `email_conferma.tempi_testo`, `legale.spedizioni.preparazione`.
  - `demo.rate_finte` = "Nella demo le rate sono simulate: non parte nessuna richiesta.", come proposto.
  - I `[N]` rimasti non riguardano la preparazione: giorni di risposta, rimborso e newsletter. Restano da chiedere a Isabella.
- **Casa può togliere** da `src/i18n/demo.{it,en,zh}.json` queste chiavi, perché ora sono uguali ai testi comuni:
  `etichette.tempi_stampa`, `etichette.rate`, `checkout.metodo_rate`, `email_conferma.tempi_testo`,
  `legale.spedizioni.preparazione`.

  Deve invece tenere `etichette.tempi_originale` e `demo.rate_finte`, perché hanno parole sue.

### 21. `checkout.privacy_nota` ripete i link
- **Fatto.** Resta solo la prima frase ("Uso i tuoi dati solo per questo ordine.").
- **Casa può togliere** `checkout.privacy_nota` da `src/i18n/acquisto.{it,en,zh}.json`: ora è uguale.

### 22. Riepilogo errori: una riga per i campi vuoti
- **Fatto, facoltativo.** Con `showFieldErrors(form, errors, t, { group: true })` i campi con `errori.obbligatorio` (almeno 2)
  diventano una riga sola: "Campi da compilare: Email, Telefono.". Il testo è `core.checkout.campi_da_compilare`.
  - Con una stringa si raggruppa un'altra chiave d'errore.
  - Nuovo helper puro `groupedErrorFields`.
  - In tutte le righe del riepilogo la punteggiatura viene da `sep(lang)` (in cinese "：" e "、").
- **Casa può togliere** il raggruppamento in `mostraErrori` (`checkout-client.ts`) e passare `{ group: true }`.
  In più deve sovrascrivere `core.checkout.campi_da_compilare` con il suo testo, senza i due punti finali.

### 23. IVA della spedizione e IVA fuori UE
- **Non fatto, per decisione.** Resta una domanda per il commercialista (`TODO(commercialista)` in `src/config/vat.ts`).

### 24. Proposte di Isa: set del core diversi da quelli di Casa
- **Fatto.** `PROPOSALS` parte dagli stessi quadri di Casa (09 / 25 / 18 / 21). La stampa è la prima del set di Casa
  (10, 14, 11, 02). L'API non cambia. I set ricchi (5 pezzi, foto) restano nei dati del sito.
- **Casa può togliere:** niente, perché non usa `getProposals`.

### 25. Misure degli oggetti di Prossimamente
- **Fatto.** Nuovo campo `indicativeDimensions` in `COMING_SOON`: vaso 22 × 32, candela 12 × 16, gli altri `null`.
  Sono gli stessi valori indicativi di Casa, da confermare.
- **Casa può** leggere le misure da `getComingSoon()` invece di `w`/`h` in `src/data/proposte.json`.

### 26. Inglese americano e cinese con 您, alla fonte
- **Fatto** nei testi comuni, in `CORE_MESSAGES` e nei testi AR.
  - Sono le stesse regole di Casa (`INGLESE_AMERICANO`, `CINESE_CORTESE`), applicate ai file. In più ci sono "after shipping"
    (non "from dispatch") e "Apartment" (non "Flat").
  - `LOCALE_TAGS.en = 'en-US'`: le date escono come «October 28, 2026».
  - `meta.codice_lingua` = `en-US`. `LEGGIMI.md` è aggiornato.
  - Cambia la regola della 0.2.0 (§8): il cinese ora usa 您 ovunque. Il test controlla che non ci sia più 你.
- **Casa può togliere** da `src/lib/i18n.ts`: `INGLESE_AMERICANO`, `CINESE_CORTESE`, `adatta()` e `baseComune()`.
  Verificato: sui nuovi testi le regole non trovano più niente.
  Poi basta `CASA_TEXTS.en = unisciTesti(en, demoEn)`, e lo stesso per `zh`: i testi comuni e del core arrivano dal traduttore.

### 27. Separatori nel codice: `sep(lang)`
- **Fatto.** Nuovi export `sep(lang)` e `SEPARATORS`: le stesse chiavi di Casa (`v`, `dp`, `p`, `ap`, `ch`, `pv`) più `el`
  (elenco: "、" in cinese).
  - Usati in `ArViewer` (etichetta 3D + titolo) e in `artworkAlt`, che ora dà "Titolo, dipinto di…" invece di
    "Titolo — dipinto di…".
- **Casa può togliere** `SEPARATORI` e `sep` da `src/lib/i18n.ts`, e importare `sep` da `@ne/core`.

### 28. Componenti con traduttore proprio
- **Fatto.**
  - `InstallmentsNote` ha la prop `t`.
  - `ArViewer` ha la prop `t`: legge `core.ar.*`. I testi AR ora sono anche in `CORE_MESSAGES` e in `src/ar/testi.ts`.
    `testi` vince ancora su tutto.
- **Casa può:**
  - usare `<InstallmentsNote t={useT(lang)} />` al posto di `components/ui/Rate.astro`, se il markup le basta;
  - passare `t` ad `ArViewer` invece di `testi`.

### 29. Trattini lunghi nei testi comuni
- **Fatto** per `mostre.prossimo_testo`, `legale.banner_bozza` e `prossimamente.voci[3].stato`: ora c'è ":".
- **Non trovato:** le "opzioni lingua" non sono nei testi comuni (sono `casa.lingua.opzione_*`).
  I titoli SEO tengono il "—" come separatore.
- **Casa può togliere:** le sue sostituzioni di quei due testi, se le vanno bene.

### 30. Fatti non confermati nei testi comuni
- **Fatto.** In `prossimamente.voci` i fatti diventano domande per Isabella: "[Ogni pezzo è firmato?]",
  "stampi [disegnati da lei?]", "[Sono firmati?]".
  - "Ogni vaso è un pezzo unico" non è nei testi comuni.
- **Casa può togliere:** niente. Tiene il suo array: i testi comuni ora hanno segnaposto visibili.

### 31. Date nel cinese
- **Fatto.**
  - In cinese `formatDate` scrive a mano anno, mese e giorno: «10月28日», mai «10/28».
  - Nuovo `formatDateRange(da, a, lang, opzioni)`: «10月28日至29日», «28–29 ottobre», «Oct 28–Nov 3».
  - Il risultato sta su una riga: trattino con word joiner e spazi non separabili, come `intervalloDate` di Casa.
- **Casa può togliere** `intervalloDate` (`preparazione.ts`) e usare `formatDateRange(da, a, lang, { day: 'numeric', month: mese })`.
  Unica differenza: tra due mesi il core non mette lo zero davanti al giorno («3 nov», non «03 nov»).

### 32. Email d'ordine: misure che vanno a capo
- **Fatto.** `describeLine` scrive «Stampa 50 × 70 cm» con spazi non separabili (U+00A0), anche prima dell'unità.
  Vale per l'email, `CartView` e `CheckoutFlow`. Anche `formatDimensions` ora usa U+00A0, tranne lo spazio prima dei pollici.
- **Casa può togliere** in `checkout-client.ts` la sostituzione delle misure (`ck-nowrap` attorno a «50 × 70 cm»).
  Tiene quella del numero d'ordine. Anche `stretto()` in `lib/misure.ts` non serve più per le misure del core.

### Effetto su Casa (build prima/dopo, HTML con gli hash normalizzati)
236 pagine. 211 pagine hanno differenze. Le righe cambiate sono 1.500 e sono spiegate tutte da queste 6 sostituzioni:
1. `CartLiveRegion`, componente del core, in 156 pagine en/zh: «bag» → «cart», 购物袋 → 购物车.
   Prima l'adattamento di Casa non arrivava a questo componente, quindi è una correzione.
2. Alt delle miniature del carrello (JSON dei prodotti), in 165 pagine: «Titolo — dipinto di…» → «Titolo, dipinto di…»
   (zh «，»).
3. `data-locale="en-GB"` → `"en-US"` in 50 pagine opere/stampe en. Nessuno script lo legge.
4. Alt di `model-viewer` in 26 pagine zh: «3D 预览: » → «3D 预览：».
5. Checkout en: «Flat, floor, buzzer» → «Apartment, floor, buzzer».
6. Checkout en: `core.cart.consegna_giorni` «from dispatch» → «after shipping».

Script: cambiano solo `providerLabel` (Scalapay), il massimo 5 nel carrello e `en-US`. Il resto è codice spostato fra i chunk.
Nel browser cambiano ancora:
- il riepilogo errori in cinese («：»);
- le misure nell'anteprima email (NBSP, già coperte dallo stile di Casa).

---

### Dopo la verifica indipendente (19/10)
- `formatDateRange` in cinese con due date uguali scriveva «10月28日至28日»: ora una data sola, come in IT/EN (test aggiunto).
- `testi/en.json` `checkout.campo_cap`: «ZIP code / ZIP» → «ZIP code».

### Dall'audit AR di Galleria (19/10 sera, `direzioni/galleria/richieste_core.md`)
- P3: il messaggio `errore` dell'AR diceva di usare Chrome anche a chi è già su Chrome. Ora nomina i Servizi Google Play per AR (Android) e Safari (iPhone), in IT/EN/ZH.
- P1: le misure con o senza cornice di 18, 22 e 26 sono in `contesto/da_chiedere_a_isabella.md`. Se la cornice è inclusa: `override.json`, rigenerazione, `VERSIONE_MODELLI_AR` '4'.
- P2: in `AR.md` c'è la correzione da usare se sull'iPhone vero il quadro appare capovolto.

## 0.2.0 — 19/10/2026: richieste di Casa

Risponde a tutte le richieste di `direzioni/casa/richieste_core.md` (18/10 e 19/10).
**Compatibile con la 0.1.0**: nessuna API rinominata o tolta. Ci sono solo aggiunte, più tre correzioni di output
(misure in cinese, `src` di ripiego delle immagini con `width`, riga del metodo di pagamento nell'email) descritte sotto.
Verificato così:

- vitest 81/81 (nuovo `test/casa-requests.test.ts`);
- `tsc` e `astro check` puliti;
- Playwright sul playground 18/18 (3 nuovi controlli AR sulla nuova pagina `/[lang]/ar/`);
- `sites/casa` compila con il nuovo core senza toccare i suoi file (`astro build`: 94 pagine; `astro check`: 0 errori).

Ogni rimedio locale di Casa continua a funzionare. Toglierlo è facoltativo, quando fa comodo.

---

### 1. `Field`: checkbox e radio ereditano lo stile dei campi di testo
- **Fatto.** L'input checkbox/radio ha ora anche la classe `isa-field__check`. Per compatibilità mantiene
  `isa-field__control`, salvo `checkControlClass={false}`: con questa prop resta solo `isa-field__check` e lo stile
  dei campi di testo non arriva più alla casella.
- **Casa può togliere** la correzione `.isa-field--check > input.isa-field__control` in `styles/componenti.css`. Per farlo:
  - passare `checkControlClass={false}` ai `Field` di tipo checkbox, cioè a quelli in:
    - `RichiestaInfo.astro`
    - `checkout/index.astro`
    - `styleguide`
  - oppure usare `.isa-field__check` come selettore.

  Le regole su `.isa-field--check > input[type="checkbox"]` restano valide come sono.

### 2. Cinese: "cm" o "厘米"
- **Fatto.** Una sola forma: **厘米**, la stessa di `testi/zh.json` (`etichette.cm`, `etichette.misure_valore`).
  - `formatDimensions(…, 'zh')` ora dà `100 × 140 厘米`. Per it e en non cambia nulla.
  - `core.cart.stampa_dettaglio` usava già 厘米.
  - Nuova costante esportata: `CM_UNIT`.
- **Casa può togliere:** niente da togliere. Le misure in cinese ora coincidono con i testi comuni.

### 3. Opera 26: nota interna nel campo cornice
- **Fatto.**
  - In `dati/opere.json`, opera 26:
    - `cornice` = `"Tela con cornice"`
    - nuovo campo `cornice_note` con la nota interna
  - Schema zod: `cornice_note` è opzionale.
  - Tipo `Artwork`: nuovo campo opzionale `frameNote`, la nota da non pubblicare.
- **Casa può togliere** `cornicePubblica()` (`src/lib/scheda.ts`) e usare direttamente `artwork.frame`. Lasciarla non fa danni:
  sul dato pulito non trova più niente da togliere.

### 4. `ArViewer`: QR su viewport stretto senza AR
- **Fatto.** Il QR compare solo con finestra **≥ 768 px** e puntatore non `coarse`. Se la finestra cambia larghezza,
  il componente rivaluta.
  - Sotto quella soglia: `data-ar="non-supportato"`, senza avviso.
  - Sul telefono senza AR non cambia nulla: compare l'avviso.
- **Casa può togliere:** niente da togliere. Le regole su `data-ar="qr"` / `"non-supportato"` restano valide.

### 5. `ArViewer`: barra di caricamento visibile dopo il caricamento
- **Fatto.** A modello pronto il componente mette `data-modello="caricato"` e nasconde
  `::part(default-progress-bar)`. Con `nascondiBarra={false}` la barra resta visibile.
- **Casa può togliere** `model-viewer::part(default-progress-bar) { display: none; }` in `StanzaAr.astro`
  (circa riga 407). Attenzione: Casa la nasconde anche *durante* il caricamento; il core solo *dopo*. Se Casa la vuole
  sempre nascosta, tiene la sua riga.

### 6. `ArViewer`: QR "stessa pagina + hash"
- **Fatto.** Nuova prop `hashQr`, es. `hashQr="#stanza-ar"`. L'URL è calcolato nel browser: origin + path + query + hash.
  - `urlQr` / `data-url-qr` restano e vincono su `hashQr`.
- **Casa può togliere** in `src/lib/stanza-client.ts` (circa riga 316) la riga
  `viewer.dataset.urlQr = …${HASH_AR}` e passare `hashQr={HASH_AR}` ad `ArViewer` in `StanzaAr.astro`.
  Unica differenza: il core conserva la query string.

### 7. `@ne/core/ar`: misure dei modelli
- **Fatto.** Nuovi export `misureAr(id)` e il tipo `MisureAr`. Leggono `siti/assets/ar/index.json`:
  - forma restituita: `{ larghezzaCm, altezzaCm, profonditaCm }`, oppure `null`
  - accetta `'09'` o `9`
  - es. 09 → 90 × 90 (con cornice)

  È la stessa forma della funzione di Casa.
- **Casa può togliere:**
  - in `src/lib/stanza.ts`: l'import relativo `../../../../assets/ar/index.json`, la mappa `AR` e la sua `misureAr()`;
  - poi `export { misureAr, type MisureAr } from '@ne/core/ar';` per non cambiare gli altri import.

### 8. Testi AR cinesi con 您
- **Fatto.** `TESTI_AR.zh` usa **你**, come `testi/zh.json` (es. 在你的空间中查看). Un test verifica che nei testi
  cinesi del core non ci sia più 您.
- **Casa può togliere:** niente. Casa passa già i suoi testi con la prop `testi`. Può smettere di farlo se i testi del core le vanno bene.

### 9. Da confermare con Isabella: cornici di 18, 22, 26 e spessore vero delle tele
- **Nessun lavoro sul core.** È già in `AR.md` (§ Misure usate), aggiornato con il nuovo `cornice_note` della 26.
  Se cambiano le misure, si rigenerano i modelli (`scripts/ar/genera_ar.py`); `misureAr()` le segue da sola.

### 10. `renderOrderEmail`: `nowrap` sulla riga del metodo di pagamento
- **Fatto.** `white-space:nowrap` resta solo sugli importi. La riga del metodo (es. "In 3 rate senza interessi … — 3 rate da …")
  va a capo (`overflow-wrap:anywhere`), con 16 px di distanza dall'etichetta. La tabella resta a 600 px.
- **Casa può togliere** lo stile iniettato nell'anteprima dell'email.

### 11. `getArtworkImage(…, { width })`: `src` di ripiego sempre il JPEG più grande
- **Fatto.** Con `width`, `src` è il file più piccolo (JPEG o WebP) largo almeno **2 × width**:
  - mai più largo del JPEG originale, quindi mai più pesante di prima
  - es. `width: 200` → il file da ~480 px

  Nuova opzione `fallbackWidth`:
  - un numero sceglie la larghezza minima
  - `'original'` ripristina il comportamento della 0.1.0

  Senza `width` non cambia nulla. Vale anche per `getPhotoImage` e `ArtworkPicture`.
- **Casa può togliere** la scelta del webp più piccolo dal `srcset` per le miniature del carrello, e usare `img.src`.

### 12. Testo "carta rifiutata" che propone le rate anche quando non sono possibili
- **Fatto, in modo compatibile.** Con carta rifiutata e totale fuori dai limiti delle rate (oltre 20.000 €):
  - `formError` resta `errori.carta_rifiutata` (chi usa il core oggi non vede differenze);
  - il nuovo campo di stato `formErrorDetail` vale `core.checkout.carta_rifiutata_senza_rate`. Testo it/en/zh:
    "La banca ha rifiutato il pagamento. Prova con un'altra carta.";
  - nuovo helper `checkoutErrorKey(state, t)`: dà la chiave più precisa se la pagina ha quel testo, altrimenti `formError`;
  - `CheckoutFlow` lo usa già.
- **Casa può adottarlo** in `src/lib/checkout-client.ts` (circa riga 320) in due passi:
  1. aggiungere `'core.checkout.carta_rifiutata_senza_rate'` alla lista di `pickStrings` (`checkout/index.astro`);
  2. sostituire `t(s.formError, …)` con `t(checkoutErrorKey(s, t) ?? s.formError, …)`.

  Non c'era un rimedio locale da togliere.

### 13. iPhone senza WebGL: niente Quick Look
- **Fatto** secondo la proposta di Casa, in `src/ar/client.ts`.
  - **Intercettare l'errore.** Il `TypeError … 'supportsPresentation'` di model-viewer viene intercettato
    (`unhandledrejection`/`error` con `preventDefault`, una riga `console.info`). Non resta più come "uncaught", e
    `isa-ar-viewer` riceve `data-webgl="no"`.
  - **Quick Look diretto.** Si attiva quando `canActivateAR` è falso, oppure il modello o model-viewer non si caricano, e in più:
    - il browser supporta `<a rel="ar">` (`relList.supports('ar')`);
    - c'è `usdz`.

    Allora il bottone è visibile (`data-ar="disponibile"`, `data-quick-look="diretto"`) e apre un
    `<a rel="ar" href="…usdz#allowsContentScaling=0"><img></a>`.
  - Provato in Chromium simulando un iPhone senza WebGL. L'errore `supportsPresentation` si riproduce davvero ed è intercettato;
    il link ha l'URL giusto. Su un iPhone vero resta da provare (checklist in `AR.md` §5).
- **Casa può:**
  - tenere `data-no-webgl` sulla `.st` per la foto della tela, oppure usare `isa-ar-viewer[data-webgl="no"]`;
  - togliere il proprio test WebGL in `stanza-client.ts` (circa riga 25), se usa l'attributo del core.

  Attenzione: `data-webgl="no"` arriva solo quando model-viewer fallisce, non subito al caricamento.

### 14. README: content-type `.usdz`/`.glb` fuori da Netlify
- **Fatto.** README del core, §12: esempi di `vercel.json` e di configurazione nginx (`types { model/vnd.usdz+zip usdz;
  model/gltf-binary glb; }`), con il comando `curl -I` per controllare.
- **Casa può togliere:** niente da togliere.

### Altro in questa versione
- Playground: nuova pagina `/[lang]/ar/` (opera 09, `hashQr`, `misureAr`) e 3 controlli AR in `tests/e2e.mjs`.
- `AR.md` aggiornato:
  - nuove prop e nuovi attributi;
  - comportamento senza WebGL;
  - regola del QR;
  - `ar` è già tra le cartelle copiate dall'integrazione.
- Corretto nel README: le rate demo sono accettate solo tra i limiti di `INSTALLMENTS`. Il codice lo faceva già; il README diceva "sempre".
