/**
 * Moduli di «Su commissione» e «Contatti» (pezzo 7) — nel browser. Markup proprio + logica del core: CommissionForm e
 * ContactForm del core si agganciano una volta sola e dopo un cambio pagina del ClientRouter restavano muti (come Casa).
 *  - Validazione: `validateCommission` / `validateContact` del core. Errori con `showFieldErrors` del core solo all'invio
 *    (riepilogo in cima al modulo, sotto l'header; campi vuoti in una riga) e via appena il campo è a posto.
 *  - Foto della parete (commissione): resta nel browser, anteprima con URL.createObjectURL, «Togli».
 *  - Arrivi da una scheda: `?opera=slug` (contatti: argomento «Un'opera», messaggio iniziale) e `?da=slug`
 *    (commissione, da un'opera venduta: messaggio iniziale). I titoli stanno in `data-titoli` (sul server).
 *  - DEMO: nulla viene inviato. Breve attesa (bottone con la barretta), poi la conferma al posto del modulo.
 * Si avvia su `astro:page-load`, si spegne su `astro:before-swap`.
 */
import { validateCommission, validateContact } from '@ne/core/forms';
import { readJsonData, readTranslator, showFieldErrors } from '@ne/core/ui';

type Esito = { valid: boolean; errors: Record<string, string>; data: Record<string, unknown> };
type Validatore = (fd: FormData) => Esito;

const ATTESA_DEMO = 700;
const movimento = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;
let spegni: (() => void) | null = null;

function collega(form: HTMLFormElement, valida: Validatore, signal: AbortSignal, conferma: (data: Record<string, unknown>) => string): void {
  const t = readTranslator(form);
  const ok = form.parentElement?.querySelector<HTMLElement>('[data-modulo-ok]');
  const bottone = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const etichetta = bottone.innerHTML;

  // errori: via appena il campo è a posto (si ricontrolla tutto il modulo e si guarda solo quel campo)
  const ripulisci = (e: Event) => {
    const x = e.target as HTMLInputElement;
    if (!x.name || !x.hasAttribute('aria-invalid')) return;
    if (valida(new FormData(form)).errors[x.name]) return;
    form.querySelectorAll(`[name="${CSS.escape(x.name)}"]`).forEach((f) => f.removeAttribute('aria-invalid'));
    const box = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(x.name)}"]`);
    if (box) { box.hidden = true; box.textContent = ''; }
    const sommario = form.querySelector<HTMLElement>('[data-error-summary]');
    if (sommario && !form.querySelector('[aria-invalid="true"]')) sommario.hidden = true;
  };
  form.addEventListener('input', ripulisci, { signal });
  form.addEventListener('change', ripulisci, { signal });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.hasAttribute('data-invio')) return;
    const r = valida(new FormData(form));
    // riepilogo e fuoco nell'ordine della pagina (il core segue l'ordine dei suoi controlli)
    const ordinati: Record<string, string> = {};
    form.querySelectorAll<HTMLElement>('[name]').forEach((f) => { const n = f.getAttribute('name')!; if (r.errors[n]) ordinati[n] = r.errors[n]!; });
    if (showFieldErrors(form, ordinati, t, { focus: false, group: true }) > 0) {
      // la casella non ripete la sua etichetta lunga nel riepilogo: basta l'errore
      const casella = form.querySelector<HTMLInputElement>('input[name="privacy"]');
      const voce = casella ? form.querySelector<HTMLAnchorElement>(`[data-error-summary] a[href="#${CSS.escape(casella.id)}"]`) : null;
      if (voce && ordinati.privacy) voce.textContent = t(ordinati.privacy);
      // le etichette-domanda finiscono con «?»: niente «?:» nel riepilogo («Hai una foto della parete? La foto pesa…»)
      form.querySelectorAll<HTMLAnchorElement>('[data-error-summary] a').forEach((a) => {
        const x = a.textContent ?? '';
        if (/[?？][:：]/.test(x)) a.textContent = x.replace(/([?？])[:：]\s*/, (_m, q: string) => (q === '？' ? q : `${q} `));
      });
      const sommario = form.querySelector<HTMLElement>('[data-error-summary]:not([hidden])');
      sommario?.focus({ preventScroll: true });
      sommario?.scrollIntoView({ block: 'start', behavior: movimento() ? 'smooth' : 'auto' });
      return;
    }
    form.setAttribute('data-invio', '');
    bottone.setAttribute('aria-busy', 'true');
    bottone.innerHTML = `<span>${t('galleria.isabella.invio')}</span><span class="btn__barra" aria-hidden="true"></span>`;
    window.setTimeout(() => {
      if (!form.isConnected) return;
      form.removeAttribute('data-invio');
      bottone.removeAttribute('aria-busy');
      bottone.innerHTML = etichetta;
      if (!ok) return;
      ok.querySelector<HTMLElement>('[data-modulo-ok-t]')!.textContent = conferma(r.data);
      form.hidden = true;
      ok.hidden = false;
      ok.focus({ preventScroll: true });
      ok.scrollIntoView({ block: 'center', behavior: movimento() ? 'smooth' : 'auto' });
    }, ATTESA_DEMO);
  }, { signal });
}

