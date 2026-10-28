import '@fontsource-variable/archivo/wdth.css'
import './b.css'
import { gsap } from 'gsap'
import { PREZZI, LAVORI } from '../data.js'
import { works, CATS, euro, wireContacts, makeLang, wireForm, viewNav } from '../shared/works.js'
import { initTetra } from '../tetra.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const setH = () => document.documentElement.style.setProperty('--app-h', `${innerHeight}px`)
setH(); addEventListener('resize', setH)

const EN = {
  'nav.1': 'Work', 'nav.2': 'Formats', 'nav.3': 'Studio',
  'pp.pause': 'Pause', 'pp.play': 'Play', 'cue': 'Scroll to discover',
  'sys.k': 'Recommended', 'sys.h': 'Content system', 'sys.lead': 'One shoot day. Months of content.',
  'pr.1': 'editorial', 'pr.2': 'short', 'pr.3': 'micro', 'pr.src': 'shoot day',
  'st.1': 'shoot day', 'st.2': 'pieces shot, one visual language', 'st.3': 'editorial, short, micro', 'st.4': 'ready to post, in the reserve for 12 months',
  'cal.1': 'ready', 'cal.2': 'in the reserve, 12 months', 'cue.sys': 'Recommended: the content system', 'one.h': 'Three formats',
  'sys.ask': 'Ask for the system', 'sys.case': 'The system at work: Isabella Pistillo',
  'sys.res': 'The reserve opens when you need it: +3&nbsp;short&nbsp;€99 · +3&nbsp;short and&nbsp;5&nbsp;micro&nbsp;€199 · all&nbsp;24&nbsp;€549',
  'one.k': 'Formats',
  'f.evento': 'Event reel', 'f.evento.d': 'One vertical reel up to 45″, ready the day after the event.',
  'f.evento.1': 'Filming during the event', 'f.evento.2': 'Edit, colour and music', 'f.evento.3': 'Delivered in 9:16 the next day',
  'f.social': 'Short form', 'f.social.d': 'A series of 7 to 30″ videos with one visual language.',
  'f.social.1': 'Concept and shot plan', 'f.social.2': 'Filming, edit, colour, lettering', 'f.social.3': 'Every video in 9:16, 4:5 and 16:9',
  'f.ed': 'Editorial', 'f.ed.d': 'The brand story, from concept to colour.',
  'f.ed.1': 'One or more shoot days', 'f.ed.2': 'Direction, light and sound on set', 'f.ed.3': 'Edit, colour grading, sound design',
  'f.sys': 'Content system',
  'p.da': 'from', 'p.a': 'to', 'ask': 'Ask', 'ex': 'Watch an example', 'unit': '≈ {v} per piece',
  'f.note': 'Travel not included. The exact quote follows the brief.',
  's.h': 'Two people,<br />from&nbsp;brief to export.', 's.alt': 'Ninni and Ernesto, PRISMA',
  's.team': 'Studio · Puglia', 's.ninni': 'Direction, edit, colour', 's.ernesto': 'Production and clients', 's.foto': 'Photography · Ninni &amp; Ernesto',
  's.direct': 'Contacts', 's.clients': 'Clients', 's.name': 'Name', 's.fmt': 'What you need', 's.msg': 'The project, in two lines', 's.send': 'Send',
  's.ok': 'Got it. We’ll reply soon.', 's.err': 'Something went wrong. Write us on WhatsApp.',
  'all': 'All', 'pl.back': 'All work', 'pl.close': 'Close', 'pl.dl': 'Download original', 'pl.case': 'Open the case', 'drive': 'Watch on Drive',
  'cs.back': 'Back', 'cs.k': 'Case study · Artist', 'cs.play': 'Watch the editorial with sound', 'cs.pause': 'Pause', 'cs.resume': 'Play', 'cs.audio': 'Sound', 'cs.full': 'Full screen', 'cs.dl': 'Download original',
  'cs.lead': 'An artist needed a steady presence, not a video. We shot one day.', 'cs.k1': 'shoot day', 'cs.k2': 'pieces delivered', 'cs.k3': 'in the reserve', 'cs.k4': 'weeks of&nbsp;posts',
  'cs.sh': 'short', 'cs.sh.d': 'with sound, they open', 'cs.mi': 'micro', 'cs.mi.d': 'write on them and download the video', 'cs.res': 'Reserve: 24 pieces already shot, activated when needed.', 'cs.cta': 'The same system, for you', 'cs.cta.b': 'The content system',
  'fa.client': 'Client', 'fa.fmt': 'Format', 'fa.ratio': 'Ratio', 'fa.len': 'Length', 'fa.where': 'Where',
}
const L = makeLang(EN)
const IT_X = {
  'pp.play': 'Play', 's.ok': 'Ricevuto. Ti rispondiamo a breve.', 's.alt': 'Ninni ed Ernesto, PRISMA', 's.clients': 'Clienti', 's.err': 'Qualcosa non va. Scrivici su WhatsApp.', all: 'Tutti', unit: '≈ {v} a contenuto',
  'cs.resume': 'Riprendi', 'fa.client': 'Cliente', 'fa.fmt': 'Formato', 'fa.ratio': 'Proporzioni', 'fa.len': 'Durata', 'fa.where': 'Dove',
}
const t = (k) => (L.get() === 'en' ? EN[k] : (IT_X[k] ?? L.t(k)))
const tx = (o) => o[L.get()] ?? o.it

wireContacts()
wireForm($('[data-form]'), { ok: () => { $('[data-form-out]').dataset.k = 's.ok'; return t('s.ok') }, err: () => { $('[data-form-out]').dataset.k = 's.err'; return t('s.err') } })

