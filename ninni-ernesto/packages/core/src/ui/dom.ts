/**
 * Small browser helpers used by the core components' scripts. Sites can reuse them for custom forms.
 * Form markup convention (see `components/Field.astro`):
 *   <div class="isa-field" data-field="email">
 *     <label for="x-email">…</label>
 *     <input id="x-email" name="email" aria-describedby="x-email-error">
 *     <p class="isa-field__error" id="x-email-error" data-error-for="email" hidden></p>
 *   </div>
 */
import { sep } from '../i18n/format.ts';
import { translatorFromStrings, type Translator } from '../i18n/translate.ts';
import type { Locale } from '../types.ts';

/** Reads the `data-i18n` JSON written by a component and returns a translator. */
export function readTranslator(el: HTMLElement): Translator {
  let strings: Record<string, string> = {};
  try {
    strings = JSON.parse(el.dataset.i18n ?? '{}') as Record<string, string>;
  } catch {
    /* keep empty */
  }
  return translatorFromStrings((el.dataset.lang as Locale | undefined) ?? 'it', strings);
}

/** Reads a JSON `data-*` attribute safely. */
export function readJsonData<T>(el: HTMLElement, name: string): T | null {
  try {
    const raw = el.dataset[name];
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface ShowFieldErrorsOptions {
  focus?: boolean;
  /**
   * One summary line for the fields with the same error, instead of one line each:
   * "Campi da compilare: Email, Telefono." (`core.checkout.campi_da_compilare`). `true` groups `errori.obbligatorio`;
   * a string groups that error key. Only when at least 2 fields have it. Default: off.
   */
  group?: boolean | string;
}

/** Fields grouped in one summary line (`group` option): at least 2 fields with the group's error key, else none. */
export function groupedErrorFields(errors: Record<string, string>, group: ShowFieldErrorsOptions['group']): string[] {
  const key = group === true ? 'errori.obbligatorio' : group || null;
  const names = key ? Object.keys(errors).filter((n) => errors[n] === key) : [];
  return names.length >= 2 ? names : [];
}

/**
 * Shows field errors (text keys) next to the fields, sets `aria-invalid`, fills the error summary
 * (`[data-error-summary]`, role=alert) and moves focus to the first invalid field.
 * Returns the number of errors.
 */
export function showFieldErrors(form: HTMLElement, errors: Record<string, string>, t: Translator, options: ShowFieldErrorsOptions = {}): number {
  const names = Object.keys(errors);
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    const name = el.dataset.errorFor ?? '';
    const key = errors[name];
    el.textContent = key ? t(key) : '';
    el.hidden = !key;
  });
  form.querySelectorAll<HTMLElement>('[name]').forEach((field) => {
    const name = field.getAttribute('name') ?? '';
    if (errors[name]) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  });

  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  if (summary) {
    summary.replaceChildren();
    if (names.length > 0) {
      const title = document.createElement('p');
      title.className = 'isa-error-summary__title';
      title.textContent = t('core.checkout.errori_riepilogo', { n: names.length });
      const list = document.createElement('ul');
      list.className = 'isa-error-summary__list';
      const s = sep(t.lang);
      const grouped = groupedErrorFields(errors, options.group);
      const linkTo = (field: HTMLElement | null, text: string): Node => {
        if (!field?.id) return document.createTextNode(text);
        const a = document.createElement('a');
        a.href = `#${field.id}`;
        a.textContent = text;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          field.focus();
        });
        return a;
      };
      const fieldOf = (name: string) => form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
      const labelOf = (field: HTMLElement | null) =>
        field?.id ? form.querySelector(`label[for="${CSS.escape(field.id)}"]`)?.textContent?.trim() : null;
      if (grouped.length) {
        const li = document.createElement('li');
        li.append(`${t('core.checkout.campi_da_compilare')}${s.dp}`);
        grouped.forEach((name, i) => {
          const field = fieldOf(name);
          if (i) li.append(s.el);
          li.append(linkTo(field, labelOf(field) ?? name));
        });
        li.append(s.p.trim());
        list.append(li);
      }
      for (const name of names) {
        if (grouped.includes(name)) continue;
        const field = fieldOf(name);
        const label = labelOf(field);
        const li = document.createElement('li');
        li.append(linkTo(field, `${label ? `${label}${s.dp}` : ''}${t(errors[name] ?? '')}`));
        list.append(li);
      }
      summary.append(title, list);
    }
    summary.hidden = names.length === 0;
  }

  if (names.length > 0 && options.focus !== false) {
    const first = names.map((n) => form.querySelector<HTMLElement>(`[name="${CSS.escape(n)}"]`)).find(Boolean);
    first?.focus();
  }
  return names.length;
}

/** Clears all errors of a form. */
export function clearFieldErrors(form: HTMLElement): void {
  showFieldErrors(form, {}, translatorFromStrings('it', {}), { focus: false });
}

/** Plain object from a form (checkboxes → 'on' when checked; files kept as File). */
export function formToObject(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  new FormData(form).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** Writes a message to a live region, forcing re-announcement of identical text. */
export function announce(region: HTMLElement | null, message: string): void {
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
