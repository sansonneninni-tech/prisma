/* Testi inglesi. L'italiano è già nell'HTML e viene letto dalla pagina. */
export const EN = {
  skip: 'Skip to work',
  'nav.lavori': 'Work', 'nav.sistema': 'System', 'nav.formati': 'Formats', 'nav.studio': 'Studio', 'nav.cta': 'Get a quote',
  'hero.eyebrow': 'Video production studio · Puglia, Italy',
  'hero.l1': 'The light', 'hero.l2': 'you don’t', 'hero.l3': 'expect.',
  'hero.now': 'In the prism', 'hero.cue': 'See the work',
  'works.title': 'Work',
  'f.all': 'All', 'f.editoriale': 'Editorial', 'f.social': 'Short form', 'f.evento': 'Event reel', 'f.sistema': 'System', 'f.altro': 'Not sure yet',
  'v.index': 'Index', 'v.grid': 'Grid',
  'case.eyebrow': 'Case study', 'case.title': 'Isabella Pistillo', 'case.n1': 'day', 'case.n2': 'pieces', 'case.n3': 'weeks', 'case.cta': 'Open the case',
  'sys.eyebrow': 'The content system',
  'sys.title': 'One day.<br />Months of content.',
  'sys.s0': 'shoot day. A single ray of light.',
  'sys.s1': 'possible pieces: 1 manifesto, 12 short videos, 25 micro.',
  'sys.s2': 'ready to publish: 1 + 5 + 8.',
  'sys.s3': 'stay in the <em>reserve</em>. Activated when you need them, for 12 months, with no new shoot.',
  'sys.s4': 'weeks covered. One piece a week, one identity.',
  'sys.note': 'Real numbers from the <a href="/isabella/" data-transition>Isabella Pistillo project</a>.',
  'met.eyebrow': 'How we work',
  'fmt.title': 'Formats', 'fmt.aside': 'Real price ranges. The exact quote comes after the brief.',
  'fmt.evento.t': 'Event reel', 'fmt.evento.d': 'One vertical reel up to 45 seconds, ready to post right after the night.',
  'fmt.evento.i1': 'Half or full day on location', 'fmt.evento.i2': 'Edit, colour and music', 'fmt.evento.i3': 'Discreet among the guests',
  'fmt.social.t': 'Short form', 'fmt.social.d': 'A series of short reels, stories and micro-visuals in one visual language.',
  'fmt.social.i1': 'Shared content plan', 'fmt.social.i2': 'Shoot day at your chosen locations', 'fmt.social.i3': '7 to 30 second videos, every format',
  'fmt.ed.t': 'Editorial', 'fmt.ed.tag': 'Most requested', 'fmt.ed.d': 'The core story of a brand. Concept, production and edit with full visual continuity.',
  'fmt.ed.i1': 'Concept and script', 'fmt.ed.i2': 'One or more shoot days', 'fmt.ed.i3': 'Colour grading and sound design',
  'fmt.see': 'See examples', 'fmt.ask': 'Ask', 'p.da': 'from', 'p.a': 'to',
  'menu.eyebrow': '04 · The complete system',
  'menu.title': 'Three months of content.<br />One production.',
  'menu.i1': 'manifesto film, 40–60"', 'menu.i2': 'short videos, 7–15"', 'menu.i3': 'animated micro-visuals',
  'menu.plus': 'Concept, shoot day, edit, colour, sound design, cuts for website and Instagram.',
  'menu.q': 'How much of the reserve do you want?',
  'menu.tot': 'Total', 'menu.unit': 'Per piece', 'menu.count': 'Pieces', 'menu.cta': 'Ask for this setup',
  'fmt.note': 'Travel and expenses not included.',
  'orig.title': 'Off commission', 'orig.aside': 'Our own work, no client. Where we test what we later bring on set.',
  'studio.eyebrow': 'The studio', 'studio.ninni': 'Direction, edit, colour.', 'studio.ernesto': 'Production and clients.',
  'studio.p': 'Two people, one team from the first brief to the final export. Based in Puglia, we travel where the work is.',
  'studio.foto': 'We shoot stills too. Fine art prints',
  'ct.title': 'Write us.', 'ct.name': 'Name', 'ct.company': 'Company or project', 'ct.format': 'What you need', 'ct.msg': 'Tell us about the project', 'ct.send': 'Send', 'ct.ok': 'Got it. We’ll get back to you soon.',
  'ftr.top': 'Back to top',
  'pl.dl': 'Download original', 'pl.drive': 'Watch on Drive', 'pl.case': 'Open the case',
  // pagina caso studio
  'cs.back': 'All work', 'cs.eyebrow': 'Case study · Artist', 'cs.title': 'Isabella<br />Pistillo',
  'cs.lead': 'A painter from Puglia needed a presence that lasts, not a single video. We shot for one day.',
  'cs.k1': 'shoot day', 'cs.k2': 'pieces delivered', 'cs.k3': 'in the reserve', 'cs.k4': 'weeks of posts',
  'cs.ed.t': 'The manifesto', 'cs.ed.d': '52 seconds. The ray of light everything else comes from.',
  'cs.sh.t': 'Five short videos', 'cs.sh.d': 'Satellites of the manifesto: works, details, process.',
  'cs.mi.t': 'Eight micro', 'cs.mi.d': 'Moving bases for her own words. She adds the text, we keep the identity.',
  'cs.res.t': 'The reserve', 'cs.res.d': 'The footage is worth more than what we deliver today. 24 more pieces are already shot and can be activated at any time over 12 months.',
  'cursor.view': 'Watch', 'cursor.play': 'Play', 'cursor.case': 'Open',
  'cs.cta.t': 'Want the same system?', 'cs.cta.b': 'See formats and prices',
}

const IT_EXTRA = { 'cursor.view': 'Guarda', 'cursor.play': 'Play', 'cursor.case': 'Apri' }
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
