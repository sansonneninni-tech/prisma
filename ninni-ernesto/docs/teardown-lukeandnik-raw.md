# Luke & Nik (lukeandnik.co.uk) — dati grezzi del teardown (dal Mac di ninni, 27/10)

## Passo 1: CSS
- 1 foglio /assets/css/styles.css (17 KB, 190 regole). JS: scripts.js (60 KB, Keen Slider + animazione propria rAF/lerp/rotella; durate 250/350/500/750/850 ms). Niente GSAP/Lenis/Barba.
- Font: solo "ABC Monument Grotesk" Regular 400 (fallback Helvetica Neue/Arial). Logo = immagine wordmark 120×30 telefono / 150×37,6 computer, centrato in alto a 1rem.
- Testo: body 1rem, interlinea 120%, spaziatura .02em, peso 400 ovunque, niente maiuscolo. Unico testo grande: voci dell'Index 4,5vw computer / 8,5vw telefono, spaziatura -.02em, interlinea 1em. sup .625em.
- Colori: fondo nero #000, testo bianco #fff. Voci secondarie opacità .4; link visitati dell'indice bianco 40%; bordi rgba(255,255,255,.2) / rgba(0,0,0,.24) in chiaro. Selettore colore di fondo: #FFF → #DD5754 → #E6C40E → #7FA137 → #344DBA → #790DCB → #000 (body.is-dark).
- Trucco chiave: mix-blend-mode: difference su header, nav, contatore, frecce, barra video (testo bianco che si inverte sulle foto).
- Layout: niente griglia CSS. html/body position:fixed, overflow:hidden (niente scroll nativo). Home = #projects-animation fisso 100vw×100vh, ogni .project position:absolute, messo e scalato in JS (transform-origin 50% 50vh), mosso dalla rotella. Clic su un'immagine → quel progetto diventa uno slider a schermo intero (Keen), media centrato, max 100%.
- Movimento: Index sale dal basso translateY(100%)→0 in .8s cubic-bezier(.5,0,.5,1). UI del progetto in dissolvenza .5s stessa curva. Header .25s ease. Selettore colore scaleX(.1→1) .5s, pallino scale 0→1 .25s con ritardo .325s. Curva principale ovunque: cubic-bezier(.5,0,.5,1).
- Un solo breakpoint: 1000px. Hover solo con pointer:fine.
- Cursore pointer su nav e immagini non aperte. border-radius 50% solo sui pallini dello slider. Niente forme ritagliate.
- Regole:
  - #site-header{position:fixed;top:0;left:50%;padding:1rem;mix-blend-mode:difference;transform:translate(-50%)}
  - .nav-item{margin:0 .5rem} .nav-filter,.nav-item-secondary{opacity:.4} .nav-filter.is-active{opacity:1;text-decoration:underline}
  - #home-header{max-width:26rem;color:#fff;mix-blend-mode:difference} p{margin-bottom:.5rem}
  - #index{position:fixed;inset:0;overflow-y:auto;transform:translateY(100%);transition:transform .8s cubic-bezier(.5,0,.5,1)} .is-active → 0
  - #index-content{padding-top:2rem} .index-link{display:inline-flex;width:calc(50% - 2px);font-size:4.5vw;letter-spacing:-.02em;line-height:1em} (telefono: 100%, 8.5vw, padding 0 1rem)
  - .index-link-number{width:1.25em;text-align:right}; al passaggio il numero è sostituito da una miniatura del progetto larga quanto il numero.
  - filtro Motion/Stills: visibility:hidden sulle voci escluse (i vuoti restano).
  - hover voce indice: sottolineato .05em, offset .1125em.
  - .project-header{height:2.75rem;mix-blend-mode:difference} .slider-counter{right:1rem;height:3.375rem;tabular-nums}
  - .slider-button{top:50vh;width:3.75rem;height:3.75rem} (telefono: barra in basso 3.375rem con prec/succ)
  - .project-ui{opacity:0;transition:opacity .5s} body.show-project-ui → 1

