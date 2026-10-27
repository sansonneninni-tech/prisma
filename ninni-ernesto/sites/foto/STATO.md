# Galleria: il sito è finito (aggiornato 20/10 notte, dopo le correzioni del secondo e ultimo audit finale)

**Pronto**
- Header, Indice (telefono, ora con la voce «Home» in cima), footer, cambio lingua, contatore del carrello (pezzo 1).
  Dal 22/10 (audit di ninni) nell'header c'è «Shop» con una piccola borsa, su ogni pagina tranne il checkout: porta alle Opere ed è sottolineato quando si è lì. Sotto 375 px resta solo la borsa; sotto 460 px nell'header resta solo la lingua corrente (le altre sono in cima all'Indice), così la riga non va a capo.
- Home: opere che cambiano ogni 2,5 s con Pausa e, sotto l'opera, titolo, misure, prezzo e «Acquista →» (porta alla sua scheda); nome gigante; mappa sulla foto dell'atelier (pezzo 2).
  Mappa dal 22/10: sul computer, sul tablet e col telefono in orizzontale Opere grande a sinistra (a tutta altezza, 6 opere intere), a destra Isabella sopra e Altro sotto, metà altezza ciascuno; l'elenco di Altro è in grande. Sul telefono i pannelli sono uno sotto l'altro: prima Opere, più alto, poi Isabella e Altro. Le opere della mappa si cambiano in `src/data/home.json`.
- Opere (`/it/opere/`): titolo gigante che si riduce scorrendo, schede Originali (26, vendute in fondo) e Stampe (24, `?vista=stampe`), «Filtra» con pannello da destra (Colore, Formato, Prezzo, Solo disponibili; per le stampe Colore e Forma), filtri nell'URL e conservati cambiando lingua, opere sempre intere (pezzo 3).
- Scheda dell'opera (`/it/opere/<nome>/`): opera intera, Originale / Stampa con formati e carta/tela, rate, dati e figura in scala, particolari a schermo intero, opera precedente/successiva, «Vedi sulla tua parete» (realtà aumentata su iPhone e Android, QR dal computer) (pezzo 4).
- Carrello: «Carrello (n)» apre da ogni pagina un cassetto da destra (righe, quantità, Rimuovi, totale, Procedi); pagina `/it/carrello/` con paese di consegna, spedizione, IVA 5% / 22%, consegna stimata, dazi fuori UE, rate (pezzo 5).
- Checkout dimostrativo `/it/checkout/`: 3 passi (dati, spedizione, pagamento), carta di prova 4242 4242 4242 4242 (la 4000 0000 0000 0002 viene rifiutata), rate, conferma «Grazie» con l'anteprima dell'email d'ordine. Nessun dato esce dal browser (pezzo 5).
- Altro (`/it/altro/`): Proposte di Isa · Prossimamente · Su commissione in grande; sul computer, passando col mouse, a destra compare un'immagine della voce (pezzo 6).
- Proposte di Isa (`/it/proposte/`): 4 abbinamenti (Rosso e notte, Ocra di mezzogiorno, Smeraldo e oro, Petrolio e avorio), ognuno con l'originale, una stampa da mettere nel carrello e l'oggetto in arrivo (candela o vaso) con «Avvisami»: finché non ci sono foto degli oggetti, al loro posto c'è un particolare del quadro con la didascalia «Titolo, particolare». I tre pezzi hanno la stessa altezza; sul telefono scorrono di lato (pezzo 6, revisione).
- Prossimamente (`/it/prossimamente/`): Fabric Art, Vasi, Candele The Moon, Abiti dipinti; toccando una voce si apre una striscia di immagini (particolari dei quadri, finché non ci sono foto degli oggetti), una frase e la lista d'attesa «Avvisami quando è pronto» (demo: nessuna email inviata). Il link `/it/prossimamente/#vasi` apre già la voce (pezzo 6).
- Isabella (`/it/isabella/`): ritratto, bio di due frasi, la sua frase sulla tela bianca, l'atelier (2 foto), i contatti (indirizzo con «Apri in Mappe», email, telefono, WhatsApp, Instagram, Facebook) e un modulo per scriverle. In alto un piccolo indice (Bio · Atelier · Contatti) che segue la lettura. «Chiedi a Isabella» dalla scheda di un'opera arriva qui col messaggio già scritto («Vorrei sapere di più su …»). Le mostre compariranno quando ci saranno i dati (pezzo 7).
- Su commissione (`/it/su-commissione/`): i 5 passi in una riga ciascuno, «Di solito 20–30 giorni», una foto di Isabella al lavoro che resta ferma accanto al modulo mentre si scrive, e il modulo come una conversazione: le sue domande in grande (Dove andrà il quadro? Raccontami l'idea. Hai una foto della parete? C'è una data? Come ti scrivo?). La foto resta nel browser. Dalle opere vendute si arriva qui con il messaggio già scritto (pezzo 7).
- Info (`/it/info/`): spedizioni e resi (tabella delle tariffe presa dal carrello, così è sempre uguale), termini, privacy e cookie, note legali, in una pagina; i vecchi indirizzi (`/it/privacy/`, `/it/termini/`, `/it/contatti/`…) portano al punto giusto (pezzo 7).
- Banner cookie in basso al primo arrivo, con «Accetta tutti» e «Solo necessari» uguali; non copre mai l'opera né il nome in home (anche sul telefono piccolo) e non fa saltare la pagina; la scelta si cambia da Info (pezzo 7, revisione).
- Pagina «non trovata»: «404» gigante, una riga, Opere e Home (pezzo 7).
- Nei moduli gli errori compaiono solo all'invio, in rosso con un riepilogo in alto, e spariscono appena il campo è a posto. Nessun messaggio viene inviato davvero (demo).
- In cinese tutto il sito dà del 您 (anche carrello e checkout).
- Styleguide di lavoro: solo in sviluppo (`npm run dev`, `/it/styleguide/`); nel sito pubblicato non c'è. Il riferimento resta `direzioni/galleria/styleguide.html`.

