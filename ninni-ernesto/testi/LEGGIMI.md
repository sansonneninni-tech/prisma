# Testi dei siti demo — Isabella Pistillo

**Stato: BOZZA da far approvare a Isabella.** Versione 0.2, 19/10/2026 (core 0.3.0: inglese americano, cinese con 您, Scalapay, tempi 5/3).

## File

| File | Lingua | Note |
|---|---|---|
| `it.json` | Italiano | Testo di partenza |
| `en.json` | Inglese americano (*color*, *center*, *cart*): clienti a New York | Tradotto dall'italiano dopo la revisione anti-slop |
| `zh.json` | Cinese semplificato | **Traduzione automatica, da far verificare a un madrelingua prima di mostrarla a clienti** |

I tre file hanno le stesse chiavi (599 valori, verificato con uno script). Le chiavi sono in italiano e restano uguali in tutte le lingue: `home.hero.A.titolo`, `carrello.totale`, `legale.spedizioni.zone[0].originali`…

**Convenzioni**
- `[parentesi quadre]` = dato mancante da compilare (circa 90 punti).
- `{graffe}` = valore inserito dal sito: `{nome}`, `{email}`, `{totale}`, `{importo}`, `{numero}`, `{titolo}`, `{n}`, `{anno}`, `{base}`, `{altezza}`, `{prezzo}`, `{zona}`, `{data_da}`, `{data_a}`, `{italia}`, `{europa}`, `{mondo}`. Non vanno tradotte.
- `\n` negli indirizzi = a capo.

## I 3 claim di home (alternativi, non legati a uno stile fisso)

| | Claim | Sottotitolo |
|---|---|---|
| **A** — caldo, da casa (ispirato a Lulu and Georgia) | *Una parete si veste come una persona.* | Scegli il quadro come sceglieresti un vestito, partendo dai colori. Poi ti suggerisco io cosa metterci accanto: una stampa, un vaso, una candela. |
| **B** — silenzioso, da galleria | *La mia arte, il mio mondo.* | Acrilico su tela. Volti e figure di donna. Atelier ad Andria. |
| **C** — audace, editoriale | *Dipingere è un gioco. Lo prendo sul serio.* | Volti di donna scomposti alla maniera cubista, ad acrilico e spatola. Ogni quadro lo disegno prima nella mente, poi sulla tela. |

- A nasce dalla frase di ninni in riunione: "arredare un ambiente è praticamente come vestirsi".
- B è il claim che Isabella usa già sul sito attuale.
- C parte da una frase sua, "dipingere è un gioco", presa dal video di presentazione.

Il campo `home.hero.X.stile` serve solo come etichetta interna: non va mostrato in pagina.

## Fatti usati (e da dove vengono)

- Nata nel 1969 in Puglia; cubismo e Novecento; ritratti femminili; collaborazioni con l'architettura: dalla bio del sito attuale.
- Atelier in via Felice Orsini 69A, 76123 Andria (BT); email, telefono, Instagram e Facebook: dal sito attuale.
- Acrilico su tela, pennello e spatola: dalla scheda di Emerald sul sito attuale.
- Preparazione della tela con acrilico molto diluito e sfumato col bianco: dalla riunione, 42:30–43:10.
- "Mi metto di fronte una tela bianca… la disegno prima di aggiungere la materia", "è tutto nella mente", "dipingere è un gioco", "il mio primo pensiero dalla mattina e l'ultimo…": dal video di presentazione.
- "La persona si deve innamorare": riunione, 30:06.
- Commissioni in 20–30 giorni; corrieri Poste/GLS; stampe con o senza telaio: dalla pagina Spedizioni del sito attuale.
- IVA al 5% sugli originali e al 22% sulle stampe; Stripe: dalla riunione. Rate con Scalapay: decisione del 19/10.
- Ordine da New York: riunione, 00:06.
- Candele The Moon fatte da Francesca (stampi disegnati da lei: da confermare); vasi in ceramica e creta da sigillare; giacche e tailleur dipinti con colori per tessuto, in edizione limitata: dalla riunione, 30:30–31:04 e 44:09–45:43.
- Firma in basso a destra; ogni opera fotografata intera, in 2 particolari e nella firma: dall'inventario delle immagini.
- Palette dei 4 set: dall'inventario, sezione Palette.

## Segnaposto principali da compilare con Isabella e Francesca