## Passo 2: HTML e funzionamento della home
- Kirby CMS, sito DVTK. JS: Anime.js v4 + Keen Slider, tutto AJAX (pushState).
- Ordine del body: 1) header#site-header: h1 "Luke & Nik" (wordmark PNG), centrato, fisso, difference. 2) #color-picker: range 0–1000 nascosto in alto a destra 200×20, cambia il colore di fondo lungo il gradiente. 3) #projects-animation: nav telefono (Info, Index in alto a sinistra, opacità .4); #home-header in alto a sinistra (max 26rem): frase "Luke & Nik are multidisciplinary artists with / a focus on photography & moving image." + nav Index, Email, Instagram; 31 a.project (href /home/slug, background-color = colore dominante, data-size s|m|l) ognuno con TUTTA la galleria (slider > slide > figure.media-wrapper.is-portrait|is-landscape > img lazy); footer "Website by DVTK". 4) barra video in basso 54px. 5) #project-data in alto a sinistra: titolo + info (prezzo, link Stripe, crediti). 6) "Close" in alto a destra (bianco 40%), contatore "3/12" in basso a destra, frecce triangolari SVG 60×60 ai bordi, centrate in verticale. 7) #index: header con filtri All / Motion / Stills e Close; voci: numero (al passaggio diventa miniatura) · " . " · h3 titolo; 2 colonne computer (4,5vw), 1 telefono (8,5vw). 8) easter egg: dopo 90 s fermi compaiono foto ritagliate a cerchio/quadrato/triangolo (PNG) in difference; passandoci sopra spariscono.
- Animazione della home (la firma del sito): niente scroll. Ogni progetto scalato per misura (s 0,5, m 0,75, l 0,9 dello schermo) attraversa lo schermo su una timeline: translateX da +100vw a −100vw (alternato sinistra/destra), translateY da R vh a −R (R entro ±75vh, casuale ma fisso dal nome), lineare, 3–4 s ciascuno, sovrapposti (ognuno parte all'80% del precedente). Le immagini passano in diagonale su nero, una dopo l'altra, incrociandosi.
- La timeline va da sola piano (velocità 0,05) e si "scorre" con rotella (deltaY×1) e trascinamento (×3), avanti e indietro, in loop.
- Clic su un'immagine: la deriva si ferma (350 ms), il progetto va in primo piano e si porta a schermo intero (750 ms inOut(3)), gli altri volano fuori a ±150vw; dopo 500 ms compare l'interfaccia (titolo/info, Close, contatore, frecce). URL /home/slug. Poi slider tra le foto del progetto.
- Le voci dell'Index portano la timeline al progetto (seek inOut 2.5) e lo aprono.

## Passo 3: misure dal vivo
- "?c=158" = colore di fondo: rgb(115,12,192) viola (posizione 158/1000 sul gradiente). Logo e testo in difference → verde lime.
- Home 1440×900: fondo pieno, niente griglia. In alto a sinistra (16px) la frase su due righe a 16px, blocco 384×38 a x16 y14; sotto a 12px "Index  Email  Instagram" (spazio ≈20px). Logo centrato 150×38 a y16. Quadratino bianco 20×20 in alto a destra = selettore colore (si apre in barra 200px). 3–4 immagini grandi a schermo insieme, sovrapposte fra loro e al testo, in deriva diagonale. Niente bordi, raggi, ombre, didascalie in home. l ≈ 90% dell'altezza (810px su 900).
- Telefono 390×844: "Info / Index" impilati in alto a sinistra (opacità .4), logo 120×30 centrato, quadratino in alto a destra. l = 351px di larghezza, m 293, s 195. Trascinamento ×3.
- Esempio di transform: "translateX(-100vw) translateY(-33.75vh) scale(0.75)".
- Index computer: sale dal basso (.8s), stesso colore di fondo, testo in contrasto. Barra in alto y≈24: "All Motion Stills" centrati, inattivi 40%, attivo sottolineato; "Close" in alto a destra 40%. Lista in 2 colonne da 720px, 4,5vw ≈ 65px, interlinea 1. Riga = "N ." + titolo, con uno spazio diverso per ogni riga (sfalsamento casuale in JS): i bordi sinistri dei titoli fanno zig-zag. Titoli lunghi su 2 righe. Hover: sottolineato sottile e il numero diventa una miniatura (~80×100). Visitati al 40%.
- Index telefono: 1 colonna 8,5vw ≈ 33px; barra in alto 52px con filetto sotto: cerchietto vuoto (mostra miniature al posto dei numeri), "All Motion Stills Close" su tutta la larghezza.
- Progetto: l'immagine cresce a schermo intero (750ms) mentre le altre volano fuori. Media centrato grande quanto ci sta, fasce nel colore di fondo. UI in difference: titolo in alto a sinistra (16px), logo al centro, "Close" in alto a destra (40%), frecce a triangolo pieno ai bordi (60×60), barra in basso 54px (video), contatore "1/13" in basso a destra. Info/crediti/prezzo sotto il titolo. Niente miniature.