- Movimento (pezzo 8, rifatto il 22/10 dopo l'audit di ninni: «non è fluida», «pesante»): toccando un pannello della mappa in home (Opere, Isabella, Altro) la mappa si avvicina subito al pannello finché lo riempie; le immagini del pannello sfumano nel bianco e resta il titolo, che diventa il titolo della pagina senza salti (stesso posto e stessa grandezza, poi scivola al suo posto in 0,3 s) mentre il resto della pagina compare dal bianco (in tutto meno di un secondo e mezzo). Con «Indice» sul computer o con Indietro succede il contrario: la mappa, già pronta con le sue immagini, riparte ravvicinata sul pannello e torna intera. Gli altri cambi pagina sono una dissolvenza breve; l'header resta fermo. Su Opere le opere sono già al loro posto (niente più comparsa «a salire») e, passando col mouse, l'opera si ingrandisce un poco dentro la sua cornice. Sul computer un'etichetta nera accanto alla freccia dice cosa fa il clic («Apri», «Vedi», «Parete», «Ingrandisci», tradotta). Scorrimento normale del computer (niente più scorrimento «morbido»). Il sito è più leggero: niente librerie di animazione (GSAP e Lenis tolti), sull'apertura si scarica solo l'opera successiva. Cambiando lingua si resta allo stesso punto della pagina; con Indietro si torna dove si era. Il 22/10 sera (lavoro «animazioni fluide») le animazioni sono rimaste le stesse, con lo stesso aspetto e gli stessi tempi, ma sono più fluide: entrando in una pagina dalla mappa la pausa fra l'avvicinamento e il titolo che scivola al suo posto è circa dimezzata (la pagina nuova si prepara mentre la mappa si avvicina); tornando alla mappa il titolo non salta più, scivola dal titolo della pagina al pannello; il menu Indice sul telefono, la finestra «Vedi sulla tua parete», le voci di Prossimamente, la miniatura di Altro e il titolo grande di Opere che si riduce scorrendo si muovono senza ridisegnare la pagina a ogni fotogramma (prima la finestra della parete scattava all'apertura); la lente apre la foto grande già pronta. Dettagli e misure: `direzioni/galleria/revisioni/animazioni_fluide_22-10.md`.
- Con «riduci movimento» attivo nel telefono o nel computer: solo dissolvenze di 0,2 secondi, opere della home ferme, niente etichetta, niente ingrandimento delle opere al passaggio del mouse.