/* ---------- prezzi, segnaposto, clienti ---------- */
function paint() {
  const l = L.get()
  $$('[data-from]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.from].da, l) })
  $$('[data-to]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.to].a, l) })
  $$('[data-base]').forEach(el => { el.textContent = euro(PREZZI.sistema.base, l) })
  $$('[data-unit]').forEach(el => { el.textContent = t('unit').replace('{v}', euro(PREZZI.sistema.base / PREZZI.sistema.contenuti, l)) })
  $$('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt) })
  logos.setAttribute('aria-label', t('s.clients'))
  const fo = $('[data-form-out]'); if (fo.dataset.k) fo.textContent = t(fo.dataset.k)
  $('[data-reel-pp] span').textContent = t(paused ? 'pp.play' : 'pp.pause')
}
/* loghi dei clienti nello Studio, uno per cliente */
const logos = $('[data-logos]'), seenLogo = new Set()
LAVORI.forEach(w => {
  if (!w.logo || seenLogo.has(w.logo)) return
  seenLogo.add(w.logo)
  const li = document.createElement('li')
  const img = new Image()
  img.alt = w.cliente; img.loading = 'lazy'; img.src = `/img/loghi/${w.logo}`
  if (w.logo === 'panegos.png') img.classList.add('is-thin')
  /* stessa area per tutti i loghi: i larghi si abbassano, i quadrati salgono */
  /* correzione ottica per i loghi molto pieni o molto sottili */
  const k = { 'nugnes.png': .8, 'archemi.png': 1.25, 'antica-enotria.png': 1.25, 'panegos.png': 1.1 }[w.logo] || 1
  const fit = () => { const a = img.naturalWidth / img.naturalHeight; if (a) img.style.height = `${Math.min(30, Math.max(12, Math.sqrt(1100 / a) * k))}px` }
  img.complete ? fit() : img.addEventListener('load', fit, { once: true })
  li.append(img); logos.append(li)
})

/* ---------- apertura: il prisma rifrange la luce, poi il video ---------- */
const load = $('[data-load]')
const tetra = initTetra($('[data-tetra]'), { reduced })
tetra.kick(3)
function reveal() {
  const d = reduced ? 0 : 1
  const tl = gsap.timeline({ delay: reduced ? 0 : .25 })
  tl.fromTo('.load__in', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .7 * d, ease: 'power2.in' })
    .fromTo('.load__out', { scaleX: 0, opacity: .92, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .8 * d, ease: 'expo.out', stagger: .07 }, '>-.05')
    .to(load, { clipPath: 'inset(0 0 100% 0)', duration: .9 * d, ease: 'expo.inOut', onComplete: () => { load.remove(); tetra.pause() } }, '+=.35')
    .from('.lg', { yPercent: 30, opacity: 0, duration: .9 * d, ease: 'expo.out', clearProps: 'transform,opacity' }, '-=.4')
  return tl
}

/* ---------- home: video a tutto schermo ---------- */
const all = works().map(w => ({ ...w, hover: w.preview ? w.preview.replace('preview.mp4', 'hover.mp4') : null }))
const REEL = {
  h: { src: '/media/_reel/reel-h.mp4', poster: '/media/_reel/reel-h.jpg', seg: 4, names: ['DF Marmi'] },
  v: { src: '/media/_reel/reel-v.mp4', poster: '/media/_reel/reel-v.jpg', seg: 3.6, names: ['Archemi', 'Petali', 'T.G.T.M.', 'Trailer', 'Edward'] },
}
const rv = $('[data-reel] video')
const now = $('[data-reel-now]')
let paused = false, reelKind = ''
function setReel() {
  const k = innerWidth / innerHeight > 1 ? 'h' : 'v'
  if (k === reelKind) return
  reelKind = k
  rv.src = REEL[k].src; rv.poster = REEL[k].poster; rv.loop = true
  if (cur === 0 && !paused) rv.play().catch(() => {})
}
rv.addEventListener('timeupdate', () => {
  const r = REEL[reelKind]; const n = Math.min(r.names.length - 1, Math.floor(rv.currentTime / r.seg) % r.names.length)
  const txt = r.names[n]
  if (now.textContent !== txt) now.textContent = txt
})
rv.addEventListener('playing', () => rv.classList.add('is-on'))
addEventListener('resize', setReel)
function playReel() { setReel(); if (!paused && pl.hidden) rv.play().catch(() => {}) }
const pp = $('[data-reel-pp]')
pp.addEventListener('click', () => {
  paused = !paused
  pp.setAttribute('aria-pressed', String(paused))
  paused ? rv.pause() : rv.play().catch(() => {})
  paint()
})

/* ---------- lavori: indice di titoli ---------- */
const idx = $('[data-idx]'), sec = $('.v--works'), bgv = $('[data-bgv]'), bgVid = $('video', bgv), bgImg = $('.bgv__img', bgv), bgBlur = $('.bgv__blur', bgv)
const meta = $('[data-idx-meta]')
let filter = 'all'
function buildIdx() {
  idx.innerHTML = ''
  all.forEach((w, i) => {
    const li = document.createElement('li')
    li.dataset.cat = w.cat
    const a = document.createElement('a')
    a.href = `#lavori/${w.id}`
    a.innerHTML = `${w.title}<sup>${String(i + 1).padStart(2, '0')}</sup>`
    a.dataset.i = i
    li.append(a, document.createTextNode(' '))
    idx.append(li)
  })
  applyFilter()
}
const band = $('[data-band]')
function buildBand() {
  const cats = ['all', 'editoriale', 'social', 'evento', 'sistema', 'original']
  const one = cats.map(c => `<button type="button" data-f="${c}" aria-pressed="${c === filter}">${c === 'all' ? t('all') : tx(CATS[c])}</button>`).join('')
  band.innerHTML = `<div class="band__t"><span>${one}</span><span aria-hidden="true">${one}</span><span aria-hidden="true">${one}</span><span aria-hidden="true">${one}</span></div>`
  $$('[aria-hidden] button', band).forEach(b => { b.tabIndex = -1 })
}
band.addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return
  filter = filter === b.dataset.f ? 'all' : b.dataset.f
  $$('[data-f]', band).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.f === filter)))
  applyFilter()
})
function applyFilter() {
  let n = 0
  $$('li', idx).forEach(li => {
    const on = filter === 'all' || li.dataset.cat === filter
    li.classList.toggle('is-off', !on)
    $('a', li).tabIndex = on ? 0 : -1
    if (on) n++
  })
  meta.textContent = `${n} / ${all.length} — ${filter === 'all' ? t('all') : tx(CATS[filter])}`
}
let hot = null
function showBg(w, a) {
  hot?.classList.remove('is-hot'); hot = a; a?.classList.add('is-hot')
  document.body.classList.toggle('is-hov', !!w)
  if (!w) { sec.classList.remove('is-hover'); bgVid.pause(); applyFilter(); return }
  sec.classList.add('is-hover')
  meta.textContent = `${tx(CATS[w.cat])} — ${tx(w.sub)}${w.drive ? ' — Drive' : ''}`
  bgv.classList.toggle('is-wide', w.ratio === '16/9')
  bgBlur.src = w.poster
  if (w.hover) {
    bgv.classList.remove('is-img')
    if (bgVid.dataset.src !== w.hover) { bgVid.dataset.src = w.hover; bgVid.poster = w.poster; bgVid.preload = 'auto'; bgVid.src = w.hover }
    bgVid.play().catch(() => {})
  } else {
    bgv.classList.add('is-img'); bgImg.src = w.poster; bgVid.pause()
  }
}
if (fine) {
  idx.addEventListener('pointerover', (e) => { const a = e.target.closest('a[data-i]'); if (a && a !== hot) showBg(all[a.dataset.i], a) })
  idx.addEventListener('pointerleave', () => showBg(null))
}
idx.addEventListener('focusin', (e) => { const a = e.target.closest('a[data-i]'); if (a) showBg(all[a.dataset.i], a) })
idx.addEventListener('focusout', () => { if (!idx.matches(':hover')) showBg(null) })

