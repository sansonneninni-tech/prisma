import '@fontsource-variable/archivo/wdth.css'
import './b.css'
import { gsap } from 'gsap'
import { LAVORI } from '../data.js'
import { works, CATS, wireContacts, makeLang, wireForm } from '../shared/works.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
/* altezza vera della finestra visibile (le barre del browser sul telefono la cambiano) e posizione della
   zona visibile nel documento: il body si mette lì. Con la tastiera aperta non si tocca nulla. */
const coarse = matchMedia('(pointer: coarse)').matches
function syncVH() {
  const f = document.activeElement
  if (coarse && f && f.matches?.('input, textarea, select')) return
  const vv = window.visualViewport, st = document.documentElement.style
  const h = Math.round(vv ? vv.height * (vv.scale || 1) : innerHeight)
  const top = Math.max(0, Math.round((vv && vv.pageTop) || scrollY || 0))
  if (h > 0) st.setProperty('--app-h', `${h}px`)
  st.setProperty('--app-page-top', `${top}px`)
}
document.documentElement.style.setProperty('--app-slack', coarse ? '240px' : '0px')
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
scrollTo(0, 0); syncVH()
addEventListener('resize', syncVH); addEventListener('orientationchange', () => setTimeout(syncVH, 250))
addEventListener('scroll', syncVH, { passive: true })
visualViewport?.addEventListener('resize', syncVH); visualViewport?.addEventListener('scroll', syncVH)
addEventListener('focusout', () => setTimeout(syncVH, 320))

const EN = {
  'nav.1': 'Work', 'nav.2': 'Formats', 'nav.3': 'Studio',
  'pp.pause': 'Pause', 'pp.play': 'Play', 'cue': 'Scroll to discover',
  'sys.k': 'Recommended', 'sys.h': 'Content system', 'sys.lead': 'One shoot day. Months of content.',
  'pr.1': 'editorial', 'pr.2': 'short', 'pr.3': 'micro', 'pr.src': 'shoot day',
  'st.1': 'shoot day', 'st.2': 'pieces shot, one visual language', 'st.3': 'editorial, short, micro', 'st.4': 'ready to post, in&nbsp;the&nbsp;reserve for 12 months',
  'cal.1': 'ready', 'cal.2': 'in&nbsp;the&nbsp;reserve, 12 months', 'cue.sys': 'Recommended: the content system', 'one.h': 'Three formats',
  'sys.ask': 'Ask for the system', 'sys.case': 'The system at work: Isabella Pistillo',
  'sys.res': 'The reserve opens when you need it: +3&nbsp;short&nbsp;· +3&nbsp;short and&nbsp;5&nbsp;micro&nbsp;· all&nbsp;24.',
  'one.k': 'Formats',
  'f.evento': 'Event reel', 'f.evento.d': 'One vertical reel up to 45″, ready the day after the event.',
  'f.evento.1': 'Filming during the event', 'f.evento.2': 'Edit, colour and music', 'f.evento.3': 'Delivered in 9:16 the next day',
  'f.social': 'Short form', 'f.social.d': 'A series of 7 to 30″ videos with one visual language.',
  'f.social.1': 'Concept and shot plan', 'f.social.2': 'Filming, edit, colour, lettering', 'f.social.3': 'Every video in 9:16, 4:5 and 16:9',
  'f.ed': 'Editorial', 'f.ed.d': 'The brand story, from concept to colour.',
  'f.ed.1': 'One or more shoot days', 'f.ed.2': 'Direction, light and sound on set', 'f.ed.3': 'Edit, colour grading, sound design',
  'f.sys': 'Content system',
  'ask': 'Ask', 'ex': 'Watch an example', 'pv.k': 'Example',
  'f.note': 'Prices on request: the quote follows the brief.',
  's.h': 'Two people,<br />from&nbsp;brief to export.', 's.alt': 'Ninni and Ernesto, PRISMA',
  's.team': 'Studio · Puglia', 's.ninni': 'Direction, edit, colour', 's.ernesto': 'Production and clients', 's.foto': 'Photography · Ninni &amp; Ernesto',
  's.direct': 'Contacts', 's.clients': 'Clients', 's.name': 'Name', 's.fmt': 'What you need', 's.msg': 'The project, in two lines', 's.send': 'Send',
  's.ok': 'Got it. We’ll reply soon.', 's.err': 'Something went wrong. Write us on WhatsApp.',
  'all': 'All', 'w.one': 'work', 'w.many': 'works', 'pl.back': 'All work', 'pl.close': 'Close', 'pl.dl': 'Download original', 'pl.case': 'Open the case', 'drive': 'Watch on Drive',
  'cs.back': 'Back', 'cs.k': 'Case study · Artist', 'cs.play': 'Watch the editorial with sound', 'cs.pause': 'Pause', 'cs.resume': 'Play', 'cs.audio': 'Sound', 'cs.full': 'Full screen', 'cs.dl': 'Download original',
  'cs.lead': 'An artist needed a steady presence, not a video. We shot one day.', 'cs.k1': 'shoot day', 'cs.k2': 'pieces delivered', 'cs.k3': 'in&nbsp;the&nbsp;reserve', 'cs.k4': 'weeks of&nbsp;posts',
  'cs.sh': 'short', 'cs.sh.d': 'with sound, they open', 'cs.mi': 'micro', 'cs.mi.d': 'write on them and download the video', 'cs.res': 'Reserve: 24 pieces already shot, activated when needed.', 'cs.cta': 'The same system, for you', 'cs.cta.b': 'The content system',
  'fa.client': 'Client', 'fa.fmt': 'Format', 'fa.ratio': 'Ratio', 'fa.len': 'Length', 'fa.where': 'Where',
}
const L = makeLang(EN)
const IT_X = {
  'pp.play': 'Play', 's.ok': 'Ricevuto. Ti rispondiamo a breve.', 's.alt': 'Ninni ed Ernesto, PRISMA', 's.clients': 'Clienti', 's.err': 'Qualcosa non va. Scrivici su WhatsApp.', all: 'Tutti', 'w.one': 'lavoro', 'w.many': 'lavori',
  'pv.k': 'Esempio', 'cs.resume': 'Riprendi', 'fa.client': 'Cliente', 'fa.fmt': 'Formato', 'fa.ratio': 'Proporzioni', 'fa.len': 'Durata', 'fa.where': 'Dove',
}
const t = (k) => (L.get() === 'en' ? EN[k] : (IT_X[k] ?? L.t(k)))
const tx = (o) => o[L.get()] ?? o.it

