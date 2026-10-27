// Parte "browser" di ArViewer.astro: definisce l'elemento <isa-ar-viewer>.
// model-viewer (~1 MB) e qrcode sono caricati solo quando servono.

type Stato = 'attesa' | 'disponibile' | 'qr' | 'non-supportato' | 'errore';

interface ModelViewerEl extends HTMLElement {
  canActivateAR: boolean;
  loaded: boolean;
  cameraOrbit: string;
  minCameraOrbit: string;
  maxCameraOrbit: string;
  fieldOfView: string;
  getFieldOfView(): number;
  getDimensions(): { x: number; y: number; z: number };
  jumpCameraToGoal(): void;
  activateAR(): Promise<void>;
  updateComplete?: Promise<unknown>;
}

const MOBILE = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS

/** Larghezza minima (px) per mostrare il QR su computer; sotto (o con puntatore "coarse") il QR non serve. */
const QR_LARGHEZZA_MIN = 768;

/** Safari/iOS: AR Quick Look apribile con un semplice <a rel="ar">, anche senza WebGL. */
const QUICK_LOOK = () => {
  try {
    return document.createElement('a').relList.supports('ar');
  } catch {
    return false;
  }
};

/** Errori interni di model-viewer quando manca WebGL (arRenderer null): non devono finire in console come "uncaught". */
const ERRORE_SENZA_WEBGL = /supportsPresentation/;
let intercettoreInstallato = false;
function intercettaErroriSenzaWebGL() {
  if (intercettoreInstallato) return;
  intercettoreInstallato = true;
  const silenzia = (motivo: unknown, evento: Event) => {
    const testo = motivo instanceof Error ? motivo.message : String(motivo ?? '');
    if (!ERRORE_SENZA_WEBGL.test(testo)) return;
    evento.preventDefault();
    console.info('[isa-ar] WebGL non disponibile: anteprima 3D disattivata', testo);
    document.querySelectorAll<HTMLElement>('isa-ar-viewer').forEach((v) => (v as Partial<ArViewer>).senzaWebGL?.());
  };
  window.addEventListener('unhandledrejection', (e) => silenzia(e.reason, e));
  window.addEventListener('error', (e) => silenzia(e.error ?? e.message, e));
}

let caricaModelViewer: Promise<unknown> | null = null;
function modelViewer() {
  caricaModelViewer ??= import('@google/model-viewer');
  return caricaModelViewer;
}

class ArViewer extends HTMLElement {
  #mv!: ModelViewerEl;
  #bottone!: HTMLButtonElement;
  #qr!: HTMLElement;
  #avviso!: HTMLElement;
  #avviato = false;
  /** true quando l'AR si apre con <a rel="ar"> diretto (iPhone/iPad senza WebGL o con model-viewer fuori uso). */
  #quickLookDiretto = false;