- Correzioni dopo il primo controllo finale (20/10 notte):
  - lo zoom fra la mappa e le pagine è più pulito: la pagina nuova si apre come una finestra netta dal pannello, senza trasparenze; il ritorno alla mappa parte subito dopo il clic;
  - sul telefono il tasto Indietro chiude Indice, Filtri e Carrello invece di cambiare pagina;
  - nella scheda la barra in basso «prezzo · Aggiungi» non copre più il prezzo e sta sopra il banner dei cookie;
  - Proposte sul telefono: «Aggiungi la stampa» sta sotto la striscia delle immagini, sempre visibile;
  - col telefono in orizzontale la mappa della home resta una mappa (come sul computer);
  - il riquadro «Firma» mostra la firma di ogni opera (inquadrata su misura); dove la foto non la mostra (Relax, Unique, Rory) il riquadro non c'è;
  - nelle opere panoramiche, sotto il titolo, misura e prezzo o «Venduta» si vedono subito; con una sola opzione «Originale» è una semplice intestazione;
  - nella mappa niente testi minuscoli; i titoli non fanno più saltare la pagina al caricamento;
  - a ordine concluso torna «Indice» nell'header; nella scheda in vista Stampa i dati dicono «Originale 100 × 80 cm» e non la firma a mano.

- Correzioni dopo il secondo controllo finale (20/10 notte, l'ultimo):
  - nello zoom fra la mappa e le pagine il pannello mostra la pagina intera in piccolo, che cresce fino a riempire lo schermo (e al ritorno si richiude nel pannello): niente più lettere tagliate o pannello bianco;
  - al tocco sul telefono non compare più il riquadro azzurro o grigio (da tastiera il bordo del fuoco resta);
  - le opere vendute che aprono su Stampa (Two) arrivano senza la barra in basso, che compare solo dopo aver passato il blocco d'acquisto; in vista Stampa non c'è più «Cornice inclusa»;
  - Proposte sul telefono: accanto all'originale panoramico si vede sempre un pezzo della stampa;
  - Indice sul telefono: voci alte almeno 44 px; col telefono in orizzontale su due colonne, tutte nella schermata;
  - «Sulla tua parete» sul computer: prima il QR, poi i 3 passi; con Tab il fuoco resta nel dialog e l'anteprima 3D ha il bordo del fuoco;
  - piccole rifiniture: footer cinese, «Isa’s Pairings», «给您。» che non resta solo a capo.

**Il sito è finito.** Due giri di revisione indipendente fatti (`direzioni/galleria/revisioni/`), nessun problema alto o medio aperto. Prove automatiche pulite su 8 larghezze × 3 lingue, telefono in orizzontale, riduci movimento e banner cookie.

**Da controllare su dispositivi veri** (le prove automatiche hanno usato solo Chromium)
- iPhone: «Vedi sulla tua parete» con Quick Look (quadro dritto sulla parete, in scala reale, verso giusto; prima prova con l'opera 25), margini con la tacca in orizzontale, tastiera vera nei moduli, Indietro che chiude Indice/Filtri/Carrello.
- Android: Scene Viewer sulla parete.
- Safari/WebKit (iPhone e Mac): lo zoom fra mappa e pagine (dal 22/10 animato sulla home vera, la view transition fa solo la dissolvenza finale), la sequenza della home, lo scorrimento.
- Prestazioni dello zoom A1/A2 su un computer vero con GPU e su un telefono medio (misure del 22/10 in Chromium senza GPU e CPU ×4: parte al clic, 1–2 fotogrammi lenti su ~38; `revisioni/lavoro_ninni_2.md`).
- Peso dei titoli cinesi su Mac e PC; la 404 nella lingua giusta dopo la pubblicazione su Netlify.

**Da chiedere a Isabella**
- Una foto della firma per Relax, Unique e Rory (ora la scheda non mostra il riquadro Firma).
- Se le opere panoramiche (Le Donzelle, Le Muse del Sole) avranno stampe.
- Se le misure di Emerald, Rory e Two comprendono la cornice (serve per la AR in scala reale).
- Le date e i luoghi delle mostre (la sezione compare quando ci sono), le foto degli oggetti (candele, vasi) che oggi in Proposte e Prossimamente sono sostituiti da particolari dei quadri.

**Da decidere con ninni** (lasciati aperti di proposito): un'altra opera per il pannello Altro della mappa, «Filtra» fermo in alto su Opere al telefono, la nota «testi dimostrativi» in cima a Info.