/* ---------- scheda del lavoro: il video si apre dentro il sito ---------- */
const pl = $('[data-pl]'), plStage = $('[data-pl-stage]'), plV = $('.pl__v', pl), plImg = $('.pl__img', pl), plDrive = $('[data-pl-drive]')
let plList = [], plIdx = 0, plFocus = null, plPushed = false
const listFor = () => all.filter(w => filter === 'all' || w.cat === filter)
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
function fitStage() {
  if (pl.hidden) return
  const w = plList[plIdx]; if (!w) return
  const [a, b] = (w.ratio || '16/9').split('/').map(Number)
  const r = a / b
  const W = plStage.clientWidth, H = plStage.clientHeight
  const width = Math.min(W, H * r), height = width / r
  ;[plV, plImg].forEach(el => { el.style.width = `${Math.floor(width)}px`; el.style.height = `${Math.floor(height)}px` })
}
new ResizeObserver(() => fitStage()).observe(plStage)
function facts(w, len) {
  const rows = [[t('fa.client'), w.client || w.title], [t('fa.fmt'), tx(CATS[w.cat])], [t('fa.ratio'), (w.ratio || '').replace('/', ':')]]
  if (len) rows.push([t('fa.len'), len])
  if (w.drive) rows.push([t('fa.where'), 'Google Drive'])
  $('[data-pl-facts]').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
}
function plShow() {
  const w = plList[plIdx]
  $('[data-pl-cat]').textContent = tx(CATS[w.cat])
  $('[data-pl-title]').textContent = w.title
  $('[data-pl-sub]').textContent = tx(w.sub)
  $('[data-pl-count]').textContent = `${String(plIdx + 1).padStart(2, '0')} / ${String(plList.length).padStart(2, '0')}`
  const dl = $('[data-pl-dl]'), cs = $('[data-pl-case]')
  facts(w)
  if (w.src) {
    plImg.hidden = true; plDrive.hidden = true; plV.hidden = false
    plV.poster = w.poster; plV.src = w.src; plV.muted = false
    plV.play().catch(() => { plV.muted = true; plV.play().catch(() => {}) })
    dl.hidden = false; dl.href = w.dl; dl.setAttribute('download', w.dl.split('/').pop())
  } else {
    plV.pause(); plV.removeAttribute('src'); plV.load(); plV.hidden = true
    plImg.hidden = false; plImg.src = w.poster; plImg.alt = w.title
    plDrive.hidden = false; plDrive.href = w.drive
    dl.hidden = true
  }
  cs.hidden = !w.caso; if (w.caso) cs.href = w.caso
  const prev = plList[(plIdx - 1 + plList.length) % plList.length], next = plList[(plIdx + 1) % plList.length]
  $('[data-pl-prev-t]').textContent = prev.title
  $('[data-pl-next-t]').textContent = next.title
  $('[data-pl-prev]').hidden = $('[data-pl-next]').hidden = plList.length < 2
  fitStage()
  history.replaceState({ pl: 1 }, '', w.short ? '#isabella' : `#lavori/${w.id}`)
}
plV.addEventListener('loadedmetadata', () => { const w = plList[plIdx]; if (w?.src) facts(w, fmtTime(plV.duration)) })
/* il fuoco resta nella finestra aperta (e nella testata): solo elementi che lo prendono davvero */
function trapTab(e, box) {
  const ok = (el) => el.offsetParent !== null && !el.closest('[hidden]') && el.tabIndex >= 0 && getComputedStyle(el).visibility !== 'hidden' && !(el.tagName === 'VIDEO' && !el.controls)
  const f = [$('.lg'), ...$$('.hd a, .hd button'), ...$$('button, a[href], video', box)].filter(ok)
  if (!f.length) return
  /* si muove sempre a mano: la testata e la finestra non sono vicine nel documento */
  const i = f.indexOf(document.activeElement)
  e.preventDefault()
  const first = f.findIndex(el => box.contains(el))
  const n = i < 0 ? (e.shiftKey ? f.length - 1 : Math.max(0, first)) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length
  f[n].focus()
}
function plOpen(w, list = listFor(), push = true, back = null) {
  pl.dataset.back = back || ''
  plList = list.includes(w) ? list : all
  $('.pl__back [data-i18n]', pl).textContent = back || t('pl.back')
  plIdx = Math.max(0, plList.indexOf(w))
  plFocus = document.activeElement
  showBg(null); rv.pause()
  pl.hidden = false
  document.body.classList.add('is-pl')
  if (push) { history.pushState({ pl: 1 }, '', w.short ? '#isabella' : `#lavori/${w.id}`); plPushed = true }
  plShow()
  const d = reduced ? 0 : 1
  gsap.timeline()
    .fromTo(pl, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .8 * d, ease: 'expo.inOut', clearProps: 'clipPath' })
    .fromTo([plStage, ...$$('.pl__info > *', pl)], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7 * d, ease: 'expo.out', stagger: .04, clearProps: 'transform,opacity' }, .35 * d)
  pl.focus({ preventScroll: true })
}
function plClose(fromPop = false) {
  if (pl.hidden || pl.dataset.closing) return
  if (!fromPop && plPushed) { plPushed = false; history.back(); return }
  plPushed = false
  pl.dataset.closing = '1'
  plV.pause()
  gsap.to(pl, {
    clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : .7, ease: 'expo.inOut', onComplete: () => {
      pl.hidden = true; delete pl.dataset.closing; gsap.set(pl, { clearProps: 'clipPath' })
      plV.removeAttribute('src'); plV.load()
      document.body.classList.remove('is-pl')
      history.replaceState(null, '', csOpenNow() ? '#isabella' : `#${HASH[cur]}`)
      pl.dataset.back = ''; $('.pl__back [data-i18n]', pl).textContent = t('pl.back')
      if (cur === 0 && !csOpenNow()) playReel()
      plFocus?.focus?.({ preventScroll: true })
    },
  })
}
const plStep = (d) => { plIdx = (plIdx + d + plList.length) % plList.length; plShow() }
$$('[data-pl-close]').forEach(b => b.addEventListener('click', () => plClose()))
$('[data-pl-prev]').addEventListener('click', () => plStep(-1))
$('[data-pl-next]').addEventListener('click', () => plStep(1))
addEventListener('popstate', () => { if (!pl.hidden) plClose(true) })
addEventListener('keydown', (e) => {
  if (pl.hidden) return
  if (e.key === 'Escape') plClose()
  if (e.key === 'ArrowRight' && e.target !== plV) plStep(1)
  if (e.key === 'ArrowLeft' && e.target !== plV) plStep(-1)
  if (e.key === 'Tab') { // il fuoco resta nella scheda (e nella testata)
    trapTab(e, pl)
  }
})
idx.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-i]'); if (!a) return
  e.preventDefault()
  plOpen(all[a.dataset.i])
})


