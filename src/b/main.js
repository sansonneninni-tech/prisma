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
  'pr.1': 'editorial', 'pr.2': 'short', 'pr.3': 'micro', 'pr.cap': '1 shoot goes in, 38 pieces come out',
  'k.1': 'shoot day', 'k.2': 'pieces shot', 'k.3': 'ready to post', 'k.4': 'in the reserve, 12 months',
  'sys.ask': 'Ask for the system', 'sys.case': 'The system at work: Isabella Pistillo',
  'sys.res': 'The reserve opens when you need it: +3 short €99 · +3 short and 5 micro €199 · all 24 €549',
  'one.k': 'Or a single format',
  'f.evento': 'Event reel', 'f.evento.d': 'One vertical reel up to 45″, ready the day after the event.',
  'f.evento.1': 'Filming during the event', 'f.evento.2': 'Edit, colour and music', 'f.evento.3': 'Delivered in 9:16 the next day',
  'f.social': 'Short form', 'f.social.d': 'A series of 7 to 30″ videos with one visual language.',
  'f.social.1': 'Concept and shot plan', 'f.social.2': 'Filming, edit, colour, lettering', 'f.social.3': 'Every video in 9:16, 4:5 and 16:9',
  'f.ed': 'Editorial', 'f.ed.d': 'The brand story, from concept to colour.',
  'f.ed.1': 'One or more shoot days', 'f.ed.2': 'Direction, light and sound on set', 'f.ed.3': 'Edit, colour grading, sound design',
  'f.sys': 'Content system',
  'p.da': 'from', 'p.a': 'to', 'ask': 'Ask', 'ex': 'Watch an example', 'unit': '≈ {v} per piece',
  'f.note': 'Travel not included. The exact quote follows the brief.',
  's.h': 'Two people, from brief to export. In Puglia, and wherever needed.',
  's.team': 'Studio', 's.ninni': 'direction, edit, colour', 's.ernesto': 'production and clients', 's.foto': 'Photography · Ninni &amp; Ernesto',
  's.direct': 'Direct', 's.clients': 'Clients', 's.write': 'Write to us', 's.name': 'Name', 's.fmt': 'Format', 's.msg': 'The project, in two lines', 's.send': 'Send',
  's.ok': 'Got it. We’ll reply soon.', 's.err': 'Something went wrong. Write us on WhatsApp.',
  'all': 'All', 'pl.back': 'All work', 'pl.close': 'Close', 'pl.dl': 'Download original', 'pl.case': 'Open the case', 'drive': 'Watch on Drive',
  'fa.client': 'Client', 'fa.fmt': 'Format', 'fa.ratio': 'Ratio', 'fa.len': 'Length', 'fa.where': 'Where',
}
const L = makeLang(EN)
const IT_X = {
  'pp.play': 'Play', 's.ok': 'Ricevuto. Ti rispondiamo a breve.', 's.err': 'Qualcosa non va. Scrivici su WhatsApp.', all: 'Tutti', unit: '≈ {v} a contenuto',
  'fa.client': 'Cliente', 'fa.fmt': 'Formato', 'fa.ratio': 'Proporzioni', 'fa.len': 'Durata', 'fa.where': 'Dove',
}
const t = (k) => (L.get() === 'en' ? EN[k] : (IT_X[k] ?? L.t(k)))
const tx = (o) => o[L.get()] ?? o.it

wireContacts()
wireForm($('[data-form]'), { ok: () => t('s.ok'), err: () => t('s.err') })

/* ---------- prezzi, segnaposto, clienti ---------- */
function paint() {
  const l = L.get()
  $$('[data-from]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.from].da, l) })
  $$('[data-to]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.to].a, l) })
  $$('[data-base]').forEach(el => { el.textContent = euro(PREZZI.sistema.base, l) })
  $$('[data-unit]').forEach(el => { el.textContent = t('unit').replace('{v}', euro(PREZZI.sistema.base / PREZZI.sistema.contenuti, l)) })
  $$('[data-ph]').forEach(el => { el.placeholder = t(el.dataset.ph) })
  $('[data-reel-pp] span').textContent = t(paused ? 'pp.play' : 'pp.pause')
}
const cl = $('[data-clients]')
;[...new Set(LAVORI.map(w => w.cliente))].forEach(c => { const li = document.createElement('li'); li.textContent = c; cl.append(li) })

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
  const rows = [[t('fa.client'), w.title], [t('fa.fmt'), tx(CATS[w.cat])], [t('fa.ratio'), (w.ratio || '').replace('/', ':')]]
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
  history.replaceState({ pl: 1 }, '', `#lavori/${w.id}`)
}
plV.addEventListener('loadedmetadata', () => { const w = plList[plIdx]; if (w?.src) facts(w, fmtTime(plV.duration)) })
function plOpen(w, list = listFor(), push = true) {
  plList = list.includes(w) ? list : all
  plIdx = Math.max(0, plList.indexOf(w))
  plFocus = document.activeElement
  showBg(null); rv.pause()
  pl.hidden = false
  document.body.classList.add('is-pl')
  if (push) { history.pushState({ pl: 1 }, '', `#lavori/${w.id}`); plPushed = true }
  plShow()
  const d = reduced ? 0 : 1
  gsap.timeline()
    .fromTo(pl, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .8 * d, ease: 'expo.inOut', clearProps: 'clipPath' })
    .fromTo([plStage, ...$$('.pl__info > *', pl)], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7 * d, ease: 'expo.out', stagger: .04, clearProps: 'transform,opacity' }, .35 * d)
  $('.pl__back', pl).focus({ preventScroll: true })
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
      history.replaceState(null, '', `#${HASH[cur]}`)
      if (cur === 0) playReel()
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
    const f = [$('.lg'), ...$$('.hd a, .hd button'), ...$$('button, a[href], video', pl)].filter(el => el.offsetParent !== null && !el.closest('[hidden]'))
    const i = f.indexOf(document.activeElement)
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
  }
})
idx.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-i]'); if (!a) return
  e.preventDefault()
  plOpen(all[a.dataset.i])
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

