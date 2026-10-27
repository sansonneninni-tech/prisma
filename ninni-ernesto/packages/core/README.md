# @ne/core — base comune dei 3 siti

Stato: **pronto** (v0.3.0, 19/10/2026; novità in `CHANGELOG.md`). Test unitari e prova in Chromium passano. Collegato ai dati veri
(`dati/opere.json`, `assets/manifest.json`, `testi/*.json`).

Questo pacchetto contiene la logica che i tre siti (Casa, Galleria, Editoriale) hanno in comune:
dati delle opere, immagini, lingue, carrello, prezzi con IVA e spedizioni, rate finte, checkout finto,
anteprima dell'email d'ordine, form commissioni/contatti/lista d'attesa, realtà aumentata (vedi `AR.md`).

**Non contiene stile di design.** I componenti producono HTML semantico con classi `isa-…`,
attributi `data-…` e qualche variabile CSS (`--isa-…`). Ogni sito li veste con il suo CSS.
Se un componente non basta, si usa la logica (store e funzioni) con il proprio markup.

Indice: [1. Collegare un sito](#1-collegare-un-sito) · [2. Cosa si importa](#2-cosa-si-importa) ·
[3. Catalogo e immagini](#3-catalogo-e-immagini) · [4. Lingue](#4-lingue) · [5. Prezzi, IVA, spedizioni, rate](#5-prezzi-iva-spedizioni-rate) ·
[6. Carrello](#6-carrello) · [7. Checkout finto](#7-checkout-finto) · [8. Email](#8-email-di-conferma) ·
[9. Form](#9-form) · [10. Componenti](#10-componenti-elenco-e-classi) · [11. Accessibilità](#11-accessibilità) ·
[12. Netlify](#12-pubblicazione-su-netlify) · [13. Cosa resta](#13-cosa-resta-da-fare--da-confermare) · [14. Sviluppo](#14-sviluppo-del-pacchetto)

---

## 1. Collegare un sito

`sites/<nome>/package.json`:

```json
{
  "dependencies": { "@ne/core": "*", "astro": "7.4.0" }
}
```

`sites/<nome>/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import isabellaCore from '@ne/core/integration';

export default defineConfig({
  site: 'https://<nome>.netlify.app',
  trailingSlash: 'always', // facoltativo: i link generati dal core lo rispettano
  integrations: [isabellaCore()],
});
```

L'integrazione fa da sola:
- **i18n di Astro**: `it` predefinita, `en`, `zh`; URL sempre con prefisso (`/it/…`, `/en/…`, `/zh/…`);
- **immagini**: serve `siti/assets/` su `/assets/` in sviluppo e in build copia `opere/`, `foto/` e `ar/` in `dist/assets/`;
- **`_headers` per Netlify**: tipo corretto per i modelli 3D (`.usdz` → `model/vnd.usdz+zip`, `.glb` → `model/gltf-binary`) e cache. Se il sito ha già `public/_headers`, le regole vengono aggiunte in fondo;
- passa al codice il prefisso delle immagini e l'impostazione `trailingSlash`.

Opzioni: `isabellaCore({ assetFolders, publicPath, i18n: false, netlifyHeaders: false, assetsDir })`.

Dall'alto della cartella `siti/`: `npm install`, poi `npm run dev:casa` (o `dev:galleria`, `dev:editoriale`).

### Pagine e routing

Le pagine stanno sotto `src/pages/[lang]/`. La radice `/` manda alla lingua del browser.

```
src/pages/index.astro                 → <LocaleRedirect />
src/pages/[lang]/index.astro          → /it/, /en/, /zh/
src/pages/[lang]/opere/[slug].astro   → scheda opera
src/pages/[lang]/carrello.astro
src/pages/[lang]/checkout.astro
```

```astro
---
// src/pages/[lang]/index.astro
import { localeStaticPaths, useTranslations, type Locale } from '@ne/core/i18n';
export const getStaticPaths = () => localeStaticPaths();
const lang = Astro.params.lang as Locale;
const t = useTranslations(lang);
---
<h1>{t('home.hero.A.titolo')}</h1>
```

```astro
---
// src/pages/[lang]/opere/[slug].astro
import { getArtworks, type Artwork } from '@ne/core/catalog';
import { LOCALES, type Locale } from '@ne/core/i18n';
export function getStaticPaths() {
  return LOCALES.flatMap((lang) => getArtworks().map((artwork) => ({ params: { lang, slug: artwork.slug }, props: { artwork } })));
}
const lang = Astro.params.lang as Locale;
const { artwork } = Astro.props as { artwork: Artwork };
---
```

```astro
---
// src/pages/index.astro
import LocaleRedirect from '@ne/core/components/LocaleRedirect.astro';
---
<LocaleRedirect />
```

Un esempio completo e funzionante di tutte le pagine è nel **playground**: `packages/core/playground/src/pages/[lang]/`.

---

## 2. Cosa si importa

| Import | Dove si usa | Cosa offre |
|---|---|---|
| `@ne/core/catalog` | solo nel frontmatter (server) | opere, stampe, Prossimamente, Proposte di Isa, foto, immagini, prodotti per il carrello |
| `@ne/core/i18n` | server | `useTranslations`, `localeStaticPaths`, `formatPrice`, percorsi per lingua |
| `@ne/core` | ovunque (server e browser) | tipi, prezzi, IVA, spedizioni, rate, formattazione, validazione, email |
| `@ne/core/cart` | browser (script/isole) | store del carrello (nanostores) |
| `@ne/core/checkout` | browser | stato del checkout, `PaymentProvider`, `DemoPaymentProvider` |
| `@ne/core/email` | ovunque | `renderOrderEmail()` → HTML + testo dell'email di conferma |
| `@ne/core/forms` | ovunque | validazione form commissioni, contatti, lista d'attesa |
| `@ne/core/ui` | browser | aiuti per form personalizzati (`showFieldErrors`, `readTranslator`, `announce`) |
| `@ne/core/config` | ovunque | tabelle modificabili: IVA, spedizioni, rate, stampe, Prossimamente, Proposte |
| `@ne/core/ar` | server | realtà aumentata (vedi `AR.md`) |
| `@ne/core/components/*.astro` | pagine | componenti senza stile (elenco al §10) |

Tutti gli importi sono in **centesimi di euro** (7.000 € = `700000`). Si formattano solo alla fine con `formatPrice()`.

> `catalog` e `i18n` leggono i file JSON: usarli solo nel frontmatter. Negli script del browser si passano
> i dati già pronti (gli esempi sotto lo fanno con `toCartProduct` e `pickStrings`).

---

## 3. Catalogo e immagini

I dati arrivano da `siti/dati/opere.json` (26 opere) e `siti/assets/manifest.json` (immagini). Il loader li
controlla con zod (se un file cambia forma la build si ferma con un messaggio chiaro) e li unisce in oggetti `Artwork`.

```ts
import {
  getArtworks, getArtwork, getArtworkBySlug, artworkAlt, artworkDescription,
  getPrints, getPrintOptions, getComingSoon, getProposals,
  getPhotos, getArtworkImage, getPhotoImage,
  toCartProduct, toPrintCartProduct,
} from '@ne/core/catalog';

getArtworks();                                   // Artwork[] (26), nell'ordine di opere.json
getArtworks({ status: 'available' });            // anche { orientation: 'portrait' }, { printable: true }
getArtwork('09');                                // per id
getArtworkBySlug('dea-alea');                    // per slug (dal titolo, senza accenti)
artworkAlt(artwork, 'en');                       // "Dea Alea — painting by Isabella Pistillo" se manca l'alt nei dati
artworkDescription(artwork, 'en');               // { text, lang: 'it' } — per ora le descrizioni sono solo in italiano
```

`Artwork` (campi principali):

```ts
{
  id: '04', slug: 'dea-alea', title: 'Dea Alea',
  status: 'available' | 'sold',        // 'sold' = "Venduta" (disponibilita "esaurito"; prezzo null)
  priceCents: 500000 | null,           // IVA 5% inclusa; null = venduta o prezzo su richiesta
  dimensions: { widthCm: 100, heightCm: 140 } | null,  // base × altezza
  dimensionsNote: '100 × 140 cm',      // testo originale (a volte con note, es. cornice)
  technique: string | null, frame: string | null, year: number | null,
  description: { it?: string; en?: string; zh?: string },
  orientation: 'portrait' | 'landscape' | 'square',
  aspectRatio: 0.7126, dominantColor: '#97a4ac', palette: [{ hex, share }],
  printable: boolean,                  // false per i fregi panoramici 24 e 25
  images: { canvas, thumbnail, full, detail1, detail2, signature },
  sourceUrl: 'https://isabellapistillo.com/…',
  quality: { confidence: 'high'|'medium'|'low', missingFields: ['anno', …], notes },
}
```

Varianti immagine (nomi del manifest tra parentesi): `canvas` (tela), `thumbnail` (miniatura 4:5),
`full` (totale, foto su fondo bianco), `detail1`/`detail2` (dettagli), `signature` (firma).

### Immagini responsive

```ts
const img = getArtworkImage('04', 'canvas', { width: 800 });       // anche { sizes: '(min-width: 1024px) 50vw, 100vw' }
// {
//   sources: [{ type: 'image/avif', srcset: '/assets/opere/04/opera-04_tela_480.avif 480w, …' },
//             { type: 'image/webp', srcset: '…' }],
//   src: '/assets/opere/04/opera-04_tela_806.jpg',   // fallback: il file più piccolo largo almeno 2 × width (mai più del JPEG originale)
//   width: 800, height: 1123,                          // mai più grande dell'originale
//   sizes: '(max-width: 800px) 100vw, 800px',
//   lqip: 'data:image/webp;base64,…', dominantColor: '#97a4ac', palette: [...]
// }
getPhotoImage('isabella-00', { width: 1200 });          // foto di Isabella/atelier: getPhotos({ group: 'ritratti' })
getArtworkImage('04', 'canvas', { width: 200 }).src;     // miniatura: src = file da ~480 px, non il JPEG grande
getArtworkImage('04', 'canvas', { width: 200, fallbackWidth: 'original' }); // come prima della 0.2.0: sempre il JPEG originale
```

Componente pronto:

```astro
<ArtworkPicture artwork={art} variant="canvas" width={800} lang={lang} class="hero__img" loading="eager" fetchpriority="high" />
<ArtworkPicture photoId="isabella-00" width={1200} lang={lang} alt="Isabella nel suo atelier" />
```

Produce `<picture class="isa-picture">` con AVIF/WebP, `width`/`height` e le variabili `--isa-lqip`,
`--isa-dominant`, `--isa-aspect` sul `<picture>`. Segnaposto sfocato, nel CSS del sito:

```css
.isa-picture { display: block; background: var(--isa-dominant) var(--isa-lqip) center / cover no-repeat; }
.isa-picture img { display: block; width: 100%; height: auto; }
```

### Stampe

```ts
getPrintOptions(artwork);
// { formats: [{ id: '50x70', widthCm: 50, heightCm: 70, prices: { paper: 13420, canvas: 28060 } }, …], fromCents: 10980 }
getPrints(); // [{ artwork, options }] per tutte le opere stampabili (anche quelle vendute)
```

Formati per orientamento: verticali 40×60, 50×70, 70×100, 100×150; orizzontali gli stessi girati (60x40…);
quadrati 50×50, 80×80, 100×100. Supporti: carta fotografica o tela (40×60 solo carta).
Listino in `src/config/prints.ts` (preso da "Dual Soul" sul sito attuale; i quadrati sono una proposta demo).
Tutti gli 8 formati di Dual Soul (anche 60×90, 80×100, 90×120, 90×150): `getPrintOptions(art, { formats: 'all' })`,
`getPrints({ formats: 'all' })`, `toPrintCartProducts(art, lang, { formats: 'all' })`, `<AddToCart printFormats="all">`.
Tela su telaio o in tubo: `canvasPrintPacking(formato, zona)` → `'stretcher' | 'tube'` (regola del negozio attuale, da confermare).
Preparazione prima della spedizione: `PREPARATION_BUSINESS_DAYS` (originali 5, stampe 3 giorni lavorativi) e `preparationDays(righe)`.

### Prossimamente e Proposte di Isa

```ts
getComingSoon();
// [{ id: 'fabric-art'|'vasi'|'candele-the-moon'|'abiti-dipinti', textIndex, maker, purchasable: false, palette,
//    indicativeDimensions /* vaso 22 × 32, candela 12 × 16: indicative */, examples }]
// testi: t(`prossimamente.voci[${c.textIndex}].nome`), .testo, .stato

getProposals();
// [{ id: 'rosso-notte', textIndex, original: Artwork, print: { artwork, format, material, priceCents }, object, palette }]
// testi: t(`proposte.set[${p.textIndex}].nome`), .colori, .testo
```

Le 4 proposte (in `src/config/proposals.ts`) partono dagli stessi quadri di Casa (dalla 0.3.0), **da far confermare a Isabella**:
Rosso e notte = 09 + stampa 10 + candela; Ocra di mezzogiorno = 25 + stampa 14 + vaso;
Smeraldo e oro = 18 + stampa 11 + candela; Petrolio e avorio = 21 + stampa 02 + vaso.
Un sito con set più ricchi (più pezzi, foto) tiene i suoi dati, come fa Casa.

---

## 4. Lingue

Lingue: `it` (predefinita), `en` (inglese americano), `zh` (cinese semplificato, con 您). Testi in `siti/testi/{it,en,zh}.json`
(chiavi in italiano, annidate; `{graffe}` = variabili). Il core aggiunge poche chiavi tecniche sotto `core.*`
(etichette ARIA, nomi delle 5 zone, messaggi del checkout): un sito può sovrascriverle.

```ts
import {
  useTranslations, localeStaticPaths, LOCALES, DEFAULT_LOCALE, LOCALE_TAGS,
  localizePath, switchLocalePath, getLocaleFromUrl, alternateLinks,
  formatPrice, formatDimensions, formatDate, formatDateRange, countryName, sep,
} from '@ne/core/i18n';

const t = useTranslations('en');
t('carrello.totale');                          // "Total"
t('carrello.aggiunto', { titolo: 'Strong' });  // variabili {graffe}
t('proposte.set[0].nome');                     // anche indici di array
t.raw<string[]>('checkout.prossimi_passi');    // array/oggetti così come sono
useTranslations('en', { en: { home: { titolo_extra: '…' } } }); // testi in più solo per un sito

formatPrice(350000, 'it');   // "3.500 €"
formatPrice(13420, 'en');    // "€134.20"
formatPrice(350000, 'zh');   // "€3,500"
formatDimensions({ widthCm: 100, heightCm: 140 }, 'en', { inches: true }); // "100 × 140 cm (39.4 × 55.1 in)"
formatDimensions({ widthCm: 100, heightCm: 140 }, 'zh');                    // "100 × 140 厘米" (come testi/zh.json)
// le misure hanno spazi non separabili (NBSP): non vanno mai a capo nel mezzo
formatDate(d, 'en');                          // "October 28, 2026"; in cinese scritto a mano: "2026年10月28日"
formatDateRange(da, a, 'zh');                 // "10月28日至29日"; 'it' → "28–29 ottobre" su una riga
sep('zh').dp;                                 // "：" (anche v, p, ap, ch, pv, el): punteggiatura fra due testi

localizePath('/opere/dea-alea', 'en');         // "/en/opere/dea-alea" (con "/" finale se trailingSlash: 'always')
switchLocalePath(Astro.url.pathname, 'zh');    // stessa pagina in cinese
alternateLinks(Astro.url.pathname, Astro.site); // per <link rel="alternate" hreflang>
```

In `<html lang>` usare `LOCALE_TAGS[lang]` (`it-IT`, `en-US`, `zh-CN`).

Selettore lingua: `<LanguageSwitcher lang={lang} />` → `<nav class="isa-lang" aria-label="Lingua"><ul><li><a hreflang lang aria-current>…`.
Con `short` mostra IT · EN · 中文. Ricorda la scelta (usata da `LocaleRedirect`).

Le chiavi `core.*` in cinese le ho tradotte io: come tutto `zh.json`, vanno fatte rivedere a un madrelingua.

---

## 5. Prezzi, IVA, spedizioni, rate

- **IVA**: 5% sugli originali, 22% sulle stampe (`src/config/vat.ts`). I prezzi sono già IVA inclusa; il riepilogo mostra
  "di cui IVA" e il dettaglio per aliquota. `VAT_OUTSIDE_EU = 'include' | 'exempt'` decide se togliere l'IVA per le spedizioni
  fuori UE (oggi `'include'`; da verificare col commercialista).
- **Spedizioni** (`src/config/shipping.ts`, l'unico file da toccare). Valori demo di ninni del 18/10, in attesa di conferma:

  | Zona | Paesi | Originali (a opera) | Stampe (a ordine) | Consegna |
  |---|---|---|---|---|
  | `italy` | IT, SM, VA | inclusa (0 €) | 12 € | 2–3 gg |
  | `eu` | Unione Europea, Monaco | 90 € | 25 € | 5–8 gg |
  | `uk-ch` | Regno Unito, Svizzera, Liechtenstein, Norvegia | 90 € (come Europa) | 25 € | 5–10 gg |
  | `world` | tutti gli altri | 180 € | 45 € | 7–12 gg |
  | `asia` | Cina, Hong Kong, Giappone, Corea, Singapore… | 180 € (come resto del mondo) | 45 € | 8–14 gg |

  Le zone UK/CH e Asia esistono già nel codice ma per ora hanno gli stessi valori del gruppo più vicino.
  Il modello supporta anche assicurazione (% sul valore, con minimo), sovrapprezzo per tele oltre 150 cm,
  costo per ogni stampa in più e soglia di spedizione gratuita: oggi sono a zero. Fuori UE compare la nota sui dazi.
- **Rate finte** (`src/config/installments.ts`): 3 rate senza interessi con Scalapay, ogni 30 giorni, da 50 € a 20.000 €. Solo calcolo e testo.

```ts
import { calculateTotals, calculateShipping, getShippingZone, calculateInstallments, splitVat, SHIPPABLE_COUNTRIES } from '@ne/core';

const totals = calculateTotals(lines, { country: 'DE' });
// { itemsCount, subtotalCents,
//   vat: [{ kind: 'original', rate: 0.05, grossCents, netCents, vatCents }, { kind: 'print', rate: 0.22, … }],
//   vatTotalCents, vatExempt: false,
//   shipping: { zone: 'eu', originalsCents, insuranceCents, printsCents, totalCents, freeShipping,
//               deliveryDays: { min: 5, max: 8 }, dutiesMayApply: false },
//   totalCents }
calculateInstallments(350000); // { eligible: true, count: 3, amounts: [116667, 116667, 116666], intervalDays: 30 }
```

Componenti: `<Price cents={art.priceCents} lang={lang} vatNote />` ("5.000 € · IVA 5% inclusa"; `null` → "Prezzo su richiesta";
`from` → "da 109,80 €"), `<InstallmentsNote totalCents={art.priceCents} lang={lang} t={t} />` (`t` facoltativo: il traduttore del sito).

---

## 6. Carrello

nanostores, salvato in `localStorage` (ogni accesso in try/catch: se non c'è, funziona in memoria), sincronizzato tra schede.
Originali: quantità massima 1. Stampe: una riga per formato + supporto, massimo 5 uguali (`MAX_PRINT_QUANTITY`, l'unico valore:
lo usano `maxQuantityFor`, `addToCart`, `setQuantity`).

```ts
import { $cart, $cartCount, $cartTotals, $cartCountry, $cartEvent,
         addToCart, removeFromCart, setQuantity, clearCart, setCartCountry, isInCart, pruneUnavailable } from '@ne/core/cart';

const result = addToCart(product); // { ok: true, line } | { ok: false, reason: 'max-quantity' | 'invalid-product' }
$cartCount.subscribe((n) => (badge.textContent = String(n)));
$cartEvent.listen((e) => { /* 'added' | 'removed' | 'quantity' | 'max-quantity' | 'cleared' — per un toast */ });
```

Il `product` si costruisce sul server, così il browser non carica il catalogo:

```astro
---
import AddToCart from '@ne/core/components/AddToCart.astro';
import { toCartProduct } from '@ne/core/catalog';
const product = toCartProduct(art, lang, { path: `/opere/${art.slug}` }); // null se venduta
---
<AddToCart product={product} lang={lang} />            <!-- originale -->
<AddToCart printOf={art} lang={lang} path={`/opere/${art.slug}`} />  <!-- stampa: scelta formato e supporto -->
```

Con markup proprio: `<button data-product={JSON.stringify(product)}>` e nello script `addToCart(JSON.parse(btn.dataset.product))`.

Nel layout, una volta sola: `<CartLiveRegion lang={lang} />` (annunci per lettori di schermo) e `<CartCount lang={lang} />` nell'header.
Pagina carrello: `<CartView lang={lang} />` (righe, quantità, paese, IVA, spedizione, consegna stimata, dazi, rate, link al checkout).

---

## 7. Checkout finto

Passi: **dati → spedizione → pagamento (DEMO) → conferma**. Nessun dato esce dal browser (verificato nella prova automatica).
I dati del cliente restano in `sessionStorage` come bozza; i dati della carta non vengono mai salvati.

```astro
---
import CheckoutFlow from '@ne/core/components/CheckoutFlow.astro';
import OrderEmailPreview from '@ne/core/components/OrderEmailPreview.astro';
---
<CheckoutFlow lang={lang}>
  <OrderEmailPreview slot="confirmation" lang={lang} headingLevel={3}
    theme={{ brandName: 'Isabella Pistillo', logoUrl: '/logo/logo-orizzontale.svg', accentColor: '#8a1c1c' }} />
</CheckoutFlow>
```

- Carta di prova `4242 4242 4242 4242` (data futura, CVC qualsiasi) → ordine confermato; `4000 0000 0000 0002` → "La banca ha rifiutato…"
  (se il totale è fuori dai limiti delle rate, il testo non propone le rate: `core.checkout.carta_rifiutata_senza_rate`);
  altre carte valide → "In modalità demo funziona solo la carta di prova". Le rate sono accettate (simulate) tra i limiti di `INSTALLMENTS`.
- Numero d'ordine finto: `IP-DEMO-2610-7K3F9Q`.
- A ordine confermato: carrello svuotato, ordine in `sessionStorage` (`getLastOrder()`), evento `isa:order-confirmed` su `document`.

**Per passare a Stripe** (lavoro di Gianluca): scrivere `StripePaymentProvider implements PaymentProvider`
(`src/checkout/payment.ts`: `prepare()` crea il PaymentIntent su un endpoint server e monta il Payment Element; `pay()` conferma)
e passarlo a `createCheckout({ lang, provider })`. Il resto non cambia. Con markup proprio:

```ts
import { createCheckout } from '@ne/core/checkout';
const checkout = createCheckout({ lang: 'it' });
checkout.$state.subscribe((s) => render(s));        // { step, customer, errors, formError, processing, order, … }
checkout.submitDetails(new FormData(form));         // false + errors se ci sono campi sbagliati
checkout.submitShipping(new FormData(form2));
await checkout.pay({ acceptTerms: true, card: { number, expiry, cvc, holder } });
```

Gli errori sono chiavi dei testi (`errori.email`, `errori.cap`…): `t(errors.email)`.
Per l'errore generale usare `checkoutErrorKey(state, t)`: restituisce `formErrorDetail` (es. carta rifiutata senza rate
possibili) se la pagina ha quel testo (`t.has`), altrimenti `formError`. Ricordarsi di passare la chiave
`core.checkout.carta_rifiutata_senza_rate` a `pickStrings` negli script client.

---

## 8. Email di conferma

```ts
import { renderOrderEmail } from '@ne/core/email';
import { useTranslations } from '@ne/core/i18n';
const { subject, html, text } = renderOrderEmail(order, {
  t: useTranslations(order.lang),
  baseUrl: 'https://casa.netlify.app',
  theme: { brandName: 'Isabella Pistillo', logoUrl: '/logo.svg', logoWidth: 160, accentColor: '#1a1a1a',
           backgroundColor: '#f4f1ec', surfaceColor: '#ffffff', textColor: '#1a1a1a', mutedColor: '#6b6560',
           borderColor: '#e4ded6', fontFamily: 'Helvetica, Arial, sans-serif', headingFontFamily: 'Georgia, serif' },
});
```

HTML a tabelle con stili inline (compatibile con i client email), in IT/EN/ZH, con badge DEMO e riga "Anteprima demo: questa email non è stata inviata".
`<OrderEmailPreview lang={lang} sample />` mostra un ordine d'esempio anche senza aver comprato (utile per una pagina "Vedi l'email").

---

## 9. Form

```astro
<CommissionForm lang={lang} prefill="Vorrei un quadro nello spirito di Emerald" />
<ContactForm lang={lang} topic="opera" prefill="Vorrei sapere di più su Strong" />
<WaitlistForm lang={lang} interest="candele-the-moon" />   <!-- "Mettiti in lista" di Prossimamente -->
```

Solo validazione nel browser e messaggio di conferma: nulla viene inviato. La commissione è narrativa (dove andrà il quadro,
racconta l'idea, una data, foto facoltativa JPG/PNG/HEIC ≤ 10 MB), non un configuratore.
Logica riusabile: `validateCommission(formData)`, `validateContact(formData)`, `validateWaitlist(formData)` → `{ valid, errors, data }`.
Per un form fatto a mano: `<Field>` + `showFieldErrors(form, errors, t)` da `@ne/core/ui`.
Con `{ group: true }` i campi vuoti finiscono in una riga sola del riepilogo: "Campi da compilare: Email, Telefono.".

---

## 10. Componenti: elenco e classi

| Componente | Props principali | Classi / stati da stilare |
|---|---|---|
| `ArtworkPicture` | `artwork`/`photoId`/`image`, `variant`, `width`, `sizes`, `lang`, `alt`, `loading`, `class`, `imgClass` | `.isa-picture`, `--isa-lqip`, `--isa-dominant`, `--isa-aspect` |
| `Price` | `cents`, `lang`, `kind`, `from`, `vatNote` | `.isa-price`, `__amount`, `__vat`, `--on-request` |
| `InstallmentsNote` | `totalCents`, `lang`, `short`, `t` | `.isa-installments`, `__demo` |
| `AddToCart` | `product` o `printOf`, `lang`, `path`, `printFormats`, `cartHref`, `label` | `.isa-add-to-cart(--original/--print)`, `__options`, `__option`, `__price`, `__button`, `__go`, `__note`, `[data-state=in-cart]` |
| `CartCount` | `lang`, `href`, slot (icona) | `.isa-cart-count`, `__n`, `[data-count="0"]` |
| `CartLiveRegion` | `lang`, `visible` | `.isa-cart-live` (nascosta di default) |
| `CartView` | `lang`, `checkoutHref`, `continueHref` | `.isa-cart[data-empty]`, `.isa-cart-line(--original/--print)` e figli, `.isa-cart-summary__row(--total/--vat/--vat-detail/--sub/--pending)` |
| `CheckoutFlow` | `lang`, `continueHref`, `termsHref`, `privacyHref`; slot `confirmation`, `payment-note` | `.isa-checkout[data-step][data-processing]`, `__steps`, `__step[aria-current][data-status]`, `__panel`, `__summary`, `.isa-error-summary` |
| `OrderEmailPreview` | `lang`, `theme`, `sample`, `headingLevel` | `.isa-email-preview`, `__frame` |
| `CommissionForm`, `ContactForm`, `WaitlistForm` | `lang`, `prefill`, `topic`, `interest` | `.isa-form`, `.isa-form__success`, `.isa-form__demo` |
| `Field` | `idPrefix`, `name`, `label`, `as`, `type`, `hint`, `required`, `options`, `checkControlClass` | `.isa-field(--check)`, `__label`, `__hint`, `__control[aria-invalid]`, `__check` (checkbox/radio), `__error` |
| `LanguageSwitcher` | `lang`, `short` | `.isa-lang`, `__link[aria-current]` |
| `LocaleRedirect` | `title` | pagina radice |
| `DemoBanner` | `lang`, `detail`, `dismissible` | `.isa-demo-banner`, `__close` |
| `ArViewer` | vedi `AR.md` | vedi `AR.md` |

L'unico CSS incluso è funzionale: `.isa-visually-hidden` (in `CartLiveRegion`).

---

## 11. Accessibilità

- Tutto si usa da tastiera; niente `div` cliccabili. Bottoni +/− e "Rimuovi" con etichette complete ("Rimuovi Strong dal carrello"); dopo una rimozione il focus va alla riga successiva.
- Ogni campo ha `<label>`; suggerimenti ed errori collegati con `aria-describedby`; `aria-invalid` sui campi sbagliati; al submit il focus va al primo errore e compare un riepilogo `role="alert"` con link ai campi.
- Carrello: `CartLiveRegion` annuncia "Strong è nel carrello" (`aria-live="polite"`); il totale aggiornato al cambio di paese viene annunciato.
- Checkout: passi con `aria-current="step"`; a ogni passo il focus va al titolo; bottone "Paga" con `aria-busy` durante l'elaborazione.
- Lingue: `hreflang` e `lang` su ogni link del selettore; descrizioni solo in italiano marcate con `lang="it"` (vedi playground).
- Rispettare nel CSS del sito il contrasto e `:focus-visible` (il core non mette stile).

---

## 12. Pubblicazione (Netlify, Vercel, nginx)

- Build: `npm run build -w sites/<nome>`, cartella da pubblicare `sites/<nome>/dist`.
- `dist/_headers` viene scritto dall'integrazione: `.usdz` con `Content-Type: model/vnd.usdz+zip` (serve ad AR Quick Look su iPhone),
  `.glb` con `model/gltf-binary`, cache di 7 giorni per `/assets/*`.
- Immagini e modelli 3D copiati pesano ~185 MB (tutte le varianti): nei limiti di Netlify. Per pubblicarne meno: `assetFolders`.
- `_headers` vale **solo su Netlify** (e Cloudflare Pages). Altrove servono le stesse regole nella configurazione del server.
  Senza il tipo giusto Safari scarica il `.usdz` invece di aprire la AR. Controllo dopo la pubblicazione:
  `curl -I https://…/assets/ar/01.usdz` → `content-type: model/vnd.usdz+zip`.

**Vercel** — `vercel.json` nella cartella del sito (Root Directory del progetto Vercel = `sites/<nome>`):

```json
{
  "headers": [
    {
      "source": "/assets/ar/(.*)\\.usdz",
      "headers": [{ "key": "Content-Type", "value": "model/vnd.usdz+zip" }]
    },
    {
      "source": "/assets/ar/(.*)\\.glb",
      "headers": [{ "key": "Content-Type", "value": "model/gltf-binary" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800" }]
    }
  ]
}
```

**nginx** — nel blocco `server` (o in `http`, accanto a `include mime.types;`):

```nginx
# i tipi di default di nginx non conoscono .usdz e danno .glb come application/octet-stream
types {
    model/vnd.usdz+zip  usdz;
    model/gltf-binary   glb;
}
location /assets/ {
    add_header Cache-Control "public, max-age=604800";
}
```

(Un blocco `types` dentro `server` sostituisce l'intera tabella per quel blocco: se il sito serve anche altri file
da lì, meglio aggiungere le due righe al file `mime.types` o metterle in una `location /assets/ar/ { types { … } }`.)

---

## 13. Cosa resta da fare / da confermare

- **Spedizioni**: tariffe demo di ninni in attesa di conferma (lun 19/10 ore 18). Assicurazione degli originali e dazi fuori UE da decidere.
- **IVA fuori UE** (`VAT_OUTSIDE_EU`) e trattamento IVA della spedizione: da verificare col commercialista.
- **Rate**: Scalapay (deciso il 19/10).
- **Proposte di Isa**: partono dagli stessi quadri di Casa; da far confermare a Isabella.
- **Stampe**: telaio o tubo (`canvasPrintPacking`) e tempi di preparazione (5/3 giorni) da confermare con Isabella.
- **Stampe quadrate**: prezzi proposti (il sito attuale dice solo "da 240 €").
- **Dati opere**: mancano anno, tecnica e alt per molte opere (`artwork.quality.missingFields`); descrizioni solo in italiano.
- **Stripe**: implementare `StripePaymentProvider` + un endpoint server (Netlify Functions) per il PaymentIntent e il webhook che invia l'email vera.
- Richieste dei siti al core: quelle di Casa (`direzioni/casa/richieste_core.md`, fino al 19/10) sono risolte
  nella 0.2.0 e nella 0.3.0; per ognuna `CHANGELOG.md` dice cosa è cambiato e quale rimedio locale Casa può togliere.
  Restano da confermare con Isabella (non sono lavoro del core): cornici di 18, 22, 26 e spessore vero delle tele (vedi `AR.md`).
  Le richieste di solo stile vanno nei siti.

---

## 14. Sviluppo del pacchetto

```bash
npm test -w packages/core                       # vitest: prezzi, IVA, spedizioni, rate, carrello, catalogo, i18n, checkout, form, email
npm run typecheck -w packages/core              # tsc
npm run check -w packages/core/playground       # astro check (anche dei componenti)
npm run build -w packages/core/playground && npm run test:e2e -w packages/core/playground   # prova in Chromium (Playwright)
npm run dev:playground                          # sito di prova interno
```

Struttura:

```
src/
  types.ts            tipi del dominio
  config/             TABELLE MODIFICABILI: vat, shipping, installments, prints, coming-soon, proposals
  catalog/            schema zod dei dati, loader, immagini, stampe
  i18n/               lingue, formattazione, percorsi, traduttore, testi core
  pricing/            IVA, spedizioni, rate, totali
  cart/               store nanostores + localStorage sicuro
  checkout/           validazione, PaymentProvider/DemoPaymentProvider, macchina a stati
  email/              template email di conferma
  forms/              validazione form
  ui/                 aiuti DOM per gli script dei componenti
  ar/                 realtà aumentata (altro operaio, vedi AR.md)
  integration.ts      integrazione Astro
components/           componenti .astro senza stile
playground/           sito di prova interno (non si pubblica) + tests/e2e.mjs
test/                 test unitari
```

Versioni: Astro 7.4.0, nanostores 1.5.5, zod 4.6.7, TypeScript 6.0.3, vitest 5.0.5, Node ≥ 22.22.0,
Playwright 1.56.1 (allineato ai browser preinstallati in `/opt/pw-browsers`).