  connectedCallback() {
    this.#mv = this.querySelector('model-viewer') as ModelViewerEl;
    this.#bottone = this.querySelector('.isa-ar__bottone') as HTMLButtonElement;
    this.#qr = this.querySelector('.isa-ar__qr') as HTMLElement;
    this.#avviso = this.querySelector('.isa-ar__avviso') as HTMLElement;
    if (!this.#mv) return;

    this.#bottone.addEventListener('click', () => this.#apriAR());
    this.#mv.addEventListener('load', () => {
      this.dataset.modello = 'caricato';
      this.#inquadra();
      this.#valuta();
    });
    new ResizeObserver(() => this.#inquadra()).observe(this.#mv);
    this.#mv.addEventListener('error', (e) => {
      if ((e as unknown as CustomEvent<{ type?: string }>).detail?.type !== 'loadfailure') return;
      // senza anteprima 3D, su iPhone/iPad la AR (Quick Look) funziona lo stesso
      if (this.#offriQuickLookDiretto()) return;
      this.#messaggio('errore', 'erroreModello');
    });
    this.#mv.addEventListener('ar-status', (e) => {
      const stato = (e as CustomEvent).detail?.status;
      if (stato === 'failed') this.#messaggio('errore', 'errore');
    });

    if (this.dataset.caricamento === 'subito' || !('IntersectionObserver' in window)) {
      this.#avvia();
    } else {
      const io = new IntersectionObserver(
        (voci) => {
          if (voci.some((v) => v.isIntersecting)) {
            io.disconnect();
            this.#avvia();
          }
        },
        { rootMargin: '300px' },
      );
      io.observe(this);
    }

    // il QR dipende dalla larghezza: rivaluta quando la finestra cambia (es. computer con finestra stretta)
    const mq = window.matchMedia?.(`(min-width: ${QR_LARGHEZZA_MIN}px)`);
    mq?.addEventListener?.('change', () => {
      if (this.dataset.ar === 'qr' || this.dataset.ar === 'non-supportato') this.#valuta();
    });
  }

  /** Chiamata quando model-viewer segnala che WebGL manca. */
  senzaWebGL() {
    this.dataset.webgl = 'no';
    if (this.dataset.ar === 'attesa' || this.dataset.ar === 'non-supportato' || this.dataset.ar === 'errore') this.#offriQuickLookDiretto();
  }

  async #avvia() {
    if (this.#avviato) return;
    this.#avviato = true;
    try {
      await modelViewer();
      await customElements.whenDefined('model-viewer');
      await this.#mv.updateComplete;
    } catch (err) {
      console.warn('[isa-ar] model-viewer non caricato', err);
      if (!this.#offriQuickLookDiretto()) this.#messaggio('errore', 'erroreModello');
      return;
    }
    // la scelta della modalita' AR in model-viewer e' asincrona (WebXR in particolare)
    setTimeout(() => this.#valuta(), 150);
  }

  #valuta() {
    if (this.dataset.ar === 'errore') return;
    if (this.#quickLookDiretto) return;
    let puo = false;
    try {
      puo = Boolean(this.#mv.canActivateAR);
    } catch {
      puo = false; // model-viewer senza WebGL
    }
    if (puo) {
      this.#disponibile();
    } else if (this.#offriQuickLookDiretto()) {
      // iPhone/iPad dove model-viewer non offre la AR (es. WebGL disattivato): Quick Look diretto
    } else if (MOBILE()) {
      this.#messaggio('non-supportato', 'nonSupportato');
    } else if (this.dataset.qr !== 'no' && this.#qrUtile()) {
      this.#stato('qr');
      this.#avviso.hidden = true;
      this.#mostraQR();
    } else {
      this.#qr.hidden = true;
      this.#stato('non-supportato');
    }
  }

  #disponibile() {
    this.#stato('disponibile');
    this.#bottone.hidden = false;
    this.#qr.hidden = true;
    this.#avviso.hidden = true;
  }

  /** Il QR serve solo su uno schermo largo con puntatore preciso (un computer). */
  #qrUtile() {
    const mm = window.matchMedia;
    if (!mm) return true;
    return mm(`(min-width: ${QR_LARGHEZZA_MIN}px)`).matches && !mm('(pointer: coarse)').matches;
  }

  /**
   * Se il browser apre AR Quick Look con <a rel="ar"> e c'e' un ios-src, mostra il bottone e usa il link diretto.
   * Restituisce true se l'ha fatto.
   */
  #offriQuickLookDiretto(): boolean {
    if (this.#quickLookDiretto) return true;
    const usdz = this.#mv.getAttribute('ios-src');
    if (!usdz || !QUICK_LOOK()) return false;
    this.#quickLookDiretto = true;
    this.dataset.quickLook = 'diretto';
    this.#disponibile();
    return true;
  }

  #apriQuickLookDiretto() {
    const usdz = this.#mv.getAttribute('ios-src') ?? '';
    const url = new URL(usdz, location.href);
    // come model-viewer con ar-scale="fixed": niente ridimensionamento con le dita
    url.hash = 'allowsContentScaling=0';
    const a = document.createElement('a');
    a.rel = 'ar';
    a.href = url.toString();
    a.hidden = true;
    a.dataset.isaQuickLook = '';
    // Quick Look richiede un'immagine come primo figlio del link
    a.appendChild(document.createElement('img'));
    this.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  /** Inquadra il quadro di fronte, riempiendo il riquadro (model-viewer di
   *  default lascia molto vuoto attorno agli oggetti piatti). */
  async #inquadra() {
    const mv = this.#mv;
    if (!mv.loaded || !mv.clientWidth || !mv.clientHeight) return;
    if (mv.fieldOfView !== '30deg') {
      mv.fieldOfView = '30deg';
      await mv.updateComplete;
      mv.jumpCameraToGoal();
      await new Promise((r) => requestAnimationFrame(r));
    }
    const { x, y, z } = mv.getDimensions();
    // campo visivo verticale reale (model-viewer lo adatta alle proporzioni del riquadro)
    const tV = Math.tan(((mv.getFieldOfView() / 2) * Math.PI) / 180);
    const tH = tV * (mv.clientWidth / mv.clientHeight);
    const margine = Number(getComputedStyle(this).getPropertyValue('--isa-ar-margine')) || 1.1;
    const d = Math.max(y / 2 / tV, x / 2 / tH) * margine + z / 2;
    const r = `${d.toFixed(3)}m`;
    mv.minCameraOrbit = `-55deg 55deg ${r}`;
    mv.maxCameraOrbit = `55deg 125deg ${r}`;
    mv.cameraOrbit = `0deg 90deg ${r}`;
    mv.jumpCameraToGoal();
  }

  async #apriAR() {
    if (this.#quickLookDiretto) {
      this.#apriQuickLookDiretto();
      return;
    }
    try {
      await this.#mv.activateAR();
    } catch (err) {
      console.warn('[isa-ar] AR non avviata', err);
      this.#messaggio('errore', 'errore');
    }
  }

  async #mostraQR() {
    const box = this.#qr.querySelector('.isa-ar__qr-codice') as HTMLElement;
    this.#qr.hidden = false;
    if (box.childElementCount) return;
    const pagina = `${location.origin}${location.pathname}${location.search}`;
    const hash = this.dataset.hashQr ? `#${this.dataset.hashQr.replace(/^#/, '')}` : `#${this.id}`;
    const url = this.dataset.urlQr || `${pagina}${hash}`;
    try {
      const QR = await import('qrcode');
      const svg = await QR.toString(url, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000ff', light: '#ffffff00' },
      });
      // colori dal CSS: moduli = currentColor (--isa-ar-qr-colore), fondo = --isa-ar-qr-sfondo
      box.innerHTML = svg.replace(/stroke="#000000"/g, 'stroke="currentColor"');
      box.dataset.url = url;
    } catch (err) {
      console.warn('[isa-ar] QR non generato', err);
      this.#qr.hidden = true;
    }
  }

  #messaggio(stato: Stato, chiave: 'nonSupportato' | 'errore' | 'erroreModello') {
    const attr = { nonSupportato: 'nonSupportato', errore: 'errore', erroreModello: 'erroreModello' }[chiave];
    this.#avviso.textContent = this.#avviso.dataset[attr] ?? '';
    this.#avviso.hidden = false;
    this.#stato(stato);
    if (stato === 'errore' && chiave === 'erroreModello') this.#bottone.hidden = true;
  }

  #stato(s: Stato) {
    this.dataset.ar = s;
    this.dispatchEvent(new CustomEvent('isa-ar-stato', { detail: { stato: s }, bubbles: true }));
  }
}

export function avviaArViewer() {
  intercettaErroriSenzaWebGL();
  if (!customElements.get('isa-ar-viewer')) customElements.define('isa-ar-viewer', ArViewer);
}
