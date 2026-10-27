/**
 * P9 pagina carrello nel browser (pezzo 5): righe C12, paese di consegna, conto (spedizione per zona, IVA 5% / 22%),
 * consegna stimata, dazi fuori UE, rate. Tutti i numeri vengono dallo store del core ($cartTotals); qui solo il disegno.
 */
import { $cart, $cartTotals, $cartCountry, setCartCountry } from '@ne/core/cart';
import {
  calculateInstallments, formatPrice, type Locale,
} from '@ne/core';
import { readTranslator, announce } from '@ne/core/ui';
import { dateConsegna, leggiCatalogo, centesimiConto, disegnaRighe, righeConto, disegnaConto, controllaVendute, disegnaAvvisi } from './carrello-client';

export function initCarrello(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('[data-carrello-pagina]');
  if (!root) return null;
  const t = readTranslator(root);
  const lang = (root.dataset.lang ?? 'it') as Locale;
  const cat = leggiCatalogo(root);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const paese = q<HTMLSelectElement>('[data-car-paese]');
  const live = q('[data-car-live]');
  const spegni: (() => void)[] = [];

  if (!$cartCountry.get() && lang === 'it') setCartCountry('IT');
  controllaVendute(cat);

  const disegna = () => {
    const lines = $cart.get();
    const totals = $cartTotals.get();
    const vuoto = lines.length === 0;
    q('[data-car-corpo]').hidden = vuoto;
    q('[data-car-vuoto]').hidden = !vuoto;
    disegnaAvvisi(q('[data-car-avvisi]'), t, root.dataset.simile ?? '/');
    if (vuoto) return;
    disegnaRighe(q('[data-car-righe]'), lines, { lang, t, cat, id: 'car', cents: centesimiConto(totals) });
    const c = $cartCountry.get() ?? '';
    if (paese.value !== c) paese.value = c;
    disegnaConto(q('[data-car-conto]'), righeConto(totals, t, lang));
    const s = totals.shipping;
    const consegna = q('[data-car-consegna]');
    if (s) {
      consegna.textContent = t('galleria.acquisto.consegna', { date: dateConsegna(lines, s, lang) });
    }
    consegna.hidden = !s;
    q('[data-car-dazi]').hidden = !s?.dutiesMayApply;
    const piano = calculateInstallments(totals.totalCents);
    const rate = q('[data-car-rate]');
    rate.textContent = piano.eligible ? t('etichette.rate', { importo: formatPrice(piano.amounts[0] ?? 0, lang) }) : '';
    rate.hidden = !piano.eligible;
  };

  const onPaese = () => {
    setCartCountry(paese.value || null);
    announce(live, t('core.cart.totale_aggiornato', { totale: formatPrice($cartTotals.get().totalCents, lang) }));
  };
  paese.addEventListener('change', onPaese);
  spegni.push(() => paese.removeEventListener('change', onPaese));
  // l'ultima riga tolta: il fuoco va al titolo, sotto compaiono le due porte
  const onSvuotato = () => q('#car-titolo').focus();
  root.addEventListener('galleria:carrello-svuotato', onSvuotato);
  spegni.push(() => root.removeEventListener('galleria:carrello-svuotato', onSvuotato));
  document.addEventListener('galleria:vendute-cambiate', disegna);
  spegni.push(() => document.removeEventListener('galleria:vendute-cambiate', disegna));
  spegni.push($cart.subscribe(disegna));
  spegni.push($cartTotals.listen(disegna));
  return () => spegni.forEach((f) => f());
}
