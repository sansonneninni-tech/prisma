/**
 * Una voce nella storia del browser per un dialog (AR, lente): aprendo si aggiunge `#hash`, così Indietro chiude il
 * dialog senza lasciare la pagina. Logica copiata da Casa (`stanza-client.ts`, pezzo 7) e resa riusabile.
 *
 * Il ClientRouter di Astro ascolta `popstate` e, per un'àncora tolta o rimessa sulla stessa pagina, rifà la pagina
 * intera (fetch + swap: fuoco perso, 3D da ricaricare). Un ascoltatore in cattura su window non basta: sullo stesso
 * bersaglio gli ascoltatori girano in ordine di registrazione e Astro si è registrato prima. Base.astro mette un
 * ascoltatore classico prima del ClientRouter (`window.__galPop`): ci si iscrive lì e si ferma l'evento.
 */
import { navigate } from 'astro:transitions/client';

type Pop = (e: PopStateEvent) => void;

/** Àncore dei dialog con voce di storia: non vanno portate dai link lingua né restano in un indirizzo ricaricato. */
export const HASH_DIALOG = ['#parete', '#lente', '#indice-aperto', '#filtri', '#carrello'];
const porta = () => (window as unknown as { __galPop?: Set<Pop> }).__galPop;

export interface Storia {
  /** da chiamare quando il dialog si è aperto */
  entra(): void;
  /** da chiamare quando il dialog si è chiuso (Chiudi, Esc): toglie la voce aggiunta */
  esci(): void;
  /** stacca gli ascoltatori (cambio pagina) */
  stacca(): void;
  /** la voce corrente della storia è quella del dialog */
  attiva(): boolean;
  /** la voce del dialog sta per essere sostituita da una navigazione (`seguiLink`): non va più tolta */
  rilascia(): void;
}

export function storiaDialog(o: {
  hash: string;
  chiave: string;
  aperto: () => boolean;
  chiudi: () => void;
  riapri: () => void;
  /** àncora che un altro script aggiunge sopra la nostra (model-viewer quando Scene Viewer non parte) */
  hashExtra?: string;
  /** dopo che la nostra voce è stata tolta (Indietro o chiusura): es. riscrivere la query nella voce della pagina */
  dopo?: () => void;
}): Storia {
  const percorso = location.pathname; // la query può cambiare (schede Originale/Stampa con replaceState)
  let su = false; // la voce corrente della storia è la nostra
  let voci = 1; // voci aggiunte sopra la pagina: 1, 2 se model-viewer ha aggiunto la sua
  const onPop: Pop = (e) => {
    if (location.pathname !== percorso) { su = false; return; } // altra pagina: ci pensa il ClientRouter
    if (o.hashExtra && location.hash === o.hashExtra && su) {
      // Scene Viewer non si è aperto: model-viewer mostra l'errore nel dialog, che resta aperto
      e.stopImmediatePropagation();
      voci = 2;
      return;
    }
    if ((e.state as Record<string, unknown> | null)?.[o.chiave]) {
      // «Avanti» dopo un Indietro: riapro
      e.stopImmediatePropagation();
      su = true;
      voci = 1;
      if (!o.aperto()) o.riapri();
      return;
    }
    if (su) {
      // si esce dalla nostra voce: stessa pagina, il ClientRouter non deve rifarla
      e.stopImmediatePropagation();
      su = false;
      voci = 1;
      if (o.aperto()) o.chiudi();
      o.dopo?.();
    }
  };
  const p = porta();
  if (p) p.add(onPop);
  else window.addEventListener('popstate', onPop, { capture: true });
  return {
    entra() {
      if (su) return;
      history.pushState({ ...(history.state ?? {}), [o.chiave]: true }, '', `${location.pathname}${location.search}${o.hash}`);
      su = true;
      voci = 1;
    },
    esci() {
      // `su` resta vero fino al popstate: così anche quel popstate viene fermato prima del ClientRouter
      if (su) history.go(-voci);
    },
    stacca() {
      if (p) p.delete(onPop);
      else window.removeEventListener('popstate', onPop, { capture: true });
    },
    attiva: () => su,
    rilascia() { su = false; },
  };
}

/**
 * Clic su un link dentro un dialog che ha la sua voce di storia (Indice, cassetto): la voce del dialog lascia il posto
 * alla pagina d'arrivo (ClientRouter con `history: 'replace'`), così Indietro dalla pagina nuova torna alla pagina di
 * partenza e non a una voce in più. Da chiamare in un ascoltatore di clic in cattura (prima del ClientRouter).
 * Restituisce true se ha preso lui il clic.
 */
export function seguiLink(e: MouseEvent, storia: Storia | null, chiudiSubito: () => void): boolean {
  if (!storia?.attiva() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-astro-reload')) return false;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin) return false;
  if (HASH_DIALOG.includes(u.hash)) u.hash = '';
  e.preventDefault();
  storia.rilascia();
  chiudiSubito();
  void navigate(u.href, { history: 'replace', sourceElement: a });
  return true;
}

/** Arrivo con `#hash` (es. il QR del computer): tolgo l'àncora dalla voce corrente; true se c'era. */
export function arrivoConHash(hash: string, chiave: string): boolean {
  if (location.hash !== hash) return false;
  const { [chiave]: _x, ...resto } = (history.state ?? {}) as Record<string, unknown>;
  history.replaceState(Object.keys(resto).length ? resto : history.state, '', `${location.pathname}${location.search}`);
  return true;
}
