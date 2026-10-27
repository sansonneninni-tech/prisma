/* Testi inglesi. L'italiano è già nell'HTML e viene letto dalla pagina. */
export const EN = {
  'nav.lavori': 'Work', 'nav.formati': 'Formats', 'nav.studio': 'Studio',
  'face.1': 'Brief', 'face.2': 'Production', 'face.3': 'Editing',
  'intro.l1': 'Video production studio', 'intro.l2': 'Puglia, Italy', 'intro.drag': 'Drag the prism', 'intro.cta': 'Work',
  'works.t': 'Work',
  'f.all': 'All', 'f.editoriale': 'Editorial', 'f.social': 'Short form', 'f.evento': 'Event reel', 'f.original': 'Originals',
  'tag.case': 'Case study', 'tag.original': 'Original', 'tag.drive': 'Drive',
  'sys.label': 'The content system', 'sys.t': 'One shoot day.<br />Months of content.',
  'sys.k1': 'shoot day', 'sys.k2': 'pieces shot', 'sys.k3': 'ready to post', 'sys.k4': 'in reserve, available for 12 months',
  'sys.src': 'Real numbers · Isabella Pistillo',
  'fmt.evento.t': 'Event reel', 'fmt.evento.d': 'One vertical reel up to 45″, ready the day after.',
  'fmt.social.t': 'Short form', 'fmt.social.d': 'A series of 7–30″ videos in one visual language.',
  'fmt.ed.t': 'Editorial', 'fmt.ed.d': 'The brand story: concept, shoot, edit, colour.',
  'fmt.sys.t': 'Content system', 'fmt.sys.tag': 'Recommended', 'fmt.sys.d': '14 pieces ready, 24 in reserve. All from one day.',
  'fmt.ask': 'Ask', 'fmt.t': 'Formats', 'fmt.evento.u': '1 reel · up to 45″', 'fmt.social.u': '7–30″ videos · every format', 'fmt.ed.u': 'One or more shoot days', 'sys.g1': 'manifesto', 'sys.g2': 'short', 'sys.g3': 'micro', 'p.da': 'from', 'unit': '≈ {v} per piece',
  'fmt.note': 'Travel not included. The exact quote follows the brief.',
  'studio.label': 'Studio', 'studio.t': 'Two people, from brief to export.',
  'studio.ninni': 'Direction, edit, colour', 'studio.ernesto': 'Production and clients',
  'studio.p': 'Based in Puglia. We travel where the work is.', 'studio.foto': 'Photography · Ninni & Ernesto',
  'ct.label': 'Contact', 'ct.name': 'Name', 'ct.format': 'What you need', 'ct.msg': 'The project, in two lines', 'ct.send': 'Send', 'ct.ok': 'Got it. We’ll reply soon.', 'ct.err': 'Something went wrong. Write us on WhatsApp.',
  'pl.dl': 'Download original', 'pl.drive': 'Watch on Drive', 'pl.case': 'Open the case', 'pl.close': 'Close',
  // pagina caso studio
  'cs.back': 'All work', 'cs.label': 'Case study · Artist',
  'cs.lead': 'A painter needed a lasting presence, not a single video. We shot for one day.',
  'cs.k1': 'shoot day', 'cs.k2': 'pieces delivered', 'cs.k3': 'in reserve', 'cs.k4': 'weeks of posts',
  'cs.ed': 'Manifesto · 52″', 'cs.sh': 'Short videos', 'cs.mi': 'Micro', 'cs.res': 'Reserve: 24 pieces already shot, activated when needed.',
  'cs.cta': 'Same system for you', 'cs.cta.b': 'Formats and prices',
}

const IT_EXTRA = { 'tag.case': 'Caso studio', 'tag.original': 'Originale', 'tag.drive': 'Drive', 'unit': '≈ {v} a contenuto', 'ct.err': 'Qualcosa è andato storto. Scrivici su WhatsApp.', 'pl.drive': 'Guarda su Drive' }
let IT = null

export function captureIT() {
  if (IT) return IT
  IT = { ...IT_EXTRA }
  document.querySelectorAll('[data-i18n]').forEach(el => { IT[el.dataset.i18n] ??= el.textContent })
  document.querySelectorAll('[data-i18n-html]').forEach(el => { IT[el.dataset.i18nHtml] ??= el.innerHTML })
  return IT
}

export function getLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (q === 'en' || q === 'it') return q
    const s = localStorage.getItem('prisma-lang')
    if (s) return s
  } catch (e) { /* storage non disponibile */ }
  return 'it'
}

export function t(key, lang) {
  const it = captureIT()
  return lang === 'en' ? (EN[key] ?? it[key] ?? key) : (it[key] ?? key)
}

export function applyLang(lang) {
  const it = captureIT()
  document.documentElement.lang = lang
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n
    el.textContent = lang === 'en' ? (EN[k] ?? it[k]) : it[k]
  })
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const k = el.dataset.i18nHtml
    el.innerHTML = lang === 'en' ? (EN[k] ?? it[k]) : it[k]
  })
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)))
  try { localStorage.setItem('prisma-lang', lang) } catch (e) { /* ok */ }
  document.dispatchEvent(new CustomEvent('langchange', { detail: lang }))
}