1. **Bio**: formazione, mostre principali, premi, nomi delle collaborazioni con l'architettura (`bio.lunga[4]`, `bio.dato_formazione`).
2. **Statement**: i volti sono di persone reali o immaginate? (`statement.paragrafi[1]`)
3. **Schede opera**: anno di ogni opera e 2–3 righe di Isabella per ognuna (`scheda_opera.descrizione_segnaposto`).
4. **Certificato di autenticità**: c'è? (`etichette.certificato`)
5. **Firma sul retro**: nell'email di conferma ho scritto che firma l'opera anche sul retro. Va confermato (`email_conferma.corpo_originale`).
6. **Spedizioni**: tariffe per Italia, Europa e Mondo, tempi di preparazione e di consegna, corriere, soglia di spedizione gratuita (`legale.spedizioni.zone`, `etichette.tempi_*`, `carrello.tempi_*`). I tempi di 2–3 e 5–8 giorni vengono dal sito attuale; i 7–12 giorni per il resto del mondo sono una mia stima. Preparazione (valori demo del 19/10): 5 giorni lavorativi per gli originali, 3 per le stampe.
7. **Rate**: Scalapay (deciso il 19/10).
8. **Resi**: chi paga il reso, eventuali esclusioni oltre alle commissioni.
9. **Commissioni**: acconto e tempi di risposta (`commissioni.prezzo_testo`, `[N] giorni`).
10. **Prossimamente**: che cos'è esattamente la Fabric Art; quanti capi ci sono nell'edizione limitata.
11. **Proposte di Isa**: assegnare le opere ai posti `[opera NN]` dei 4 set ("Rosso e notte", "Ocra di mezzogiorno", "Smeraldo e oro", "Petrolio e avorio") e gli oggetti (vaso o candela).
12. **Mostre e stampa**: l'elenco è tutto da riempire. C'è anche l'evento moda di primavera, ancora da confermare.
13. **Fiscale**: P.IVA; IVA e dazi per le vendite fuori dall'UE; credito del sito nel footer.
14. **Atelier**: visite su appuntamento sì o no; orari; nome del fotografo per le didascalie.
15. **Newsletter**: quante lettere all'anno, al massimo (`footer.newsletter_testo`).

## Scelte di tono

- **Prima persona di Isabella** in home, bio lunga, statement, atelier, commissioni, prossimamente, carrello ed email ("ti mando il numero di tracciamento"). La **bio breve è in terza persona**, così si può usare per stampa e mostre.
- Isabella dà del **tu** al cliente. In inglese il registro è informale ma curato. In cinese si usa 您 (decisione del 19/10, per tutti i siti).
- **Prezzo discreto**: "da {prezzo}", "Prezzo su richiesta" e "Chiedi a Isabella" accanto ad "Acquista", come aveva chiesto ninni ("troppo mercato per il livello di Isa").
- **Commissioni senza aria da configuratore**: niente menu di opzioni (misura, colore, soggetto). Ci sono 5 fasi raccontate e un modulo con domande aperte ("Dove andrà il quadro?", "Raccontami l'idea", "C'è una data a cui tieni?").
- **Venduta**: l'etichetta rimanda alla pagina delle commissioni, così un'opera venduta non porta a un vicolo cieco.
- **Microcopy funzionale**: bottoni con un verbo e un oggetto; ogni errore dice cosa è successo e cosa fare dopo; nel carrello e nel checkout c'è poca voce di brand.
- **Demo**: banner "Modalità demo: nessun pagamento reale", carta di prova 4242 4242 4242 4242, rate simulate, email mostrata solo in anteprima.
- **Legale**: ogni pagina ha il banner "BOZZA", da far verificare a un legale o al commercialista. Il riferimento all'art. 59 lett. c del Codice del Consumo (niente recesso per le opere su commissione) va verificato.
- **"Nineteenth"**: non è citato, come proposto nella domanda 18.
- **Persone nelle foto**: nessun testo nomina le persone delle foto 13–28. La descrizione dell'atelier (stanza luminosa, pavimento a scacchi) l'ho tolta, perché non è ancora confermato che le foto siano state scattate lì.
- **Cinese**: i nomi di persona e di via sono traslitterati (伊莎贝拉·皮斯蒂洛, 费利切·奥尔西尼路). Negli indirizzi postali resta la grafia italiana. Gli errori su CAP e telefono sono adattati ai clienti stranieri: in italiano il CAP è "5 cifre", in inglese e cinese il controllo è generico.

## Controllo anti-slop