wireContacts()
wireForm($('[data-form]'), { ok: () => { $('[data-form-out]').dataset.k = 's.ok'; return t('s.ok') }, err: () => { $('[data-form-out]').dataset.k = 's.err'; return t('s.err') } })

/* ---------- testi tradotti, clienti ---------- */
function paint() {
  const l = L.get()
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

/* il bordo che entra porta il filo caldo del segno PRISMA (1 = arriva dal basso, -1 = dall'alto, 0 = via) */
function edge(el, dir) {
  el.classList.toggle('edge-t', dir > 0); el.classList.toggle('edge-b', dir < 0)
}
/* Movimento sul compositore (Web Animations): i pannelli scorrono anche se il codice è occupato.
   Due curve per tutto il sito: EIO per i cambi di pagina, EOUT per i contenuti che arrivano. */
const EIO = 'cubic-bezier(.87, 0, .13, 1)', EOUT = 'cubic-bezier(.16, 1, .3, 1)'
const ms = (sec) => (reduced ? 0 : sec * 1000)
function slide(el, from, to, dur, easing = EIO) {
  const a = el.animate([{ transform: `translate3d(0, ${from}%, 0)` }, { transform: `translate3d(0, ${to}%, 0)` }], { duration: ms(dur), easing, fill: 'both' })
  return a.finished.catch(() => {}).then(() => a)
}
/* i contenuti salgono di poco e compaiono, uno dopo l'altro; si somma ai transform che hanno già */
function rise(kids, { y = 24, at = .38, each = .04, dur = .7, fade = true } = {}) {
  if (reduced) return
  kids.forEach((k, i) => {
    const o = { duration: ms(dur), delay: ms(at + i * each), easing: EOUT, fill: 'backwards' }
    /* translate (non transform): si somma da solo ai transform esistenti e resta sul compositore */
    k.animate([{ translate: `0 ${y}px` }, { translate: '0 0' }], o)
    if (fade) k.animate([{ opacity: 0 }, {}], o)
  })
}
/* finestre a tutto schermo: entrano dal basso ed escono verso il basso */
function sheetIn(el, kids) {
  edge(el, 1)
  rise(kids, { y: 30 })
  return slide(el, 100, 0, .85).then(a => { edge(el, 0); a.cancel() })
}
function sheetOut(el, done) {
  edge(el, 1)
  return slide(el, 0, 100, .7).then(a => { edge(el, 0); done(); a.cancel() })
}

/* ---------- apertura: il prisma rifrange la luce, poi il video ---------- */
const load = $('[data-load]')
/* i raggi corrono in CSS dal primo fotogramma; qui si decide solo quando il velo sale */
function reveal() {
  if (reduced || !load) { load?.remove(); return }
  const dl = Math.max(0, 2350 - performance.now())
  load.style.setProperty('--dl', `${dl}ms`)
  load.classList.add('is-go')
  load.addEventListener('animationend', (e) => { if (e.animationName === 'loadOut') load.remove() })
  gsap.from('.lg svg', { yPercent: 30, opacity: 0, duration: .9, ease: 'expo.out', delay: dl / 1000 + .5, clearProps: 'transform,opacity' })
}
/* il logo cambia misura solo con transform: qui si calcola il rapporto tra piccolo e grande */
function logoK() {
  const m = (v) => { const i = document.createElement('i'); i.style.cssText = `position:absolute;visibility:hidden;width:var(${v})`; document.body.append(i); const w = i.offsetWidth; i.remove(); return w }
  const big = m('--lgw'), small = m('--lgw-s')
  if (big) document.documentElement.style.setProperty('--lgk', (small / big).toFixed(4))
}
logoK(); addEventListener('resize', logoK)

/* ---------- home: video a tutto schermo ---------- */
const all = works().map(w => ({ ...w, hover: w.preview ? w.preview.replace('preview.mp4', 'hover.mp4') : null }))
const REEL = {
  /* il film della home: versione orizzontale sul computer, versione verticale sul telefono */
  h: { src: '/media/_reel/film-h.mp4', poster: '/media/_reel/film-h.jpg', seg: 22, names: ['Showreel'] },
  v: { src: '/media/_reel/film-v.mp4', poster: '/media/_reel/film-v.jpg', seg: 22, names: ['Showreel'] },
}
const rv = $('[data-reel] video')
const now = $('[data-reel-now]')
let paused = false, reelKind = ''
function setReel() {
  const k = innerWidth / innerHeight > 1 ? 'h' : 'v'
  if (k === reelKind) return
  reelKind = k
  rv.src = REEL[k].src; rv.poster = REEL[k].poster; rv.loop = true
  /* la copertina sotto il video: mentre il reel si carica si vede già l'immagine */
  rv.parentElement.style.background = `#111 url(${REEL[k].poster}) center / cover no-repeat`
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
/* telefoni in risparmio energetico bloccano l'avvio automatico: al primo tocco il film parte */
const kick = () => { if (cur === 0 && !paused && pl.hidden && rv.paused) rv.play().catch(() => {}) }
addEventListener('touchend', kick, { passive: true }); addEventListener('click', kick)
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
  band.innerHTML = `<div class="band__t">${one}</div>`
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
  meta.textContent = `${n} ${t(n === 1 ? 'w.one' : 'w.many')} — ${filter === 'all' ? t('all') : tx(CATS[filter])}`
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
  let hovT = 0
  idx.addEventListener('pointerover', (e) => { const a = e.target.closest('a[data-i]'); if (!a || a === hot) return; clearTimeout(hovT); hovT = setTimeout(() => showBg(all[a.dataset.i], a), hot ? 40 : 0) })
  idx.addEventListener('pointerleave', () => clearTimeout(hovT))
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
  const duo = !matchMedia('(max-width: 1024px) and (orientation: portrait)').matches
  const iw = Math.min(340, Math.max(250, innerWidth * .24)), gap = Math.min(48, Math.max(20, innerWidth * .03))
  const cw = pl.clientWidth - parseFloat(getComputedStyle(pl).paddingLeft) - parseFloat(getComputedStyle(pl).paddingRight)
  const W = duo ? cw - iw - gap : plStage.clientWidth, H = plStage.clientHeight
  const width = Math.min(W, H * r), height = width / r
  pl.classList.toggle('is-duo', duo)
  pl.style.gridTemplateColumns = duo ? `${Math.floor(width)}px ${iw}px` : ''
  ;[plV, plImg, plCtl].forEach(el => { el.style.width = `${Math.floor(width)}px`; el.style.height = `${Math.floor(height)}px` })
}
new ResizeObserver(() => fitStage()).observe(plStage)
function facts(w, len) {
  const rows = [[t('fa.client'), w.client || w.title], [t('fa.fmt'), tx(CATS[w.cat])], [t('fa.ratio'), (w.ratio || '').replace('/', ':')]]
  if (len) rows.push([t('fa.len'), len])
  if (w.drive) rows.push([t('fa.where'), 'Google Drive'])
  $('[data-pl-facts]').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
}
/* comandi del lettore */
const plCtl = $('[data-pl-ctl]'), plBar = $('[data-pl-bar]'), plProg = $('[data-pl-prog]')
let plIdleT = 0
function plWake() {
  plCtl.classList.remove('is-idle'); clearTimeout(plIdleT)
  if (!plV.paused) plIdleT = setTimeout(() => plCtl.classList.add('is-idle'), 2200)
}
function plSync() {
  $('[data-pl-tl]').textContent = t(plV.paused ? 'cs.resume' : 'cs.pause')
  $('[data-pl-audio]').setAttribute('aria-pressed', String(!plV.muted)); $('[data-pl-snd]').textContent = plV.muted ? 'off' : 'on'
}
const plTick = () => {
  if (!plV.duration) return
  const k = plV.currentTime / plV.duration
  plBar.style.transform = `scaleX(${k})`; plProg.setAttribute('aria-valuenow', String(Math.round(k * 100)))
  $('[data-pl-time]').textContent = `${fmtTime(plV.currentTime)} / ${fmtTime(plV.duration)}`
}
plV.addEventListener('timeupdate', plTick)
;['play', 'pause', 'volumechange'].forEach(ev => plV.addEventListener(ev, () => { plSync(); plWake() }))
plV.addEventListener('click', () => { plV.paused ? plV.play() : plV.pause() })
$('[data-pl-toggle]').addEventListener('click', () => { plV.paused ? plV.play() : plV.pause() })
$('[data-pl-audio]').addEventListener('click', () => { plV.muted = !plV.muted })
$('[data-pl-full]').addEventListener('click', () => { if (plV.requestFullscreen) plV.requestFullscreen().catch(() => {}); else plV.webkitEnterFullscreen?.() })
const plSeek = (x) => { const r = plProg.getBoundingClientRect(); if (plV.duration) plV.currentTime = Math.max(0, Math.min(1, (x - r.left) / r.width)) * plV.duration }
plProg.addEventListener('pointerdown', (e) => { plSeek(e.clientX); plProg.setPointerCapture(e.pointerId) })
plProg.addEventListener('pointermove', (e) => { if (plProg.hasPointerCapture(e.pointerId)) plSeek(e.clientX) })
plProg.addEventListener('keydown', (e) => { if (!plV.duration) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); plV.currentTime += e.key === 'ArrowRight' ? 5 : -5 } })
$('[data-pl-stage]').addEventListener('pointermove', plWake)
plCtl.addEventListener('focusin', plWake)
function plPlay() {
  const w = plList[plIdx]
  if (pl.hidden || !w?.src) return
  if (plV.dataset.src !== w.src) { plV.dataset.src = w.src; plV.src = w.src }
  plV.muted = false
  plV.play().catch(() => { plV.muted = true; plV.play().catch(() => {}) })
}
function plStop() { plV.pause(); plV.removeAttribute('src'); delete plV.dataset.src; plV.load() }
function plShow(play = true) {
  const w = plList[plIdx]
  $('[data-pl-cat]').textContent = tx(CATS[w.cat])
  $('[data-pl-title]').textContent = w.title
  $('[data-pl-sub]').textContent = tx(w.sub)
  $('[data-pl-count]').textContent = `${String(plIdx + 1).padStart(2, '0')} / ${String(plList.length).padStart(2, '0')}`
  const dl = $('[data-pl-dl]'), cs = $('[data-pl-case]')
  facts(w)
  if (w.src) {
    plImg.hidden = true; plDrive.hidden = true; plV.hidden = false; plCtl.hidden = false
    plBar.style.transform = 'scaleX(0)'; $('[data-pl-time]').textContent = ''
    plV.poster = w.poster
    if (play) plPlay(); else if (plV.dataset.src !== w.src) plStop()
    dl.hidden = false; dl.href = w.dl; dl.setAttribute('download', w.dl.split('/').pop())
  } else {
    plStop(); plV.hidden = true; plCtl.hidden = true
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
  prismOff()
  plShow(false)
  const d = reduced ? 0 : 1
  /* il video parte quando la finestra è ferma: niente decodifica durante il movimento */
  sheetIn(pl, [plStage, ...$$('.pl__info > *', pl)]).then(() => plPlay())
  pl.focus({ preventScroll: true })
}
function plClose(fromPop = false) {
  if (pl.hidden || pl.dataset.closing) return
  if (!fromPop && plPushed) { plPushed = false; history.back(); return }
  plPushed = false
  pl.dataset.closing = '1'
  plV.pause()
  sheetOut(pl, () => {
      pl.hidden = true; delete pl.dataset.closing
      plStop()
      document.body.classList.remove('is-pl')
      history.replaceState(null, '', csOpenNow() ? '#isabella' : `#${HASH[cur]}`)
      pl.dataset.back = ''; $('.pl__back [data-i18n]', pl).textContent = t('pl.back')
      if (cur === 0 && !csOpenNow()) playReel()
      if (cur === 2 && !csOpenNow()) prismOn()
      plFocus?.focus?.({ preventScroll: true })
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
  id: `isabella-short-${n}`, short: true, client: 'Isabella Pistillo', title: `Short ${String(n).padStart(2, '0')}`, cat: 'social', ratio: '4/5',
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
  b.innerHTML = `<img src="${it.poster}" alt="" decoding="async" />${kind === 'mi' ? '<canvas></canvas>' : ''}<span>${String(kind === 'sh' ? k + 1 : it.n).padStart(2, '0')}</span>`
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
  prismOff()
  ed.dataset.state = 'idle'; edSync()
  const d = reduced ? 0 : 1
  /* il video di anteprima parte a finestra ferma; prima si vede la copertina */
  sheetIn(cs, [ed, ...$$('.cs__info > *', cs)]).then(() => { if (csOpenNow()) { edIdle(); edSync(); paintMicros() } })
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
  sheetOut(cs, () => {
      cs.hidden = true; delete cs.dataset.closing
      edV.removeAttribute('src'); delete edV.dataset.src; edV.load()
      document.body.classList.remove('is-cs')
      history.replaceState(null, '', `#${HASH[cur]}`)
      if (cur === 0) playReel()
      if (cur === 2) prismOn()
      const f = after || csAfter; csAfter = null
      if (f) f(); else csFocus?.focus?.({ preventScroll: true })
  })
}
let csAfter = null
$$('[data-cs-close]', cs).forEach(b => b.addEventListener('click', () => csClose()))
$('[data-cs-sys]', cs).addEventListener('click', (e) => {
  e.preventDefault()
  csClose(false, () => {
    nav.go(2, 1)
    setTimeout(() => { const h = $('#t-sys'); h.tabIndex = -1; h.focus({ preventScroll: true }) }, reduced ? 0 : 1000)
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
    /* apertura e chiusura con la stessa curva e la stessa durata: l'altezza totale resta ferma.
       Il blocco si apre, i suoi contenuti salgono di poco uno dopo l'altro */
    gsap.fromTo(b, { height: 0 }, { height: 'auto', duration: reduced ? 0 : .5, ease: 'power3.inOut', clearProps: 'height' })
    rise([...b.children], { y: 10, at: .12, each: .05, dur: .55 })
    /* il video cambia a riga ferma: le due animazioni non si sovrappongono */
    setTimeout(() => { if (li.classList.contains('is-open')) pvShow(li.dataset.fmt) }, ms(.5))
  } else {
    gsap.to(b, { height: 0, opacity: 0, duration: reduced ? 0 : .5, ease: 'power3.inOut', onComplete: () => { b.hidden = true; gsap.set(b, { clearProps: 'height,opacity' }) } })
  }
}
/* ---------- formati, schermi larghi: a destra gira l'esempio del formato aperto ----------
   Un video per formato, creato solo quando serve; si alternano in dissolvenza (sul compositore)
   e gira solo quello visibile, solo con la pagina Formati davanti. */
const pv = $('[data-pv]'), pvSt = $('[data-pv-st]', pv), pvCap = $('[data-pv-cap]', pv)
const pvWide = matchMedia('(min-width: 1101px) and (min-height: 600px)')
const pvV = {}
let pvCur = null
const pgAt = { 2: 0, 3: 0 }
const pvWork = (fmt) => { const li = $(`.ac__i[data-fmt="${fmt}"]`, ac); return { li, w: all.find(x => x.id === $('[data-ex]', li).dataset.ex) } }
function pvFit() {
  const W = pvSt.clientWidth, H = pvSt.clientHeight
  Object.values(pvV).forEach(v => { const [a, b] = v.dataset.r.split('/').map(Number), r = a / b, w = Math.min(W, H * r); v.style.width = `${Math.round(w)}px`; v.style.height = `${Math.round(w / r)}px` })
  if (pvCur && pvV[pvCur]) pvSt.style.setProperty('--pvh', pvV[pvCur].style.height)
}
new ResizeObserver(pvFit).observe(pvSt)
function pvCapPaint() {
  if (!pvCur) return
  const { li, w } = pvWork(pvCur)
  pvCap.innerHTML = `<b>${t('pv.k')}</b> ${w.title} · ${$('.ac__t', li).textContent} · ${w.ratio.replace('/', ':')}`
}
function pvShow(fmt) {
  if (!pvWide.matches || !fmt || fmt === pvCur) return
  const { w } = pvWork(fmt)
  if (!w) return
  if (!pvV[fmt]) {
    const v = document.createElement('video')
    v.className = 'fp__v'; v.setAttribute('aria-hidden', 'true'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'
    v.poster = w.poster; v.dataset.r = w.ratio || '9/16'; v.src = w.hover || w.preview || w.src
    pvSt.append(v); pvV[fmt] = v; pvFit()
  }
  pvCur = fmt
  Object.entries(pvV).forEach(([k, v]) => v.classList.toggle('is-on', k === fmt))
  pvSt.style.setProperty('--pvh', pvV[fmt].style.height)
  pv.dataset.ex = w.id
  pvCapPaint(); pvSync()
}
function pvSync() {
  const live = cur === 2 && pgAt[2] === 0 && !document.body.classList.contains('is-pl') && !document.body.classList.contains('is-cs') && !reduced
  Object.entries(pvV).forEach(([k, v]) => { if (live && k === pvCur) v.play().catch(() => {}); else if (!v.paused) setTimeout(() => { if (k !== pvCur || !live) v.pause() }, k === pvCur ? 0 : 650) })
}
new MutationObserver(pvSync).observe(document.body, { attributes: true, attributeFilter: ['class'] })
pvSt.addEventListener('click', () => { const b = $(`[data-ex="${pv.dataset.ex}"]`, ac); if (b) b.click() })
pvWide.addEventListener('change', () => { if (cur === 2) pvShow(($('.ac__i.is-open', ac) || $('.ac__i', ac)).dataset.fmt) })

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
/* i raggi finiscono prima della loro etichetta, a qualsiasi larghezza; l'etichetta sta al centro del suo fascio */
rays.forEach(l => { l.dataset.ox = l.dataset.x; l.dataset.oy = l.dataset.y })
const prSvg = $('.pr__svg', prism)
let raysOpen = true, prPx = 1
function fitRays() {
  const w = prSvg.clientWidth, h = prSvg.clientHeight
  if (!w) return
  const k = 700 / w
  const G = ['1', '2', '3'].map(g => { const lb = $(`.pr__l--${g}`, prism); return { g, lb, left: lb.offsetLeft, hh: lb.offsetHeight } })
  G.forEach(o => {
    const end = Math.min(700, (o.left - 16) * k)
    let sy = 0
    const group = rays.filter(l => l.dataset.g === o.g)
    group.forEach(l => {
      const t = (end - 375) / (700 - 375)
      l.dataset.x = end; l.dataset.y = 126 + (+l.dataset.oy - 126) * t; sy += +l.dataset.y
      if (raysOpen) { l.setAttribute('x2', l.dataset.x); l.setAttribute('y2', l.dataset.y) }
    })
    o.top = (sy / group.length) / 300 * h - o.hh / 2
  })
  /* su schermi stretti le etichette non si sovrappongono: la prima sale se serve */
  const over = G[0].top + G[0].hh + 4 - G[1].top
  if (over > 0) G[0].top -= over
  G.forEach(o => { o.lb.style.top = `${o.top}px` })
  prPx = w / 700
}
new ResizeObserver(fitRays).observe(prSvg)
const SVGNS = 'http://www.w3.org/2000/svg'
const IN = [[0, 152], [285, 126], [375, 126]]
let sysTl = null, sysLoop = null, sysSeen = false
const stepOn = (n) => () => { steps.forEach((li, k) => li.classList.toggle('is-on', k === n)); stpList.classList.remove('is-done') }
function countUp(el, to, d = .9) { const o = { v: 0 }; let last = -1; return gsap.to(o, { v: to, duration: d, ease: 'power2.out', onUpdate: () => { const n = Math.round(o.v); if (n !== last) { last = n; el.textContent = n } } }) }
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
/* la luce che continua a scorrere: un impulso entra nel prisma e si divide nei raggi.
   Sempre gli stessi punti, mossi solo con transform sopra il disegno (niente SVG ridisegnato). */
const pulseEl = document.createElement('div'); pulseEl.className = 'pr__pulse'; pulseEl.setAttribute('aria-hidden', 'true')
prism.append(pulseEl)
const pIn = document.createElement('i'); pIn.className = 'is-in'; pulseEl.append(pIn)
const pOut = rays.map(l => { const d = document.createElement('i'); d.style.background = l.getAttribute('stroke'); pulseEl.append(d); return d })
const P = (x, y) => ({ x: x * prPx, y: y * prPx })
function pulse() {
  const tl = gsap.timeline()
  tl.fromTo(pIn, { ...P(IN[0][0], IN[0][1]), opacity: 0, backgroundColor: '#0B0A0A' }, { ...P(IN[1][0], IN[1][1]), opacity: 1, duration: 1.1, ease: 'power1.in' })
    .to(pIn, { ...P(IN[2][0], IN[2][1]), backgroundColor: '#E8722A', duration: .35, ease: 'none' })
    .set(pIn, { opacity: 0 })
  rays.forEach((l, k) => {
    tl.fromTo(pOut[k], { ...P(375, 126), opacity: 1 }, { ...P(+l.dataset.x, +l.dataset.y), opacity: 0, duration: 1.5, ease: 'power1.out' }, 1.45)
  })
  return tl
}
/* stato di partenza: niente è visibile prima del suo passaggio */
function sysEmpty() {
  sysTl?.kill(); sysLoop?.kill(); gsap.set([pIn, ...pOut], { opacity: 0 })
  if (reduced) { sysFinal(); return }
  steps.forEach(li => li.classList.remove('is-on')); stpList.classList.remove('is-done')
  ticks.forEach(t => { t.className = '' })
  raysOpen = false
  rays.forEach(l => { l.setAttribute('x2', 375); l.setAttribute('y2', 126) })
  /* misura le etichette con i numeri veri, poi le azzera: niente scatto alla fine */
  $$('.pr__l b', prism).forEach(b => { b.textContent = b.dataset.n })
  fitRays()
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
sysEmpty()

const views = $$('[data-v]')
const HASH = ['home', 'lavori', 'formati', 'studio']
const pos = $('[data-pos]')
const hashView = () => HASH.indexOf(location.hash.slice(1).split('/')[0])
/* il caso aperto da link diretto si chiude sui Formati, da dove si apre */
let cur = location.hash === '#isabella' ? 2 : Math.max(0, hashView())
const deepId = location.hash.slice(1).split('/')[1]
const deepCase = location.hash === '#isabella'
let uiT = 0
function ui(i, later = 0) {
  /* il colore della testata cambia quando la nuova pagina passa davvero sotto la testata */
  const at = () => { document.body.className = document.body.className.replace(/\bat-\d\b/g, '').trim() + ` at-${i}` }
  clearTimeout(uiT)
  if (later) uiT = setTimeout(() => { if (cur === i) at() }, later); else at()
  $$('.hd__nav a').forEach(a => a.classList.toggle('is-on', +a.dataset.go === i))
  pos.textContent = String(i + 1).padStart(2, '0')
  if (pl.hidden) history.replaceState(null, '', `#${HASH[i]}`)
}
function onEnter(i) {
  if (i === 0) playReel(); else rv.pause()
  if (i !== 1) showBg(null)
  if (i === 2) prismOn(); else prismOff()
  if (i === 2) pvShow(($('.ac__i.is-open', ac) || $('.ac__i', ac)).dataset.fmt)
  pvSync()
}
/* ---------- pagine: un gesto (rotella, dito, tasto) = una pagina ----------
   Tra un capitolo e l'altro passa il lampo caldo; dentro una sezione (Formati, Studio sul telefono)
   la pagina scorre via pulita, senza lampo. Tutto sul compositore. */
const flash = $('.flash')
const stMQ = matchMedia('(max-width: 1024px) and (orientation: portrait), (orientation: landscape) and (max-height: 520px)')
const PG = {
  2: { box: fmtSc, el: [$('.fp--one', fmtSc), sysEl], on: () => true },
  3: { box: $('.st', views[3]), el: [$('.st__about', views[3]), $('.st__ct', views[3])], on: () => stMQ.matches },
}
const split = (i) => !!PG[i] && PG[i].on()
const pgN = (i) => (split(i) ? PG[i].el.length : 1)
const pgEl = (i = cur) => (split(i) ? PG[i].el[pgAt[i]] : null)
function pgLayout() {
  Object.entries(PG).forEach(([i, p]) => {
    const on = p.on()
    if (!on) pgAt[i] = 0
    p.box.classList.toggle('is-split', on)
    p.el.forEach((e, k) => { e.classList.toggle('pg', on); e.classList.toggle('is-cur', on && k === pgAt[i]); e.classList.remove('is-mv') })
  })
}
pgLayout()
stMQ.addEventListener('change', () => { if (!busy) pgLayout() })
/* la parte che scorre davvero, se il contenuto non sta in una schermata (schermi molto bassi, una riga aperta) */
function scroller(i = cur) {
  const e = pgEl(i) || $('.scrl', views[i])
  return e && e.scrollHeight > e.clientHeight + 2 ? e : null
}
const atEdge = (sc, dir) => (dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 1)
const KIDS = '.band, .one > *, .fp__pv, .sys__txt > *, .pr, .st__img, .st__txt > *, .st__ct > *'
const kidsOf = (r) => [...r.querySelectorAll(KIDS)].filter(e => e.getClientRects().length)
/* il sistema racconta i passaggi quando la sua pagina è davanti; uscendo si azzera, così tornando si rivede */
let sysT = 0
function pgEnter(i) {
  clearTimeout(sysT)
  if (i === 2 && pgAt[2] === 1) { if (!sysSeen) { sysSeen = true; sysT = setTimeout(() => { if (cur === 2 && pgAt[2] === 1) sysPlay() }, ms(.22)) } }
  /* l'azzeramento misura il prisma: si fa a pagina ferma, quando il browser è libero */
  else if (sysSeen) { sysSeen = false; sysT = setTimeout(() => { if (!(cur === 2 && pgAt[2] === 1)) sysEmpty() }, 160) }
  pvSync()
}
let busy = false, lockUntil = 0, queued = 0, runAt = 0
/* un gesto nuovo che arriva mentre la pagina sta ancora arrivando non va perso: parte appena finisce */
async function run(f) {
  busy = true; runAt = performance.now()
  try { await f() } finally {
    busy = false; lockUntil = performance.now() + 60
    flushSoon()
  }
}
/* dentro la sezione: le due pagine scorrono insieme, come un foglio solo */
async function stepTo(i, k, dir) {
  const p = PG[i], a = p.el[pgAt[i]], b = p.el[k]
  pgAt[i] = k
  b.scrollTop = dir > 0 ? 0 : b.scrollHeight
  if (document.activeElement && a.contains(document.activeElement)) document.activeElement.blur()
  b.classList.add('is-mv')
  /* il racconto del sistema si ferma mentre la pagina scorre via (niente lavoro sotto l'animazione) */
  if (i === 2 && k === 0) { sysTl?.pause(); sysLoop?.pause() }
  if (reduced) { a.classList.remove('is-cur'); b.classList.add('is-cur'); b.classList.remove('is-mv'); pgEnter(i); return }
  a.classList.add('is-mv')
  rise(kidsOf(b), { y: 26 * dir, at: .32, each: .03, dur: .75 })
  const out = slide(a, 0, -100 * dir, .9), inn = slide(b, 100 * dir, 0, .9)
  const [oa, ia] = await Promise.all([out, inn])
  a.classList.remove('is-cur', 'is-mv'); b.classList.add('is-cur'); b.classList.remove('is-mv')
  oa.cancel(); ia.cancel()
  pgEnter(i)
}
/* tra i capitoli: la tenda calda sale e copre (0,3 s), sotto cambia la pagina, poi si ritira verso l'alto.
   La tenda è ancorata in basso: scaleY + translateY fanno anche la ritirata dall'alto, tutto in un'animazione sola */
const FL_IN = 300, FL_HOLD = 20, FL_OUT = 420, FL = FL_IN + FL_HOLD + FL_OUT
const P2 = 'cubic-bezier(.45, 0, .55, 1)', P3 = 'cubic-bezier(.215, .61, .355, 1)'
function chapter(i, dir, k) {
  const from = cur, a = views[from], b = views[i]
  cur = i
  if (PG[i] && split(i)) { pgAt[i] = k; PG[i].el.forEach((e, n) => e.classList.toggle('is-cur', n === k)) }
  if (reduced) ui(i)
  if (i !== 2) prismOff()
  if (from === 2) { sysTl?.pause(); sysLoop?.pause() }
  if (document.activeElement && a.contains(document.activeElement)) document.activeElement.blur()
  const sc = pgEl(i) || $('.scrl', b); if (sc) sc.scrollTop = dir > 0 ? 0 : sc.scrollHeight
  const done = () => {
    a.classList.remove('is-on'); b.classList.remove('is-in'); b.classList.add('is-on')
    /* il lavoro della pagina nuova parte al fotogramma dopo, non nello stesso della fine animazione */
    requestAnimationFrame(() => requestAnimationFrame(() => { if (cur === i) { onEnter(i); pgEnter(i) } }))
  }
  if (reduced) { done(); return Promise.resolve() }
  b.classList.add('is-in')
  const o1 = FL_IN / FL, o2 = (FL_IN + FL_HOLD) / FL
  const f = flash.animate(dir > 0 ? [
    { transform: 'translateY(0%) scaleY(0)', easing: P2 }, { offset: o1, transform: 'translateY(0%) scaleY(1)' },
    { offset: o2, transform: 'translateY(0%) scaleY(1)', easing: P2 }, { transform: 'translateY(-100%) scaleY(0)' },
  ] : [
    { transform: 'translateY(-100%) scaleY(0)', easing: P2 }, { offset: o1, transform: 'translateY(0%) scaleY(1)' },
    { offset: o2, transform: 'translateY(0%) scaleY(1)', easing: P2 }, { transform: 'translateY(0%) scaleY(0)' },
  ], { duration: FL })
  /* la testata cambia colore quando la tenda copre davvero (tempo dell'animazione, non un timer) */
  flash.animate([{ opacity: 1 }, { opacity: 1 }], { duration: FL_IN }).finished.then(() => { if (cur === i) ui(i) }).catch(() => {})
  /* sotto la tenda: la vecchia sparisce e la nuova c'è, nello stesso istante, senza aspettare il codice */
  const ao = a.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FL_IN, easing: 'step-end', fill: 'forwards' })
  const bo = b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FL_IN, easing: 'step-end' })
  const bm = b.animate([{ transform: `translate3d(0, ${3 * dir}%, 0)` }, { transform: 'none' }], { duration: 580, delay: FL_IN, easing: P3, fill: 'backwards' })
  const at = FL_IN / 1000 + .02
  const ix = $('.idx', b)
  rise(dir > 0 ? kidsOf(b.querySelector('.pg.is-cur') || b) : kidsOf(b.querySelector('.pg.is-cur') || b).reverse(), { y: 22 * dir, at, each: .025, dur: .75 })
  if (ix) {
    const li = $$('li', ix)
    rise(dir > 0 ? li : li.reverse(), { y: 22 * dir, at, each: .022, fade: false, dur: .75 })
    if (!reduced) ix.animate([{ opacity: 0 }, {}], { duration: ms(.6), delay: ms(at), easing: EOUT, fill: 'backwards' })
  }
  return Promise.all([f, bm].map(x => x.finished.catch(() => {}))).then(() => { done(); ao.cancel(); bo.cancel(); bm.cancel(); f.cancel() })
}
const DBG = location.search.includes('debug')
let qT = 0
function flushSoon() {
  clearTimeout(qT)
  if (!queued) return
  qT = setTimeout(() => { if (busy) return; if (performance.now() < lockUntil) { flushSoon(); return } const d = queued; queued = 0; page(d, 'queue') }, Math.max(0, lockUntil - performance.now()) + 10)
}
function page(dir, src = '') {
  if (DBG) (window.__pg ||= []).push([Math.round(performance.now()), dir, busy, Math.round(performance.now() - runAt), cur, src])
  /* in coda solo verso la fine del passaggio: all'inizio è ancora lo stesso gesto */
  if (busy || performance.now() < lockUntil) { if (free() && performance.now() - runAt > 250) { queued = dir; if (!busy) flushSoon() } return false }
  const k = split(cur) ? pgAt[cur] : 0
  if (k + dir >= 0 && k + dir < pgN(cur)) { run(() => stepTo(cur, k + dir, dir)); return true }
  const i = cur + dir
  if (i < 0 || i >= views.length) return false
  run(() => chapter(i, dir, dir > 0 ? 0 : pgN(i) - 1))
  return true
}
function goTo(i, k = 0) {
  if (busy) return
  i = Math.max(0, Math.min(views.length - 1, i)); k = Math.min(k, pgN(i) - 1)
  if (i === cur) { if (split(i) && k !== pgAt[i]) run(() => stepTo(i, k, k > pgAt[i] ? 1 : -1)); return }
  run(() => chapter(i, i > cur ? 1 : -1, k))
}
const nav = { go: goTo, get cur() { return cur } }
const free = () => pl.hidden && !csOpenNow() && !document.querySelector('[data-load]')

/* rotella e trackpad: l'inerzia non conta come gesto nuovo; se il gesto ha fatto scorrere un contenuto lungo, non cambia pagina */
/* Un gesto = una pagina. L'inerzia del trackpad (numeri che calano piano) appartiene al gesto che l'ha
   lanciata; un colpo nuovo si riconosce anche dentro la coda d'inerzia, perché i numeri risalgono di scatto. */
let wAcc = 0, wLast = 0, wMag = 0, wDir = 0, wSpent = false, wPeak = 0, wDecay = false, wFloor = Infinity
function wheelFresh(mag, d) {
  const now = performance.now(), gap = now - wLast
  let fresh = gap > 170
  if (!fresh && wSpent && wDir && d !== wDir && mag >= Math.max(8, wMag * 1.25)) fresh = true
  if (!fresh && wSpent && d === wDir && wDecay && mag >= 8 && mag > wMag * 1.5 && mag >= wFloor * 2.4) fresh = true
  wLast = now
  if (fresh) { wSpent = false; wAcc = 0; wPeak = 0; wDecay = false; wFloor = Infinity }
  if (wSpent) {
    wPeak = Math.max(wPeak, mag)
    if (mag < wPeak * .5) wDecay = true
    if (wDecay) wFloor = Math.min(wFloor, mag)
  }
  wMag = mag; wDir = d
  return fresh
}
function wheelSpend(mag) { wSpent = true; wPeak = mag; wDecay = false; wFloor = Infinity }
addEventListener('wheel', (e) => {
  if (!free() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  const dy = e.deltaY * (e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? innerHeight : 1)
  if (Math.abs(dy) < 1) return
  const mag = Math.abs(dy), d = Math.sign(dy)
  wheelFresh(mag, d)
  const sc = scroller()
  if (sc && !atEdge(sc, d)) {
    /* la rotella sopra la testata muove comunque il contenuto */
    if (!sc.contains(e.target)) { e.preventDefault(); sc.scrollBy({ top: dy }) }
    wheelSpend(mag); return
  }
  e.preventDefault()
  if (wSpent) return
  wAcc += dy
  if (Math.abs(wAcc) > 24) { wheelSpend(mag); page(Math.sign(wAcc), 'wheel'); wAcc = 0 }
}, { passive: false })

/* dito: la pagina non scorre mai da sola; il gesto verticale cambia pagina appena supera la soglia.
   Solo un contenuto più lungo della schermata scorre col dito, e cambia pagina dal suo bordo. */
let tch = null
addEventListener('touchstart', (e) => {
  tch = null
  /* con la tastiera aperta il dito fa quello che fa sempre; sopra un campo chiuso il gesto cambia pagina come altrove */
  if (e.touches.length !== 1 || !free() || document.activeElement?.matches?.('input, textarea, select')) return
  const t = e.touches[0], sc = scroller()
  tch = { x: t.clientX, y: t.clientY, t: performance.now(), sc: sc && sc.contains(e.target) ? sc : null, top: sc ? sc.scrollTop : 0, axis: '', done: false }
}, { passive: true })
const TH = () => Math.max(42, innerHeight * .06)
addEventListener('touchmove', (e) => {
  if (!tch) return
  if (e.touches.length !== 1) { tch = null; return }
  const t = e.touches[0], dx = t.clientX - tch.x, dy = tch.y - t.clientY
  if (!tch.axis && Math.hypot(dx, dy) > 6) tch.axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x'
  if (tch.axis === 'x') return
  if (tch.sc) return
  if (e.cancelable) e.preventDefault()
  if (!tch.done && tch.axis === 'y' && Math.abs(dy) > TH()) { tch.done = true; page(Math.sign(dy), 'move') }
}, { passive: false })
addEventListener('touchend', (e) => {
  const s = tch; tch = null
  if (!s || s.done || s.axis === 'x' || !e.changedTouches.length) return
  const t = e.changedTouches[0], dx = t.clientX - s.x, dy = s.y - t.clientY, dt = performance.now() - s.t
  const dir = Math.sign(dy)
  /* un colpetto veloce vale come gesto anche se corto */
  const ok = Math.abs(dy) > Math.abs(dx) * 1.15 && (Math.abs(dy) > TH() * .8 || (Math.abs(dy) > 22 && dt < 260))
  if (!ok) return
  if (s.sc && (s.sc.scrollTop !== s.top || !atEdge(s.sc, dir))) return
  page(dir, 'end')
}, { passive: true })
addEventListener('touchcancel', () => { tch = null }, { passive: true })

addEventListener('keydown', (e) => {
  if (!free() || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input,textarea,select')) return
  const k = e.key
  if (k === 'Home') { e.preventDefault(); goTo(0); return }
  if (k === 'End') { e.preventDefault(); goTo(views.length - 1, pgN(views.length - 1) - 1); return }
  const dir = ['ArrowDown', 'PageDown'].includes(k) || (k === ' ' && !e.target.closest?.('button,a')) ? 1 : ['ArrowUp', 'PageUp'].includes(k) ? -1 : 0
  if (!dir) return
  e.preventDefault()
  const sc = scroller()
  if (sc && !atEdge(sc, dir)) { sc.scrollBy({ top: dir * sc.clientHeight * .8, behavior: reduced ? 'auto' : 'smooth' }); return }
  page(dir)
})
$('[data-to-sys]').addEventListener('click', (e) => { e.preventDefault(); goTo(2, 1) })
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault()
  if (a.dataset.ask) { const r = $(`[data-ask-chips] input[value="${a.dataset.ask}"]`); if (r) r.checked = true }
  /* "Chiedi" porta dritto al modulo */
  const go = () => nav.go(+a.dataset.go, a.dataset.ask ? 9 : 0)
  if (!pl.hidden) { plClose(); setTimeout(() => { if (csOpenNow()) csClose(false, go); else go() }, reduced ? 0 : 750) } else if (csOpenNow()) csClose(false, go); else go()
}))
addEventListener('hashchange', () => {
  if (location.hash === '#isabella') { if (pl.hidden && !csOpenNow()) csOpen(false); return }
  const [h, id] = location.hash.slice(1).split('/')
  const i = HASH.indexOf(h)
  if (id && pl.hidden) { const w = all.find(x => x.id === id); if (w) { if (cur !== 1) nav.go(1); plOpen(w, listFor(), false) } return }
  if (i >= 0 && pl.hidden && !csOpenNow() && i !== cur) nav.go(i)
})

views.forEach((v, k) => v.classList.toggle('is-on', k === cur))
ui(cur)
buildBand(); buildIdx()
document.addEventListener('langchange', () => {
  buildBand(); applyFilter(); paint(); pvCapPaint()
  if (!pl.hidden) { plShow(); $('.pl__back [data-i18n]', pl).textContent = pl.dataset.back || t('pl.back') }
  if (csOpenNow()) edSync()
})
L.apply(L.get())
reveal()
/* il caso e l'editor si preparano quando il sito è fermo: all'apertura c'è solo l'animazione */
{
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200))
  const prep = () => idle(() => {
    csBuild()
    $$('.cs__tb img', cs).forEach(img => img.decode?.().catch(() => {}))
    idle(() => { import('./studio/studio.css'); import('./studio/editor.js'); import('./studio/render.js') })
  }, { timeout: 4000 })
  if (document.readyState === 'complete') setTimeout(prep, 2600); else addEventListener('load', () => setTimeout(prep, 2600), { once: true })
}
if (cur === 0) playReel()
if (cur === 2) prismOn()
/* link diretto a un lavoro: #lavori/<id> */
{
  const w = deepId && all.find(x => x.id === deepId)
  if (w) setTimeout(() => plOpen(w, all, false), reduced ? 0 : 2300)
  if (deepCase) setTimeout(() => csOpen(true), reduced ? 0 : 2300)
}
if (location.search.includes('debug')) window.__gsap = gsap