/* ---------- caso Isabella: si apre dentro il sito ---------- */
const cs = $('[data-cs]'), ed = $('[data-ed]'), edV = $('[data-ed-v]')
const csOpenNow = () => !cs.hidden
const M = (id, f) => `/media/${id}/${f}`
const ED = { prev: M('isabella-editoriale', 'preview.mp4'), src: M('isabella-editoriale', 'web.mp4') }
const SHORTS = [1, 2, 3, 4, 5].map(n => ({
  id: `isabella-short-${n}`, short: true, client: 'Isabella Pistillo', title: `Isabella Pistillo · Short ${String(n).padStart(2, '0')}`, cat: 'social', ratio: '4/5',
  sub: { it: 'Short dal sistema contenuti', en: 'Short from the content system' },
  poster: M(`isabella-short-${n}`, 'poster.jpg'), preview: M(`isabella-short-${n}`, 'preview.mp4'), src: M(`isabella-short-${n}`, 'web.mp4'),
  dl: `/originali/isabella-short-${n}.mp4`, drive: null, caso: null,
}))
const MICROS = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
  n, poster: M(`isabella-micro-${n}`, 'poster.jpg'), preview: M(`isabella-micro-${n}`, 'preview.mp4'), src: M(`isabella-micro-${n}`, 'web.mp4'), original: `/originali/isabella-micro-${n}.mp4`,
}))
let csPushed = false, csFocus = null, csBuilt = false, editor = null, fontsP = null
const fmtMB = (b) => `${(b / 1048576).toFixed(0)} MB`
function thumb(kind, it, k) {
  const b = document.createElement('button')
  b.type = 'button'; b.className = `cs__tb cs__tb--${kind}`; b.dataset.k = k
  b.setAttribute('aria-label', kind === 'sh' ? it.title : `Micro ${String(it.n).padStart(2, '0')}`)
  b.innerHTML = `<img src="${it.poster}" alt="" loading="lazy" decoding="async" />${kind === 'mi' ? '<canvas></canvas>' : ''}<span>${String(kind === 'sh' ? k + 1 : it.n).padStart(2, '0')}</span>`
  return b
}
function csBuild() {
  if (csBuilt) return
  csBuilt = true
  const sh = $('[data-sh]', cs), mi = $('[data-mi]', cs)
  SHORTS.forEach((it, k) => sh.append(thumb('sh', it, k)))
  MICROS.forEach((it, k) => mi.append(thumb('mi', it, k)))
  const tk = $('[data-cs-ticks]', cs)
  for (let k = 0; k < 38; k++) { const i = document.createElement('i'); i.className = k < 14 ? 'is-rdy' : 'is-res'; tk.append(i) }
  fetch('/originali/isabella-editoriale.mp4', { method: 'HEAD' }).then(r => { const n = +r.headers.get('content-length'); if (n) $('[data-ed-size]', cs).textContent = fmtMB(n) }).catch(() => {})
  fontsP = import('./studio/fonts.js').then(() => document.fonts.ready).then(paintMicros)
}
/* sulle copertine dei micro compare il testo già scritto */
async function paintMicros() {
  const { drawText, sanitizeState, FRAME_W } = await import('./studio/render.js')
  $$('.cs__tb--mi', cs).forEach(b => {
    const it = MICROS[+b.dataset.k], c = $('canvas', b)
    let st = null; try { st = sanitizeState(JSON.parse(localStorage.getItem(`prisma-micro-${it.n}`))) } catch { }
    const r = b.getBoundingClientRect(); c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2)
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height)
    if (st?.text) drawText(x, st, 99, c.width / FRAME_W)
  })
}
/* le miniature si ridisegnano quando cambiano misura */
let miRaf = 0
new ResizeObserver(() => { if (!csOpenNow() || !$('canvas', cs)) return; cancelAnimationFrame(miRaf); miRaf = requestAnimationFrame(() => paintMicros()) }).observe($('[data-mi]', cs))
function edIdle() {
  ed.dataset.state = 'idle'
  edV.muted = true; edV.loop = true
  if (edV.dataset.src !== ED.prev) { edV.dataset.src = ED.prev; edV.src = ED.prev }
  $('[data-ed-prog]', cs).style.transform = 'scaleX(0)'
  if (!reduced) edV.play().catch(() => {})
}
function edStart() {
  if (edV.dataset.src !== ED.src) { edV.dataset.src = ED.src; edV.src = ED.src }
  edV.loop = false; edV.muted = false
  try { edV.currentTime = 0 } catch { }
  edV.play().catch(() => { edV.muted = true; edV.play().catch(() => {}) })
}
function edSync() {
  $('[data-ed-tl]', cs).textContent = t(ed.dataset.state === 'playing' ? 'cs.pause' : 'cs.resume')
  $('[data-ed-audio]', cs).setAttribute('aria-pressed', String(!edV.muted)); $('[data-ed-snd]', cs).textContent = edV.muted ? 'off' : 'on'
}
edV.addEventListener('play', () => { if (edV.dataset.src === ED.src) { ed.dataset.state = 'playing'; edSync() } })
edV.addEventListener('pause', () => { if (edV.dataset.src === ED.src && !edV.ended) { ed.dataset.state = 'paused'; edSync() } })
edV.addEventListener('ended', () => { if (edV.dataset.src === ED.src) edIdle() })
edV.addEventListener('volumechange', edSync)
edV.addEventListener('timeupdate', () => { if (edV.dataset.src === ED.src && edV.duration) $('[data-ed-prog]', cs).style.transform = `scaleX(${edV.currentTime / edV.duration})` })
$('[data-ed-play]', cs).addEventListener('click', edStart)
edV.addEventListener('click', () => { if (ed.dataset.state === 'idle') edStart(); else if (edV.paused) edV.play(); else edV.pause() })
$('[data-ed-toggle]', cs).addEventListener('click', () => { edV.paused ? edV.play() : edV.pause() })
$('[data-ed-audio]', cs).addEventListener('click', () => { edV.muted = !edV.muted })
$('[data-ed-full]', cs).addEventListener('click', () => {
  if (ed.dataset.state === 'idle') edStart()
  edV.muted = false
  if (edV.requestFullscreen) edV.requestFullscreen().catch(() => {}); else edV.webkitEnterFullscreen?.()
})
cs.addEventListener('click', (e) => {
  const b = e.target.closest('.cs__tb'); if (!b) return
  edV.pause()
  if (b.classList.contains('cs__tb--sh')) { const w = SHORTS[+b.dataset.k]; plOpen(w, SHORTS, true, 'Isabella Pistillo'); return }
  openMicro(MICROS[+b.dataset.k].n)
})
async function openMicro(n) {
  if (!editor) {
    await import('./studio/studio.css')
    const { createEditor } = await import('./studio/editor.js')
    editor = createEditor({ items: MICROS, lang: () => L.get(), onClose: () => { paintMicros(); $('.pl__back', cs)?.focus?.() } })
  }
  await fontsP
  editor.open(n)
}
if (fine) {
  cs.addEventListener('pointerover', (e) => {
    const b = e.target.closest('.cs__tb'); if (!b || b.contains(e.relatedTarget)) return
    const it = b.classList.contains('cs__tb--sh') ? SHORTS[+b.dataset.k] : MICROS[+b.dataset.k]
    let v = $('video', b)
    if (!v) { v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.src = it.preview; b.prepend(v) }
    v.currentTime = 0; v.play().then(() => b.classList.add('is-playing')).catch(() => {})
  })
  cs.addEventListener('pointerout', (e) => {
    const b = e.target.closest('.cs__tb'); if (!b || b.contains(e.relatedTarget)) return
    const v = $('video', b); v?.pause(); b.classList.remove('is-playing')
  })
}
function csOpen(push = true) {
  if (csOpenNow()) return
  csBuild()
  csFocus = document.activeElement
  rv.pause(); showBg(null)
  cs.hidden = false; document.body.classList.add('is-cs')
  if (push) { history.pushState({ cs: 1 }, '', '#isabella'); csPushed = true }
  edIdle(); edSync()
  const d = reduced ? 0 : 1
  gsap.timeline()
    .fromTo(cs, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .8 * d, ease: 'expo.inOut', clearProps: 'clipPath' })
    .fromTo([ed, ...$$('.cs__info > *', cs)], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7 * d, ease: 'expo.out', stagger: .04, clearProps: 'transform,opacity' }, .35 * d)
  cs.focus({ preventScroll: true })
}
function csClose(fromPop = false, after = null) {
  if (!csOpenNow() || cs.dataset.closing) return
  const edStep = editor?.isOpen && editor.close(true) ? 1 : 0
  if (!fromPop && csPushed) { csPushed = false; csAfter = after; history.go(-1 - edStep); return }
  if (edStep) history.back()
  csPushed = false
  cs.dataset.closing = '1'
  edV.pause()
  gsap.to(cs, {
    clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : .7, ease: 'expo.inOut', onComplete: () => {
      cs.hidden = true; delete cs.dataset.closing; gsap.set(cs, { clearProps: 'clipPath' })
      edV.removeAttribute('src'); delete edV.dataset.src; edV.load()
      document.body.classList.remove('is-cs')
      history.replaceState(null, '', `#${HASH[cur]}`)
      if (cur === 0) playReel()
      const f = after || csAfter; csAfter = null
      if (f) f(); else csFocus?.focus?.({ preventScroll: true })
    },
  })
}
let csAfter = null
$$('[data-cs-close]', cs).forEach(b => b.addEventListener('click', () => csClose()))
$('[data-cs-sys]', cs).addEventListener('click', (e) => {
  e.preventDefault()
  csClose(false, () => {
    nav.go(2)
    setTimeout(() => { fmtSc.scrollTo({ top: sysEl.offsetTop, behavior: reduced ? 'auto' : 'smooth' }); const h = $('#t-sys'); h.tabIndex = -1; h.focus({ preventScroll: true }) }, reduced ? 0 : 1000)
  })
})
addEventListener('popstate', () => {
  if (csOpenNow() && pl.hidden && location.hash !== '#isabella') csClose(true)
})
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#isabella"]'); if (!a) return
  e.preventDefault()
  if (!pl.hidden) { plClose(); setTimeout(() => csOpen(), reduced ? 0 : 800) } else csOpen()
})
addEventListener('keydown', (e) => {
  if (!csOpenNow() || !pl.hidden || editor?.isOpen) return
  if (e.key === 'Escape') csClose()
  if (e.key === 'Tab') {
    trapTab(e, cs)
  }
})

