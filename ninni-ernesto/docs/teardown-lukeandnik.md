# Teardown: Luke & Nik (lukeandnik.co.uk/?c=158)

Smontato dal tuo Mac il 27/10/2026 (il sito non si apre dal server cloud). Serve per la versione B del sito foto, «ispirata».

## In breve
Un sito senza pagine che scorrono: le foto attraversano lo schermo in diagonale, una dopo l'altra, su un fondo pieno che sceglie chi guarda. Tutto il testo è piccolo, in un solo font e un solo peso. L'unica cosa grande è l'Indice. L'interfaccia è in «differenza»: il testo bianco si inverte sopra le foto e sopra il colore.

## Struttura
1. Header fisso: logo al centro (150×38 su computer, 120×30 sul telefono).
2. In alto a sinistra: una frase di presentazione su due righe, sotto «Index · Email · Instagram».
3. In alto a destra: un quadratino bianco 20×20. Si apre in una barra da 200 px che cambia il colore di fondo.
4. Home: le foto in movimento, a tutto schermo, senza scroll.
5. Clic su una foto: si ferma tutto, la foto va a tutto schermo, le altre volano via, poi compaiono titolo, Close, contatore «1/13» e le frecce.
6. Index: un pannello che sale dal basso, con i filtri All / Motion / Stills e le voci numerate in grande.

## Tipografia
- Un solo font: ABC Monument Grotesk Regular 400. Da noi c'è Host Grotesk, gratuito e molto vicino.
- Testo: 1rem, interlinea 120 %, spaziatura +0,02em, mai grassetto né maiuscolo.
- Index: 4,5vw su computer e 8,5vw sul telefono, spaziatura −0,02em, interlinea 1.

## Colore
- Fondo pieno lungo un gradiente: bianco → rosso #DD5754 → giallo #E6C40E → verde #7FA137 → blu #344DBA → viola #790DCB → nero. Il parametro c=158 dà il viola rgb(115,12,192).
- Il testo fisso è bianco in `mix-blend-mode: difference`: sul viola diventa verde lime, sulle foto il loro negativo.
- Le voci secondarie e i link già visti sono al 40 %.

## Movimento
- Curva unica: cubic-bezier(.5,0,.5,1).
- Ogni foto ha una misura (piccola 0,5, media 0,75, grande 0,9 dello schermo). Va da +100vw a −100vw, alternando i lati, e sale o scende di una quantità fissa. È un moto lineare di 3–4 s, che si sovrappone alla foto precedente.
- Il nastro va da solo piano. La rotella lo sposta, il trascinamento di più, e gira all'infinito.
- Il clic porta la foto a tutto schermo in 750 ms.
- L'Index sale da translateY(100 %) in 0,8 s.
- Un solo breakpoint, a 1000 px.

## Interazioni
- Index: al passaggio del mouse il numero diventa la miniatura e il titolo si sottolinea (0,05em, offset 0,1125em).
- I filtri nascondono le voci con visibility, così i vuoti restano.
- Easter egg: dopo 90 s fermi compaiono foto ritagliate a forme.

## Da prendere
- Il nastro di foto in home, con lo zoom al clic.
- Il fondo a scelta, salvato nel browser.
- L'interfaccia in differenza.
- Il font unico a 1rem.
- L'Index a tutto schermo con numeri e miniature.
- La curva unica.

## Da evitare, o cambiato per un negozio
- **Header fisso trasparente sulle pagine che scorrono.** Sul testo diventa illeggibile, quindi fuori dalla home l'header ha il fondo pieno.
- **Niente prezzi in vista.** Da noi, passando sopra una foto, in basso compaiono titolo, edizione, copie rimaste e prezzo.
- **Filtri Motion/Stills.** Sono diventati Tutte / Edizioni / Stampe.
- **Easter egg.** Lasciato fuori: pesa e distrae dall'acquisto.
- **Tutto il sito senza scroll.** Le schede, il carrello e il checkout scorrono come nella versione attuale, perché lì si compra.

## Specifica di stile usata
| Elemento | Valore |
|---|---|
| Font | Host Grotesk 400 (500 solo nel logo) |
| Testo | 1rem / 1.2 / +0.02em |
| Grande | 4.5vw (≥1000 px), 8.5vw sotto, −0.02em, interlinea 1 |
| Fondo | gradiente 0–1000, predefinito 158 = rgb(115,12,192) |
| Testo su fondo | bianco o nero secondo la luminosità |
| UI fissa | bianco + difference (in home) |
| Curva | cubic-bezier(.5,0,.5,1) |
| Index | sale in 0,8 s, due colonne da 1000 px |
| Breakpoint | 1000 px |
