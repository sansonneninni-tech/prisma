/**
 * Order confirmation email (IT/EN/ZH). Table layout + inline styles for email clients.
 * Pure function: works on the server (real sending later) and in the browser (demo preview).
 */
import type { Order } from '../checkout/types.ts';
import { countryName, formatPercent, formatPrice, NBSP } from '../i18n/format.ts';
import type { TranslateParams } from '../i18n/translate.ts';
import type { CartLine } from '../types.ts';

export interface EmailTheme {
  brandName: string;
  /** Absolute URL (or path, resolved with `baseUrl`) of the logo. Without it the brand name is used. */
  logoUrl?: string;
  logoWidth?: number;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
}

export const DEFAULT_EMAIL_THEME: Required<Omit<EmailTheme, 'logoUrl'>> = {
  brandName: 'Ninni & Ernesto',
  logoWidth: 160,
  accentColor: '#1a1a1a',
  backgroundColor: '#f4f1ec',
  surfaceColor: '#ffffff',
  textColor: '#1a1a1a',
  mutedColor: '#6b6560',
  borderColor: '#e4ded6',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  headingFontFamily: "Georgia, 'Times New Roman', serif",
};

/** Text keys the email uses (pass them to the browser with `pickStrings`). */
export const EMAIL_TEXT_KEYS = [
  'email_conferma.oggetto',
  'email_conferma.preheader',
  'email_conferma.saluto',
  'email_conferma.corpo',
  'email_conferma.corpo_originale',
  'email_conferma.riepilogo_titolo',
  'email_conferma.colonna_opera',
  'email_conferma.colonna_prezzo',
  'email_conferma.riga_subtotale',
  'email_conferma.riga_spedizione',
  'email_conferma.riga_iva',
  'email_conferma.riga_totale',
  'email_conferma.riga_metodo',
  'email_conferma.spedizione_titolo',
  'email_conferma.tempi_titolo',
  'email_conferma.tempi_testo',
  'email_conferma.domande',
  'email_conferma.chiusura',
  'email_conferma.firma',
  'email_conferma.ps',
  'email_conferma.footer',
  'email_conferma.footer_demo',
  'checkout.numero_ordine',
  'checkout.metodo_carta',
  'checkout.metodo_rate',
  'checkout.metodo_rate_dettaglio',
  'carrello.iva_dettaglio_originali',
  'carrello.iva_dettaglio_stampe',
  'carrello.spedizione_gratis',
  'core.cart.stampa_dettaglio',
  'core.cart.originale_dettaglio',
  'core.cart.iva_esente',
  'etichette.carta_fotografica',
  'etichette.tela',
  'demo.etichetta',
  'core.zone.italy',
  'core.zone.eu',
  'core.zone.uk-ch',
  'core.zone.asia',
  'core.zone.world',
] as const;

export type TextFn = (key: string, params?: TranslateParams) => string;