/* ---------- formati: le righe si aprono, il prisma si accende ---------- */
const ac = $('[data-ac]')
function acToggle(li, open) {
  const h = $('.ac__h', li), b = $('.ac__b', li)
  if (open === li.classList.contains('is-open')) return
  li.classList.toggle('is-open', open)
  h.setAttribute('aria-expanded', String(open))
  gsap.killTweensOf(b)
  if (open) {
    b.hidden = false
    gsap.fromTo(b, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: reduced ? 0 : .55, ease: 'expo.out', clearProps: 'height,opacity' })
  } else {
    gsap.to(b, { height: 0, opacity: 0, duration: reduced ? 0 : .4, ease: 'expo.inOut', onComplete: () => { b.hidden = true; gsap.set(b, { clearProps: 'height,opacity' }) } })
  }
}
ac.addEventListener('click', (e) => {
  const h = e.target.closest('.ac__h')
  if (h) { const li = h.closest('.ac__i'); const open = !li.classList.contains('is-open'); $$('.ac__i', ac).forEach(x => acToggle(x, x === li && open)); return }
  const ex = e.target.closest('[data-ex]')
  if (ex) { const w = all.find(x => x.id === ex.dataset.ex); if (w) plOpen(w, [w, ...all.filter(x => x.cat === w.cat && x !== w)]) }
})