const prism = $('[data-prism]')
let prLoop = null, prIntroDone = false
function prismOn() {
  if (reduced) return
  if (!prLoop) {
    prLoop = gsap.timeline({ repeat: -1, yoyo: true })
      .to('#prEdge', { attr: { x1: 118, x2: 282 }, duration: 3.4, ease: 'sine.inOut' }, 0)
      .to('.pr__warm', { scale: 1.06, transformOrigin: '50% 50%', duration: 3.4, ease: 'sine.inOut' }, 0)
  }
  if (!prIntroDone) {
    prIntroDone = true
    const nums = $$('.pr__l b', prism)
    const rays = $$('.pr__rays line', prism)
    rays.forEach(l => { const n = l.getTotalLength(); l.style.strokeDasharray = n; l.style.strokeDashoffset = n })
    gsap.timeline({ delay: .3 })
      .fromTo('.pr__in', { attr: { x2: 0, y2: 152 } }, { attr: { x2: 205, y2: 126 }, duration: .8, ease: 'power2.inOut' })
      .fromTo(['.pr__body', '.pr__line', '.pr__edge'], { opacity: 0, scale: .92, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' }, '-=.35')
      .fromTo('.pr__beam', { attr: { x2: 205 } }, { attr: { x2: 296 }, duration: .35, ease: 'none' }, '-=.45')
      .to(rays, { strokeDashoffset: 0, duration: 1.1, ease: 'expo.out', stagger: .04 }, '-=.05')
      .fromTo('.pr__l', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .6, ease: 'expo.out', stagger: .08 }, '-=.8')
      .add(() => nums.forEach(b => { const o = { v: 0 }; gsap.to(o, { v: +b.dataset.n, duration: .9, ease: 'power2.out', onUpdate: () => { b.textContent = Math.round(o.v) } }) }), '-=.75')
  }
  prLoop.play()
}
function prismOff() { prLoop?.pause() }

/* ---------- schermate ---------- */
const views = $$('[data-v]')
const HASH = ['home', 'lavori', 'formati', 'studio']
const pos = $('[data-pos]')
const hashView = () => HASH.indexOf(location.hash.slice(1).split('/')[0])
let cur = Math.max(0, hashView())
const deepId = location.hash.slice(1).split('/')[1]
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
      .fromTo(kids, { y: 24 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: reduced ? 0 : .7, ease: 'expo.out', stagger: { each: .025, from: dir > 0 ? 'start' : 'end' }, clearProps: 'transform,opacity' }, D * .45)
  })
}

/* le schermate che scorrono dentro (telefono, tablet) cambiano pagina solo dal bordo */
let touchTop = null
addEventListener('touchstart', () => { const sc = $('.v.is-on .scrl'); touchTop = sc ? sc.scrollTop : null }, { passive: true })
function canNav(e) {
  if (!pl.hidden || document.querySelector('[data-load]')) return false
  const sc = $('.v.is-on .scrl')
  if (!sc || sc.scrollHeight <= sc.clientHeight + 2) return true
  const atTop = sc.scrollTop <= 1, atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2
  if (e.type === 'wheel') return e.deltaY > 0 ? atEnd : atTop
  if (e.type === 'touchend') return touchTop === sc.scrollTop && (atTop || atEnd)
  return true
}
const nav = viewNav(views.length, transition, { start: cur, canNav })
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault()
  if (a.dataset.ask) { const s = $('[data-ask-select]'); s.value = a.dataset.ask }
  const go = () => nav.go(+a.dataset.go)
  if (!pl.hidden) { plClose(); setTimeout(go, reduced ? 0 : 750) } else go()
}))
addEventListener('hashchange', () => {
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
  if (!pl.hidden) plShow()
})
L.apply(L.get())
reveal()
if (cur === 0) playReel()
if (cur === 2) prismOn()
/* link diretto a un lavoro: #lavori/<id> */
{
  const w = deepId && all.find(x => x.id === deepId)
  if (w) setTimeout(() => plOpen(w, all, false), reduced ? 0 : 2300)
}
if (location.search.includes('debug')) window.__gsap = gsap
