/**
 * Titoli giganti che stanno sempre nella riga (DIREZIONE §2.2): larghezza della parola in em, calcolata sul server
 * da fit-larghezze.json (Inter Tight 560) + tracking + 3% di margine. Si usa come `--fit` in
 * `font-size: min(var(--t-title), calc(100cqw / var(--fit)))`. Niente script nel browser, niente salti.
 * Il cinese non serve (titoli a --t-title-zh): restituisce null.
 */
import tabella from './fit-larghezze.json' with { type: 'json' };

const L = tabella.larghezze as Record<string, number>;
const MEDIA = 0.56; // carattere non in tabella: larghezza media di una minuscola larga

/** Larghezza in em di una riga di testo a peso 560 con il tracking dato (em). */
export function larghezzaEm(testo: string, tracking = -0.04): number {
  const ch = [...testo];
  const somma = ch.reduce((s, c) => s + (L[c] ?? MEDIA), 0);
  return somma + tracking * Math.max(0, ch.length - 1);
}

/** Valore di --fit per un titolo (la riga più lunga, se va a capo), oppure null per il cinese. */
export function fit(testo: string, tracking = -0.04): number | null {
  if (/[㐀-鿿]/.test(testo)) return null;
  const righe = testo.split('\n');
  const max = Math.max(...righe.map((r) => larghezzaEm(r, tracking)));
  return Math.round(max * 1.03 * 1000) / 1000;
}

/**
 * Come `fit`, ma anche per le righe con ideogrammi (pezzo 6: voci giganti di Prossimamente in 中文, «Fabric Art 布面艺术»):
 * un ideogramma vale 1em, il resto come da tabella. Per i titoli cinesi a --t-title-zh resta `fit` (null).
 */
export function fitMisto(testo: string, tracking = -0.03): number {
  const ch = [...testo];
  const cjk = (c: string) => /[㐀-鿿　-〿＀-￯]/.test(c);
  const somma = ch.reduce((s, c) => s + (cjk(c) ? 1 : (L[c] ?? MEDIA)), 0);
  const t = cjk(testo) ? 0 : tracking * Math.max(0, ch.length - 1);
  return Math.round((somma + t) * 1.03 * 1000) / 1000;
}