/* ---------- sistema contenuti: compare scorrendo e racconta i passaggi ---------- */
const fmtSc = $('[data-fmt-scroll]'), sysEl = $('#sistema'), prism = $('[data-prism]')
const steps = $$('.stp__i'), stpList = $('[data-steps]')
const ticksEl = $('[data-ticks]')
for (let i = 0; i < 38; i++) ticksEl.append(document.createElement('i'))
const ticks = $$('i', ticksEl)
const rays = $$('.pr__rays line', prism)
rays.forEach(l => { l.dataset.x = l.getAttribute('x2'); l.dataset.y = l.getAttribute('y2') })
const dotsG = $('.pr__dots', prism)
/* i raggi finiscono prima della loro etichetta, a qualsiasi larghezza; l'etichetta sta al centro del suo fascio */
rays.forEach(l => { l.dataset.ox = l.dataset.x; l.dataset.oy = l.dataset.y })
const prSvg = $('.pr__svg', prism)
let raysOpen = true
function fitRays() {
  const w = prSvg.clientWidth, h = prSvg.clientHeight
  if (!w) return
  const k = 700 / w
  ;['1', '2', '3'].forEach(g => {
    const lb = $(`.pr__l--${g}`, prism), group = rays.filter(l => l.dataset.g === g)
    const end = Math.min(700, (lb.offsetLeft - 16) * k)
    let sy = 0
    group.forEach(l => {
      const t = (end - 375) / (700 - 375)
      l.dataset.x = end; l.dataset.y = 126 + (+l.dataset.oy - 126) * t; sy += +l.dataset.y
      if (raysOpen) { l.setAttribute('x2', l.dataset.x); l.setAttribute('y2', l.dataset.y) }
    })
    lb.style.top = `${(sy / group.length) / 300 * h - lb.offsetHeight / 2}px`
  })
}
new ResizeObserver(fitRays).observe(prSvg)
const SVGNS = 'http://www.w3.org/2000/svg'
const IN = [[0, 152], [285, 126], [375, 126]]
let sysTl = null, sysLoop = null, sysSeen = false
const stepOn = (n) => () => { steps.forEach((li, k) => li.classList.toggle('is-on', k === n)); stpList.classList.remove('is-done') }
function countUp(el, to, d = .9) { const o = { v: 0 }; return gsap.to(o, { v: to, duration: d, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v) } }) }
function sysFinal() {
  steps.forEach(li => li.classList.remove('is-on')); stpList.classList.add('is-done')
  ticks.forEach((t, k) => { t.className = k < 14 ? 'is-rdy' : 'is-res' })
  gsap.set(['.pr__in', '.pr__beam', '.pr__body', '.pr__line', '.pr__edge', '.pr__src', '.pr__l', '.pr__cal', '.pr__calk > span'], { clearProps: 'all' })
  raysOpen = true
  rays.forEach(l => { l.setAttribute('x2', l.dataset.x); l.setAttribute('y2', l.dataset.y) })
  gsap.set('.pr__rays', { opacity: 1 })
  fitRays()
  $$('.pr__l b', prism).forEach(b => { b.textContent = b.dataset.n })
}
/* la luce che continua a scorrere: un impulso entra nel prisma e si divide nei raggi */
function pulse() {
  const tl = gsap.timeline()
  const c = document.createElementNS(SVGNS, 'circle')
  c.setAttribute('r', 3); c.setAttribute('cx', IN[0][0]); c.setAttribute('cy', IN[0][1]); c.setAttribute('fill', '#0B0A0A'); dotsG.append(c)
  tl.fromTo(c, { attr: { cx: IN[0][0], cy: IN[0][1] }, opacity: 0 }, { attr: { cx: IN[1][0], cy: IN[1][1] }, opacity: 1, duration: 1.1, ease: 'power1.in' })
    .to(c, { attr: { cx: IN[2][0], cy: IN[2][1] }, fill: '#E8722A', duration: .35, ease: 'none' })
    .add(() => c.remove())
  rays.forEach((l) => {
    const d = document.createElementNS(SVGNS, 'circle')
    d.setAttribute('r', 2.4); d.setAttribute('cx', 375); d.setAttribute('cy', 126); d.setAttribute('fill', l.getAttribute('stroke')); d.setAttribute('opacity', 0); dotsG.append(d)
    tl.fromTo(d, { attr: { cx: 375, cy: 126 }, opacity: 1 }, { attr: { cx: +l.dataset.x, cy: +l.dataset.y }, opacity: 0, duration: 1.5, ease: 'power1.out', onComplete: () => d.remove() }, 1.45)
  })
  return tl
}
/* stato di partenza: niente è visibile prima del suo passaggio */
function sysEmpty() {
  sysTl?.kill(); sysLoop?.kill(); dotsG.innerHTML = ''
  if (reduced) { sysFinal(); return }
  steps.forEach(li => li.classList.remove('is-on')); stpList.classList.remove('is-done')
  ticks.forEach(t => { t.className = '' })
  raysOpen = false
  rays.forEach(l => { l.setAttribute('x2', 375); l.setAttribute('y2', 126) })
  $$('.pr__l b', prism).forEach(b => { b.textContent = '0' })
  gsap.set(['.pr__body', '.pr__line', '.pr__edge', '.pr__beam', '.pr__l', '.pr__cal', '.pr__src', '.pr__rays', '.pr__calk > span'], { opacity: 0 })
  gsap.set('.pr__in', { attr: { x2: 0, y2: 152 } })
}
function sysPlay() {
  sysEmpty()
  if (reduced) return
  const nums = $$('.pr__l b', prism)
  sysTl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { sysFinal(); sysLoop = gsap.timeline({ repeat: -1, repeatDelay: .9 }).add(pulse()) } })
  sysTl
    /* 01 · una giornata di riprese: la luce entra */
    .add(stepOn(0))
    .fromTo('.pr__src', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .6 }, 0)
    .fromTo('.pr__in', { attr: { x2: 0, y2: 152 } }, { attr: { x2: 285, y2: 126 }, duration: 1.1, ease: 'power2.inOut' }, .1)
    /* 02 · 38 contenuti girati, un solo linguaggio: il prisma si accende */
    .add(stepOn(1), 1.3)
    .fromTo('.pr__cal', { opacity: 0 }, { opacity: 1, duration: .4 }, 1.3)
    .fromTo(['.pr__body', '.pr__line', '.pr__edge'], { opacity: 0, scale: .9, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: .9, stagger: .06 }, 1.3)
    .fromTo('.pr__beam', { opacity: 0, attr: { x2: 285 } }, { opacity: .8, attr: { x2: 375 }, duration: .5, ease: 'none' }, 1.9)
    /* 03 · 1 editoriale, 12 short, 25 micro: i raggi si separano */
    .add(stepOn(2), 2.5)
    .set('.pr__rays', { opacity: 1 }, 2.5)
    .to(rays.filter(l => l.dataset.g === '1'), { attr: { x2: (i, el) => +el.dataset.x, y2: (i, el) => +el.dataset.y }, duration: 1 }, 2.5)
    .fromTo('.pr__l--1', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .5 }, 2.75)
    .add(() => countUp(nums[0], 1, .3), 2.75)
    .to(rays.filter(l => l.dataset.g === '2'), { attr: { x2: (i, el) => +el.dataset.x, y2: (i, el) => +el.dataset.y }, duration: 1, stagger: .05 }, 2.95)
    .fromTo('.pr__l--2', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .5 }, 3.2)
    .add(() => countUp(nums[1], 12, .7), 3.2)
    .to(rays.filter(l => l.dataset.g === '3'), { attr: { x2: (i, el) => +el.dataset.x, y2: (i, el) => +el.dataset.y }, duration: 1, stagger: .05 }, 3.4)
    .fromTo('.pr__l--3', { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .5 }, 3.65)
    .add(() => countUp(nums[2], 25, .9), 3.65)
    /* 04 · 14 pronti subito, 24 in riserva per 12 mesi */
    .add(stepOn(3), 4.6)
    .fromTo('.pr__calk > span', { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: .6, stagger: .5 }, 4.75)
    .to({}, { duration: 1.6 })
  /* le tacche dentro la timeline: se si esce a metà si fermano con lei */
  ticks.forEach((t, k) => {
    sysTl.add(() => t.classList.add('is-shot'), 1.4 + k * .018)
    sysTl.add(() => t.classList.add(k < 14 ? 'is-rdy' : 'is-res'), 4.7 + (k < 14 ? k : 14 + (k - 14) * .5) * .034)
  })
}
function sysReset() { sysEmpty(); sysSeen = false }
let edgeLoop = null
function prismOn() { if (reduced) return; edgeLoop ??= gsap.timeline({ repeat: -1, yoyo: true }).to('#prEdge', { attr: { x1: 198, x2: 362 }, duration: 3.4, ease: 'sine.inOut' }, 0).to('.pr__warm', { scale: 1.06, transformOrigin: '50% 50%', duration: 3.4, ease: 'sine.inOut' }, 0); edgeLoop.play(); sysLoop?.play() }
function prismOff() { edgeLoop?.pause(); sysLoop?.pause() }
new IntersectionObserver((es) => {
  es.forEach(e => {
    const half = e.isIntersecting && (e.intersectionRatio > .5 || e.intersectionRect.height > e.rootBounds.height * .5)
    if (half && !sysSeen) { sysSeen = true; sysPlay() }
    /* a filo del bordo conta come uscito, così tornando si rivede */
    if (e.intersectionRatio < .04 && sysSeen) sysReset()
  })
}, { root: fmtSc, threshold: [0, .04, .25, .5, .55, .75, 1] }).observe(sysEl)
$('[data-to-sys]').addEventListener('click', (e) => { e.preventDefault(); fmtSc.scrollTo({ top: sysEl.offsetTop, behavior: reduced ? 'auto' : 'smooth' }) })
sysEmpty()

