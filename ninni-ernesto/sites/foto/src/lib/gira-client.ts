/**
 * Ritratto di Chi siamo che si gira (richiesta di ninni del 04/11): sul computer basta passarci sopra (CSS, :hover),
 * da tastiera il fuoco (CSS, :focus-visible); su telefono e tablet il tocco gira e rigira (classe `gira--girata`).
 * Modulo caricato una volta: si avvia su `astro:page-load` (ClientRouter).
 */
function avvia() {
  for (const fig of document.querySelectorAll<HTMLElement>('[data-gira]')) {
    if (fig.dataset.giraPronto) continue;
    fig.dataset.giraPronto = '';
    const carta = fig.querySelector<HTMLElement>('.gira__in');
    if (!carta) continue;
    let tocco = false;
    carta.addEventListener('pointerdown', (e) => { tocco = e.pointerType !== 'mouse'; });
    carta.addEventListener('click', () => { if (tocco) fig.classList.toggle('gira--girata'); });
    carta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fig.classList.toggle('gira--girata'); }
      if (e.key === 'Escape') fig.classList.remove('gira--girata');
    });
  }
}
document.addEventListener('astro:page-load', avvia);
