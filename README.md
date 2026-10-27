# PRISMA — sito dello studio

Sito vetrina di PRISMA (@prisma.mov): portfolio, sistema contenuti, formati con forbici di prezzo, caso studio Isabella Pistillo. Italiano e inglese.

## Dove si cambiano le cose

- **Testi, lavori, prezzi, contatti**: `src/data.js` (unico file da toccare per i dati).
- **Traduzioni inglesi**: `src/i18n.js` (l'italiano è scritto direttamente in `index.html`).
- **Video**: `public/media/<id>/web.mp4` (leggero, per il sito) e `poster.jpg`; originali per il tasto "scarica" in `public/originali/<id>.mp4`.
- **Contatti segnaposto** (WhatsApp, email, link sito foto): `CONTATTI` in `src/data.js`.

## Comandi

```
npm install
npm run dev      # anteprima locale
npm run build    # crea la cartella dist
```

## Pubblicazione

Netlify, progetto `prisma-studio-sito`, collegato a questo repo: ogni push su `main` pubblica. Impostazioni in `netlify.toml`. Il modulo contatti usa Netlify Forms (form `contatto`).

## Aggiungere un lavoro

1. Comprimi il video: `ffmpeg -i sorgente.mov -an -vf "scale=720:-2,fps=25,format=yuv420p" -c:v libx264 -crf 27 -movflags +faststart public/media/<id>/web.mp4`
2. Poster: `ffmpeg -ss 1 -i sorgente.mov -frames:v 1 -vf scale=1080:-2 public/media/<id>/poster.jpg`
3. Originale: `ffmpeg -i sorgente.mov -c:v libx264 -crf 20 -c:a aac -b:a 192k -movflags +faststart public/originali/<id>.mp4`
4. Aggiungi una voce in `LAVORI` dentro `src/data.js`.
