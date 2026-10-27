/* Lista lavori comune alle versioni A e B: un oggetto piatto per ogni video. */
import { LAVORI, ORIGINAL, FORMATI, CONTATTI } from '../data.js'

const media = (id, f) => `/media/${id}/${f}`

export const CATS = {
  editoriale: { it: 'Editoriale', en: 'Editorial' },
  social: { it: 'Short form', en: 'Short form' },
  evento: { it: 'Reel evento', en: 'Event reel' },
  sistema: { it: 'Sistema', en: 'System' },
  original: { it: 'Original', en: 'Original' },
}

export function works() {
  const list = LAVORI.map(w => ({
    id: w.id,
    title: w.cliente,
    sub: w.sub,
    cat: w.formato,
    ratio: w.ratio,
    poster: w.cover ? `/img/covers/${w.cover}` : media(w.media, 'poster.jpg'),
    preview: w.media ? media(w.media, 'preview.mp4') : null,
    src: w.media ? media(w.media, 'web.mp4') : null,
    dl: w.media ? `/originali/${w.media}.mp4` : null,
    drive: w.drive || null,
    caso: w.caso || null,
  }))
  ORIGINAL.forEach(o => list.push({
    id: o.id, title: o.titolo, sub: { it: 'Progetto PRISMA', en: 'PRISMA project' }, cat: 'original', ratio: '16/9',
    poster: media(o.media, 'poster.jpg'), preview: media(o.media, 'preview.mp4'), src: media(o.media, 'web.mp4'),
    dl: `/originali/${o.media}.mp4`, drive: null, caso: null,
  }))
  return list
}

export const euro = (n, lang) => {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.')
  return lang === 'en' ? `€${s}` : `€ ${s}`
}

export function wireContacts(root = document) {
  root.querySelectorAll('[data-wa]').forEach(a => { a.href = `https://wa.me/${CONTATTI.whatsapp}` })
  root.querySelectorAll('[data-mail]').forEach(a => { a.href = `mailto:${CONTATTI.email}`; if (!a.textContent.trim()) a.textContent = CONTATTI.email })
  root.querySelectorAll('[data-ig]').forEach(a => { a.href = `https://instagram.com/${CONTATTI.instagram}`; if (!a.textContent.trim()) a.textContent = `@${CONTATTI.instagram}` })
  root.querySelectorAll('[data-foto]').forEach(a => { a.href = CONTATTI.sitoFoto })
  root.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear() })
}

/* Testi: italiano scritto nell'HTML, inglese dal dizionario della versione */
export function makeLang(EN) {
  const IT = {}
  document.querySelectorAll('[data-i18n]').forEach(el => { IT[el.dataset.i18n] = el.innerHTML })
  let lang = 'it'
  try { lang = localStorage.getItem('prisma-lang') || (navigator.language?.startsWith('it') ? 'it' : 'en') } catch { }
  function apply(l) {
    lang = l
    try { localStorage.setItem('prisma-lang', l) } catch { }
    document.documentElement.lang = l
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n
      const v = l === 'en' ? EN[k] : IT[k]
      if (v != null) el.innerHTML = v
    })
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)))
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }))
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => apply(b.dataset.lang)))
  return { get: () => lang, apply, t: (k) => (lang === 'en' ? EN[k] : IT[k]) ?? k }
}

/* Modulo contatti Netlify (stesso nome del sito principale) */
export function wireForm(form, { ok, err }) {
  if (!form) return
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const out = form.querySelector('[data-form-out]')
    try {
      const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
      if (!r.ok) throw new Error(r.status)
      form.reset(); if (out) out.textContent = ok()
    } catch { if (out) out.textContent = err() }
  })
}

/* Navigazione a schermate: rotella, tastiera, swipe. onGo(i, dir) fa la transizione e restituisce una Promise. */
export function viewNav(count, onGo, { start = 0, canNav = () => true } = {}) {
  let cur = start, busy = false, acc = 0, lockUntil = 0
  async function go(i) {
    i = Math.max(0, Math.min(count - 1, i))
    if (i === cur || busy) return
    const dir = i > cur ? 1 : -1, from = cur
    busy = true; cur = i
    try { await onGo(i, dir, from) } finally { busy = false; lockUntil = performance.now() + 380 }
  }
  addEventListener('wheel', (e) => {
    if (!canNav(e)) return
    e.preventDefault()
    const now = performance.now()
    if (busy || now < lockUntil) { acc = 0; return }
    acc += e.deltaY
    if (Math.abs(acc) > 40) { go(cur + Math.sign(acc)); acc = 0 }
  }, { passive: false })
  let ty = null, tx = null
  addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; tx = e.touches[0].clientX }, { passive: true })
  addEventListener('touchend', (e) => {
    if (ty == null || !canNav(e)) return
    const dy = ty - e.changedTouches[0].clientY, dx = tx - e.changedTouches[0].clientX
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) go(cur + Math.sign(dy))
    ty = null
  }, { passive: true })
  addEventListener('keydown', (e) => {
    if (!canNav(e) || e.target.closest?.('input,textarea,select')) return
    const k = e.key
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.target.closest('button,a'))) { e.preventDefault(); go(cur + 1) }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(cur - 1) }
    else if (k === 'Home') go(0)
    else if (k === 'End') go(count - 1)
  })
  return { go, get cur() { return cur } }
}