/* sul desktop i due pannelli dei Formati vanno a pagine: un gesto, un pannello */
const fmtPaged = () => getComputedStyle(fmtSc).scrollSnapType.includes('mandatory') || sysEl.offsetHeight <= fmtSc.clientHeight + 2
let fmtLock = 0
function fmtPage(dir) {
  if (!fmtPaged()) return false
  const top = fmtSc.scrollTop, s = sysEl.offsetTop
  if (dir > 0 && top < s - 4) { fmtSc.scrollTo({ top: s, behavior: reduced ? 'auto' : 'smooth' }); return true }
  if (dir < 0 && top > 4 && top <= s + 4) { fmtSc.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return true }
  return false
}
fmtSc.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 2) return
  const now = performance.now()
  if (now < fmtLock) { e.preventDefault(); e.stopPropagation(); return }
  if (fmtPage(Math.sign(e.deltaY))) { e.preventDefault(); e.stopPropagation(); fmtLock = now + 950 }
}, { passive: false })

/* ---------- schermate ---------- */
const views = $$('[data-v]')
const HASH = ['home', 'lavori', 'formati', 'studio']
const pos = $('[data-pos]')
const hashView = () => HASH.indexOf(location.hash.slice(1).split('/')[0])
/* il caso aperto da link diretto si chiude sui Formati, da dove si apre */
let cur = location.hash === '#isabella' ? 2 : Math.max(0, hashView())
const deepId = location.hash.slice(1).split('/')[1]
const deepCase = location.hash === '#isabella'
function ui(i) {
  document.body.className = document.body.className.replace(/\bat-\d\b/g, '').trim() + ` at-${i}`
  $$('.hd__nav a').forEach(a => a.classList.toggle('is-on', +a.dataset.go === i))
  pos.textContent = String(i + 1).padStart(2, '0')
  if (pl.hidden) history.replaceState(null, '', `#${HASH[i]}`)
}
function onEnter(i) {
  if (i === 0) playReel(); else rv.pause()
  if (i !== 1) showBg(null)
  if (i === 2) prismOn(); else prismOff()
}
const D = reduced ? 0 : .95
function transition(i, dir, from) {
  const a = views[from], b = views[i]
  cur = i
  ui(i)
  if (i !== 2) prismOff()
  return new Promise(res => {
    b.classList.add('is-in')
    const sc = $('.scrl', b); if (sc) sc.scrollTop = 0
    const kids = [...b.querySelectorAll('.idx li, .band, .sys > *, .one > *, .st > *')]
    const tl = gsap.timeline({ onComplete: () => { a.classList.remove('is-on'); b.classList.remove('is-in'); b.classList.add('is-on'); gsap.set([a, b], { clearProps: 'clipPath,transform' }); onEnter(i); res() } })
    tl.fromTo(b, { clipPath: dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: D, ease: 'expo.inOut' })
      .to(a, { yPercent: -12 * dir, duration: D, ease: 'expo.inOut' }, 0)
    if (kids.length) tl.fromTo(kids, { y: 24 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: reduced ? 0 : .7, ease: 'expo.out', stagger: { each: .025, from: dir > 0 ? 'start' : 'end' }, clearProps: 'transform,opacity' }, D * .45)
  })
}

