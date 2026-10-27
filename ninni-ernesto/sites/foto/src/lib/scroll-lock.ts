/**
 * Blocco dello scroll del body (menu mobile, pannelli, drawer).
 * Conta i blocchi annidati (Indice, cassetto, filtri, lente, AR); emette l'evento `galleria:scroll-lock` (oggi nessuno lo ascolta: Lenis tolto il 22/10).
 * Copiato da Casa (sites/casa/src/lib/scroll-lock.ts).
 */
let locks = 0;

export function lockScroll(): void {
  locks += 1;
  if (locks === 1) {
    document.documentElement.setAttribute('data-scroll-lock', '');
    document.dispatchEvent(new CustomEvent('galleria:scroll-lock', { detail: { locked: true } }));
  }
}

export function unlockScroll(): void {
  if (locks === 0) return;
  locks -= 1;
  if (locks === 0) {
    document.documentElement.removeAttribute('data-scroll-lock');
    document.dispatchEvent(new CustomEvent('galleria:scroll-lock', { detail: { locked: false } }));
  }
}

/** Dopo un cambio pagina con il ClientRouter non deve restare nessun blocco. */
export function resetScrollLock(): void {
  locks = 1;
  unlockScroll();
}