/** Foto della parete: resta nel browser. Anteprima (se il browser sa mostrarla), nome, «Togli». */
function foto(form: HTMLFormElement, signal: AbortSignal): void {
  const input = form.querySelector<HTMLInputElement>('input[name="photo"]');
  const box = form.querySelector<HTMLElement>('[data-foto]');
  if (!input || !box) return;
  const img = box.querySelector<HTMLImageElement>('[data-foto-img]')!;
  const nome = box.querySelector<HTMLElement>('[data-foto-nome]')!;
  const scegli = form.querySelector<HTMLElement>('[data-foto-scegli]');
  let url = '';
  const pulisci = () => { if (url) URL.revokeObjectURL(url); url = ''; };
  const aggiorna = () => {
    pulisci();
    const f = input.files?.[0];
    box.hidden = !f;
    scegli?.toggleAttribute('data-scelta', !!f);
    if (!f) return;
    nome.textContent = f.name;
    const mostrabile = /^image\/(jpeg|png|webp|gif)$/.test(f.type);
    img.hidden = !mostrabile;
    if (mostrabile) { url = URL.createObjectURL(f); img.src = url; }
    else img.removeAttribute('src');
  };
  // file che si dichiara immagine ma non lo è (o formato che il browser non sa disegnare): niente icona rotta
  img.addEventListener('error', () => { img.hidden = true; }, { signal });
  input.addEventListener('change', aggiorna, { signal });
  box.querySelector('[data-foto-togli]')?.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }, { signal });
  signal.addEventListener('abort', pulisci);
  if (input.files?.length) aggiorna();
}

/** Messaggio iniziale da `?opera=` / `?da=` (solo se il campo è vuoto). */
function precompila(form: HTMLFormElement, parametro: string, chiave: string, argomento?: string): void {
  const slug = new URL(location.href).searchParams.get(parametro);
  const titoli = readJsonData<Record<string, string>>(form, 'titoli') ?? {};
  const titolo = slug ? titoli[slug] : undefined;
  if (!titolo) return;
  const t = readTranslator(form);
  const msg = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  if (msg && !msg.value.trim()) msg.value = t(chiave, { titolo });
  if (argomento) {
    const sel = form.querySelector<HTMLSelectElement>('select[name="topic"]');
    if (sel) sel.value = argomento;
  }
}

function avvia(): void {
  spegni?.();
  spegni = null;
  const moduli = [...document.querySelectorAll<HTMLFormElement>('form[data-modulo]')];
  if (!moduli.length) return;
  const ac = new AbortController();
  for (const form of moduli) {
    const t = readTranslator(form);
    if (form.dataset.modulo === 'attesa') {
      // lista d'attesa del catalogo di Ernesto: basta l'email (demo, nulla viene inviato)
      const soloEmail: Validatore = (fd) => {
        const email = String(fd.get('email') ?? '').trim();
        const errors: Record<string, string> = {};
        if (!email) errors.email = 'errori.obbligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'errori.email';
        return { valid: !errors.email, errors, data: { email } };
      };
      collega(form, soloEmail, ac.signal, (d) => t('galleria.ernesto.successo', { email: String(d.email ?? '') }));
    } else if (form.dataset.modulo === 'commissione') {
      collega(form, validateCommission as unknown as Validatore, ac.signal, (d) => t('galleria.commissione.successo', { email: String(d.email ?? '') }));
      foto(form, ac.signal);
      precompila(form, 'da', 'galleria.commissione.da_msg');
    } else {
      collega(form, validateContact as unknown as Validatore, ac.signal, (d) => t('galleria.isabella.successo', { nome: String(d.name ?? '') }));
      precompila(form, 'opera', 'galleria.isabella.opera_msg', 'opera');
    }
  }
  spegni = () => ac.abort();
}

document.addEventListener('astro:page-load', avvia);
document.addEventListener('astro:before-swap', () => { spegni?.(); spegni = null; });