/* le schermate che scorrono dentro (telefono, tablet) cambiano pagina solo dal bordo */
let touchTop = null
addEventListener('touchstart', () => { const sc = $('.v.is-on .scrl'); touchTop = sc ? sc.scrollTop : null }, { passive: true })
function canNav(e) {
  if (!pl.hidden || csOpenNow() || document.querySelector('[data-load]')) return false
  const sc = $('.v.is-on .scrl')
  if (!sc || sc.scrollHeight <= sc.clientHeight + 2) return true
  const atTop = sc.scrollTop <= 1, atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2
  if (e.type === 'wheel') return e.deltaY > 0 ? atEnd : atTop
  if (e.type === 'touchend') return touchTop === sc.scrollTop && (atTop || atEnd)
  if (e.type === 'keydown') {
    if (e.target.closest?.('input,textarea,select') || (e.key === ' ' && e.target.closest?.('button,a'))) return true
    const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0
    if (!dir) return true
    if (sc === fmtSc && fmtPage(dir)) { e.preventDefault(); return false }
    if (dir > 0 ? !atEnd : !atTop) { e.preventDefault(); sc.scrollBy({ top: dir * sc.clientHeight * .8, behavior: reduced ? 'auto' : 'smooth' }); return false }
  }
  return true
}
const nav = viewNav(views.length, transition, { start: cur, canNav })
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault()
  if (a.dataset.ask) { const r = $(`[data-ask-chips] input[value="${a.dataset.ask}"]`); if (r) r.checked = true }
  const go = () => nav.go(+a.dataset.go)
  if (!pl.hidden) { plClose(); setTimeout(() => { if (csOpenNow()) csClose(false, go); else go() }, reduced ? 0 : 750) } else if (csOpenNow()) csClose(false, go); else go()
}))
addEventListener('hashchange', () => {
  if (location.hash === '#isabella') { if (pl.hidden && !csOpenNow()) csOpen(false); return }
  const [h, id] = location.hash.slice(1).split('/')
  const i = HASH.indexOf(h)
  if (id && pl.hidden) { const w = all.find(x => x.id === id); if (w) { if (cur !== 1) nav.go(1); plOpen(w, listFor(), false) } return }
  if (i >= 0 && pl.hidden) nav.go(i)
})

views.forEach((v, k) => v.classList.toggle('is-on', k === cur))
ui(cur)
buildBand(); buildIdx()
document.addEventListener('langchange', () => {
  buildBand(); applyFilter(); paint()
  if (!pl.hidden) { plShow(); $('.pl__back [data-i18n]', pl).textContent = pl.dataset.back || t('pl.back') }
  if (csOpenNow()) edSync()
})
L.apply(L.get())
reveal()
if (cur === 0) playReel()
if (cur === 2) prismOn()
/* link diretto a un lavoro: #lavori/<id> */
{
  const w = deepId && all.find(x => x.id === deepId)
  if (w) setTimeout(() => plOpen(w, all, false), reduced ? 0 : 2300)
  if (deepCase) setTimeout(() => csOpen(true), reduced ? 0 : 2300)
}
if (location.search.includes('debug')) window.__gsap = gsap