Ho riletto tutto l'italiano e l'inglese usando come checklist `strumenti/refero-design/references/anti-ai-slop.md` e `copywriting.md`. Ho cercato frasi generiche, tricolon automatici, "non solo… ma anche" e "non è X, è Y", parole gonfie, metafore vuote e chiusure a effetto. Ho anche cercato queste parole: viaggio, esplorare, unico nel suo genere, magia, emozione, passione, anima, senza tempo, cuore. In tutto ho corretto circa 30 frasi, e il cinese è tradotto dalla versione già corretta. Ecco 10 esempi:

| # | Problema | Prima | Dopo |
|---|---|---|---|
| 1 | Chiusura a effetto + "non è X, è Y" (statement) | "La mia arte, il mio mondo: non è uno slogan, è quello che metto in ogni tela." | "Alcuni colori tornano da un quadro all'altro: rosso cadmio, ocra, verde smeraldo, blu petrolio, il nero dei contorni. Spesso c'è un dettaglio d'oro." |
| 2 | Antitesi automatica (statement) | "Non cerco la somiglianza. Cerco il carattere." | "Smonto il volto e lo rimonto con poche linee nere e colori pieni. [Isabella: i volti sono di persone reali o immaginate?]" |
| 3 | Metafora vuota (statement) | "…ma anche il profilo che ha avuto un attimo prima, quello che pensa e non dice." | "Nello stesso viso metto l'occhio visto di fronte e il naso visto di profilo." |
| 4 | Chiusura a effetto (atelier, firma) | "Da lì il quadro non è più mio: aspetta la casa giusta." | "Poi il quadro viene fotografato intero, in due particolari e nella firma: sono le immagini che trovi nella sua scheda." |
| 5 | Frase a effetto senza contenuto (atelier) | "Il resto lo fa la luce." | "Nella scheda di ogni opera ci sono due particolari della superficie e la firma: aprili ingranditi per vedere i segni della spatola." |
| 6 | "Non X, ma Y" + tricolon (commissioni) | "Non parto da un catalogo di opzioni: parto da te, dalla stanza, da quello che vuoi sentire quando entri." | "Partiamo da una conversazione sulla stanza, sulla luce e su chi ci vive; il resto lo decidiamo insieme sul bozzetto." |
| 7 | Metafora vuota (proposte) | "Il rosso tiene la stanza sveglia, il nero la rende elegante." | "Per una parete scura, un ingresso o lo spazio dietro un divano nero. Il rosso è il colore dominante, l'oro compare in un dettaglio." |
| 8 | Tricolon decorativo (hero C) | "Volti spezzati, colori pieni, la spatola che lascia il segno." | "Volti di donna scomposti alla maniera cubista, ad acrilico e spatola." |
| 9 | "Non solo" (prossimamente) | "Il mio lavoro non sta solo sulla tela." | "Oltre ai quadri, in atelier sto preparando quattro cose nuove, alcune quasi finite." |
| 10 | Chiusura poetica + fatto non verificato (bio) | "…i quadri appoggiati alle pareti ad aspettare." / "Quando un quadro lascia l'atelier vorrei che succedesse una cosa sola: che chi lo guarda se ne innamori." | "Il mio atelier è in via Felice Orsini, ad Andria: tutti i quadri di questo sito sono nati lì." / "Le mie opere sono in case in Italia e all'estero. Una è partita per New York." |

Altre correzioni:
- "le sue forme, i colori del nostro mondo" (candele) → "una collaborazione tra noi due, con il suo marchio The Moon".
- "la luce del sud alle due del pomeriggio" → "colori caldi che stanno bene con il legno chiaro, il lino e le pareti bianche".
- "senza alzare la voce" → "toni freddi, pochi contrasti".
- "per come ti fa sentire" (hero A) → "partendo dai colori".
- "preparo per il viaggio" → "ricontrollo l'opera prima di imballarla".
- In inglese: "ready to travel" → "check the painting again before packing it"; "travelled to New York" → "was shipped to New York".

Cosa ho tenuto apposta:
- Le frasi vere di Isabella, anche quando sono "belle": "dipingere è un gioco", "La persona si deve innamorare" (come citazione separata), "La mia arte, il mio mondo".
- I passaggi del processo (tela, disegno, materia, spatola, firma) e le sequenze del checkout: sono elenchi di fatti, non tricolon decorativi.
- Il paragone con il vestito: è il concetto chiesto in riunione.