export interface RenderEmailOptions {
  /** Translator in the order language (`useTranslations(lang)` or `translatorFromStrings`). */
  t: TextFn;
  theme?: EmailTheme;
  /** Used to make image/logo paths absolute (e.g. `https://casa.netlify.app`). */
  baseUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function absolute(url: string, baseUrl?: string): string {
  if (!baseUrl || /^(https?:|data:)/.test(url)) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/** Short description of a line: "Originale" / "Stampa 50 × 70 cm · Tela", with non-breaking spaces in the measure. */
export function describeLine(line: CartLine, t: TextFn): string {
  if (line.kind === 'original' || !line.print) return t('core.cart.originale_dettaglio');
  const carta = t(`carte.${line.print.material}.breve`);
  const support = line.print.frame && line.print.frame !== 'none' ? `${carta} · ${t(`cornici.${line.print.frame}.breve`)}` : carta;
  const formato = `${line.print.widthCm}${NBSP}×${NBSP}${line.print.heightCm}`;
  // the unit is in the text ("{formato} cm"): keep it on the same line as the numbers
  return t('core.cart.stampa_dettaglio', { formato, supporto: support }).replace(`${formato} `, `${formato}${NBSP}`);
}

export function renderOrderEmail(order: Order, options: RenderEmailOptions): RenderedEmail {
  const { t } = options;
  const th = { ...DEFAULT_EMAIL_THEME, ...options.theme };
  const lang = order.lang;
  const price = (cents: number) => formatPrice(cents, lang);
  const e = escapeHtml;
  const totals = order.totals;
  const name = order.customer.firstName;
  const zoneLabel = totals.shipping ? t(`core.zone.${totals.shipping.zone}`) : '';
  const hasOriginal = order.lines.some((l) => l.kind === 'original');

  const subject = t('email_conferma.oggetto', { numero: order.number });
  const methodLabel =
    order.payment.method === 'installments'
      ? `${t('checkout.metodo_rate')}${order.payment.installments ? ` — ${t('checkout.metodo_rate_dettaglio', { importo: price(order.payment.installments.amounts[0] ?? 0) })}` : ''}`
      : `${t('checkout.metodo_carta')}${order.payment.last4 ? ` •••• ${order.payment.last4}` : ''}`;

  const font = `font-family:${th.fontFamily};`;
  const heading = `font-family:${th.headingFontFamily};font-weight:normal;color:${th.textColor};`;
  const muted = `color:${th.mutedColor};`;
  const cell = `padding:10px 0;border-bottom:1px solid ${th.borderColor};vertical-align:top;${font}font-size:14px;line-height:1.5;color:${th.textColor};`;

  const lineRows = order.lines
    .map((line) => {
      const img = line.image
        ? `<img src="${e(absolute(line.image.src, options.baseUrl))}" width="64" alt="${e(line.image.alt ?? line.title)}" style="display:block;width:64px;height:auto;border:0;">`
        : '';
      const qty = line.quantity > 1 ? ` × ${line.quantity}` : '';
      return `<tr>
  <td width="76" style="${cell}padding-right:12px;">${img}</td>
  <td style="${cell}"><strong style="font-weight:600;">${e(line.title)}</strong>${e(qty)}<br><span style="${muted}font-size:13px;">${e(describeLine(line, t))}</span></td>
  <td align="right" style="${cell}white-space:nowrap;">${e(price(line.unitPriceCents * line.quantity))}</td>
</tr>`;
    })
    .join('\n');

  // `nowrap` only on amounts: long text values (e.g. the instalments payment method) must be able to wrap,
  // otherwise they widen the 600px table.
  const sumRow = (label: string, value: string, strong = false, wrap = false) =>
    `<tr><td style="${font}font-size:14px;padding:4px 0;${strong ? `font-weight:600;color:${th.textColor};` : muted}">${e(label)}</td><td align="right" style="${font}font-size:14px;padding:4px 0 4px 16px;${wrap ? 'overflow-wrap:anywhere;' : 'white-space:nowrap;'}${strong ? `font-weight:600;color:${th.textColor};` : muted}">${e(value)}</td></tr>`;

  const vatRows = totals.vatExempt
    ? sumRow(t('core.cart.iva_esente'), '')
    : totals.vat
        .map((row) => sumRow(`· ${row.kind === 'original' ? t('carrello.iva_dettaglio_originali') : t('carrello.iva_dettaglio_stampe')}`, price(row.vatCents)))
        .join('');
  const vatTotalRow = totals.vatExempt || totals.vat.length === 0 ? '' : sumRow(t('email_conferma.riga_iva'), price(totals.vatTotalCents));

  const shippingValue = totals.shipping ? (totals.shipping.totalCents === 0 ? t('carrello.spedizione_gratis') : price(totals.shipping.totalCents)) : '—';
  const c = order.customer;
  const addressLines = [
    `${c.firstName} ${c.lastName}`,
    c.address1,
    c.address2,
    `${c.postalCode} ${c.city}${c.province ? ` (${c.province})` : ''}`,
    countryName(c.country, lang),
  ].filter(Boolean);

  const demoBadge = order.isDemo
    ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border:1px solid ${th.accentColor};color:${th.accentColor};${font}font-size:11px;letter-spacing:.08em;">${e(t('demo.etichetta'))}</span>`
    : '';
  const brand = th.logoUrl
    ? `<img src="${e(absolute(th.logoUrl, options.baseUrl))}" width="${th.logoWidth}" alt="${e(th.brandName)}" style="display:inline-block;width:${th.logoWidth}px;height:auto;border:0;vertical-align:middle;">`
    : `<span style="${heading}font-size:22px;letter-spacing:.04em;">${e(th.brandName)}</span>`;

  const p = (text: string, extra = '') =>
    `<p style="margin:0 0 16px;${font}font-size:15px;line-height:1.6;color:${th.textColor};${extra}">${e(text)}</p>`;

  const html = `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${th.backgroundColor};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(t('email_conferma.preheader'))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${th.backgroundColor};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${th.surfaceColor};">
  <tr><td style="padding:32px 40px 8px;border-top:4px solid ${th.accentColor};">${brand}${demoBadge}</td></tr>
  <tr><td style="padding:24px 40px 8px;">
    <h1 style="margin:0 0 20px;${heading}font-size:24px;line-height:1.3;">${e(t('email_conferma.saluto', { nome: name }))}</h1>
    ${p(t('email_conferma.corpo'))}
    ${hasOriginal ? p(t('email_conferma.corpo_originale')) : ''}
    <p style="margin:0 0 8px;${font}font-size:13px;letter-spacing:.06em;text-transform:uppercase;${muted}">${e(t('checkout.numero_ordine', { numero: order.number }))}</p>
  </td></tr>
  <tr><td style="padding:8px 40px;">
    <h2 style="margin:0 0 8px;${heading}font-size:18px;">${e(t('email_conferma.riepilogo_titolo'))}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><th colspan="2" align="left" style="${font}font-size:12px;font-weight:normal;letter-spacing:.06em;text-transform:uppercase;${muted}padding:8px 0;border-bottom:1px solid ${th.borderColor};">${e(t('email_conferma.colonna_opera'))}</th><th align="right" style="${font}font-size:12px;font-weight:normal;letter-spacing:.06em;text-transform:uppercase;${muted}padding:8px 0;border-bottom:1px solid ${th.borderColor};">${e(t('email_conferma.colonna_prezzo'))}</th></tr>
      ${lineRows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
      ${sumRow(t('email_conferma.riga_subtotale'), price(totals.subtotalCents))}
      ${sumRow(t('email_conferma.riga_spedizione', { zona: zoneLabel }), shippingValue)}
      ${sumRow(t('email_conferma.riga_totale'), price(totals.totalCents), true)}
      ${vatTotalRow}
      ${vatRows}
      ${sumRow(t('email_conferma.riga_metodo'), methodLabel, false, true)}
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px 8px;">
    <h2 style="margin:0 0 8px;${heading}font-size:18px;">${e(t('email_conferma.spedizione_titolo'))}</h2>
    <p style="margin:0 0 16px;${font}font-size:14px;line-height:1.6;color:${th.textColor};">${addressLines.map(e).join('<br>')}</p>
    <h2 style="margin:0 0 8px;${heading}font-size:18px;">${e(t('email_conferma.tempi_titolo'))}</h2>
    ${p(t('email_conferma.tempi_testo'))}
  </td></tr>
  <tr><td style="padding:8px 40px 32px;">
    ${p(t('email_conferma.domande'))}
    ${p(t('email_conferma.chiusura'), 'margin-bottom:4px;')}
    <p style="margin:0 0 24px;${heading}font-size:20px;">${e(t('email_conferma.firma'))}</p>
    ${p(t('email_conferma.ps'), `${muted}font-size:14px;font-style:italic;`)}
  </td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:16px 40px;${font}font-size:12px;line-height:1.6;${muted}text-align:center;">
    ${e(t('email_conferma.footer'))}${order.isDemo ? `<br><strong style="color:${th.accentColor};">${e(t('email_conferma.footer_demo'))}</strong>` : ''}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const textLines = [
    t('email_conferma.saluto', { nome: name }),
    '',
    t('email_conferma.corpo'),
    hasOriginal ? t('email_conferma.corpo_originale') : '',
    '',
    t('checkout.numero_ordine', { numero: order.number }),
    '',
    ...order.lines.map((l) => `- ${l.title}${l.quantity > 1 ? ` × ${l.quantity}` : ''} (${describeLine(l, t)}): ${price(l.unitPriceCents * l.quantity)}`),
    '',
    `${t('email_conferma.riga_subtotale')}: ${price(totals.subtotalCents)}`,
    `${t('email_conferma.riga_spedizione', { zona: zoneLabel })}: ${shippingValue}`,
    `${t('email_conferma.riga_totale')}: ${price(totals.totalCents)}`,
    ...(totals.vatExempt
      ? [t('core.cart.iva_esente')]
      : [
          `${t('email_conferma.riga_iva')}: ${price(totals.vatTotalCents)}`,
          ...totals.vat.map((r) => `  ${formatPercent(r.rate, lang)}: ${price(r.vatCents)}`),
        ]),
    `${t('email_conferma.riga_metodo')}: ${methodLabel}`,
    '',
    t('email_conferma.spedizione_titolo'),
    ...addressLines,
    '',
    t('email_conferma.tempi_testo'),
    '',
    t('email_conferma.domande'),
    t('email_conferma.chiusura'),
    t('email_conferma.firma'),
    '',
    t('email_conferma.footer'),
    order.isDemo ? t('email_conferma.footer_demo') : '',
  ];

  return { subject, html, text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}
