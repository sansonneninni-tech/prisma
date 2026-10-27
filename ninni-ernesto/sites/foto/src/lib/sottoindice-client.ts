/**
 * Sottoindice (pezzo 7) — nel browser. La voce della sezione che si sta leggendo prende aria-current="location"
 * (nera, con ■); le altre restano grigie. «Sezione che si sta leggendo» = l'ultima il cui inizio ha passato una linea a
 * un terzo dello schermo sotto l'header; in fondo alla pagina vince l'ultima. `data-staccato` sulla barra quando è
 * attaccata sotto l'header (filetto chiaro). Si avvia su `astro:page-load`, si spegne su `astro:before-swap`.
 */
let spegni: (() => void) | null = null;

function avvia(): void {
  spegni?.();
  spegni = null;
  const nav = document.querySelector<HTMLElement>('[data-si]');
  if (!nav) return;
  const link = [...nav.querySelectorAll<HTMLAnchorElement>('[data-si-a]')];
  const sezioni = link.map((a) => document.getElementById(a.dataset.siA ?? '')).filter((s): s is HTMLElement => !!s);
  if (!sezioni.length) return;
  const header = () => document.querySelector<HTMLElement>('.hd')?.getBoundingClientRect().bottom ?? 56;
  let raf = 0;
  let corrente = '';

  const aggiorna = () => {
    raf = 0;
    const fisso = getComputedStyle(nav).position === 'sticky';
    const base = header() + (fisso ? nav.offsetHeight : 0);
    const linea = base + (innerHeight - base) / 3;
    let id = '';
    for (const s of sezioni) if (s.getBoundingClientRect().top <= linea) id = s.id;
    const fondo = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    if (fondo && sezioni[sezioni.length - 1]!.getBoundingClientRect().top < innerHeight) id = sezioni[sezioni.length - 1]!.id;
    if (id !== corrente) {
      corrente = id;
      for (const a of link) {
        if (a.dataset.siA === id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      }
    }
    nav.toggleAttribute('data-staccato', fisso && scrollY > 0 && nav.getBoundingClientRect().top <= header() + 1);
  };
  const chiedi = () => { if (!raf) raf = requestAnimationFrame(aggiorna); };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi, { passive: true });
  aggiorna();
  spegni = () => {
    removeEventListener('scroll', chiedi);
    removeEventListener('resize', chiedi);
    if (raf) cancelAnimationFrame(raf);
  };
}

document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });

export {};
