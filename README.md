# PRISMA — sito dello studio

Sito vetrina di PRISMA (@prisma.mov): portfolio, sistema contenuti, formati con forbici di prezzo, caso studio Isabella Pistillo. Italiano e inglese.

## Dove si cambiano le cose

- **Testi, lavori, prezzi, contatti**: `src/data.js` (unico file da toccare per i dati).
- **Traduzioni inglesi**: `src/i18n.js` (l'italiano è scritto direttamente in `index.html`).
- **Video**: `public/media/<id>/web.mp4` (leggero, per il sito) e `poster.jpg`; originali per il tasto "scarica" in `public/originali/<id>.mp4`.
- **Contatti segnaposto** (WhatsApp, email, link sito foto): `CONTATTI` in `src/data.js`.

## Struttura

Quattro schermate senza scroll (apertura col prisma, Lavori, Formati, Studio) più la pagina del caso studio. Codice: `src/app.js` (home), `src/case.js` (caso studio), `src/tetra.js` (prisma), `src/player.js` (lettore video), stili in `src/styles/v2.css`.

## Comandi

```
npm install
npm run dev      # anteprima locale
npm run build    # crea la cartella dist
```

## Pubblicazione

Netlify, sito `prismamov.netlify.app`, collegato a questo repo: ogni push su `main` pubblica. Impostazioni in `netlify.toml`. Il modulo contatti usa Netlify Forms (form `contatto`).

## Aggiungere un lavoro

1. Comprimi il video: `ffmpeg -i sorgente.mov -an -vf "scale=720:-2,fps=25,format=yuv420p" -c:v libx264 -crf 27 -movflags +faststart public/media/<id>/web.mp4`
2. Poster: `ffmpeg -ss 1 -i sorgente.mov -frames:v 1 -vf scale=1080:-2 public/media/<id>/poster.jpg`
   Anteprima al passaggio (4 secondi): `ffmpeg -ss 2 -t 4 -i public/media/<id>/web.mp4 -an -vf "scale=400:-2,fps=24" -c:v libx264 -crf 31 -movflags +faststart public/media/<id>/preview.mp4`
3. Originale: `ffmpeg -i sorgente.mov -c:v libx264 -crf 20 -c:a aac -b:a 192k -movflags +faststart public/originali/<id>.mp4`
4. Aggiungi una voce in `LAVORI` dentro `src/data.js`.

## Versioni da confrontare (27/10/2026)
- `/` versione attuale (v2).
- `/a/` Versione A, libertà creativa: sala di montaggio con monitor, ispettore e timeline di tutti i lavori. Codice in `a/` e `src/a/`.
- `/b/` Versione B, sulla traccia di nataschavavrina.com: nome spezzato, video a tutto schermo, indice di titoli. Codice in `b/` e `src/b/`.
- Parti comuni in `src/shared/works.js`. Video della home B: `public/media/_reel/reel-h.mp4` (orizzontale) e `reel-v.mp4` (verticale).
- Le due versioni hanno `noindex`, per non fare concorrenza al sito attuale su Google.
