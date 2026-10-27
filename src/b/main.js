import '@fontsource-variable/archivo/wdth.css'
import './b.css'
import { gsap } from 'gsap'
import { PREZZI, LAVORI } from '../data.js'
import { works, CATS, euro, wireContacts, makeLang, wireForm, viewNav } from '../shared/works.js'
import { initTetra } from '../tetra.js'
import { createPlayer } from '../player.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const setH = () => document.documentElement.style.setProperty('--app-h', `${innerHeight}px`)
setH(); addEventListener('resize', setH)

const EN = {
  'hd.home': 'Home', 'nav.1': 'Work', 'nav.2': 'Formats', 'nav.3': 'Studio',
  'pp.pause': 'Pause', 'pp.play': 'Play', 'cue': 'Scroll to discover',
  'f.h': 'One shoot day. Months of content.',
  'f.evento': 'Event reel', 'f.evento.d': 'One vertical reel up to 45″, ready the next day',
  'f.social': 'Short form', 'f.social.d': 'A series of 7–30″ videos, one visual language',
  'f.ed': 'Editorial', 'f.ed.d': 'The brand story: concept, shoot, edit, colour',
  'f.sys': 'Content system', 'f.sys.d': '14 pieces ready, 24 in reserve. All from one day',
  'p.da': 'from', 'p.a': 'to', 'ask': 'Ask', 'unit': '≈ {v} per piece',
  'k.1': 'shoot day', 'k.2': 'pieces shot', 'k.3': 'ready', 'k.4': 'in reserve, 12 months', 'k.case': 'Isabella Pistillo case',
  'f.note': 'Travel not included. The exact quote follows the brief.',
  's.h': 'Two people, from brief to export. In Puglia, and wherever needed.',
  's.team': 'Studio', 's.ninni': 'direction, edit, colour', 's.ernesto': 'production and clients', 's.foto': 'Photography · Ninni &amp; Ernesto',
  's.direct': 'Direct', 's.clients': 'Clients', 's.write': 'Write to us', 's.name': 'Name', 's.fmt': 'Format', 's.msg': 'The project, in two lines', 's.send': 'Send',
  's.ok': 'Got it. We’ll reply soon.', 's.err': 'Something went wrong. Write us on WhatsApp.',
  's.v': 'Version B', 's.other': 'Current version', 's.otherA': 'Version A',
  'all': 'All', 'pl.dl': 'Download original', 'pl.close': 'Close', 'drive': 'Watch on Drive',
}
const L = makeLang(EN)
const IT_X = { 'pp.play': 'Play', 's.ok': 'Ricevuto. Ti rispondiamo a breve.', 's.err': 'Qualcosa non va. Scrivici su WhatsApp.', all: 'Tutti', unit: '≈ {v} a contenuto', drive: 'Guarda su Drive' }
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

/* ---------- apertura: il prisma, poi il video ---------- */
const load = $('[data-load]')
const tetra = initTetra($('[data-tetra]'), { reduced })
tetra.kick(3)
const nmSpans = $$('.nm__g span')
gsap.set(nmSpans, { yPercent: 100, clipPath: 'inset(0 0 100% 0)' })
function reveal() {
  const tl = gsap.timeline({ delay: reduced ? 0 : 1.5 })
  tl.to(load, { clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : .9, ease: 'expo.inOut', onComplete: () => { load.remove(); tetra.pause() } })
    .to(nmSpans, { yPercent: 0, clipPath: 'inset(0 0 0% 0)', duration: reduced ? 0 : .9, ease: 'expo.out', stagger: .05 }, '-=.35')
  return tl
}

/* ---------- home: video a tutto schermo ---------- */
const all = works()
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
function playReel() { setReel(); if (!paused) rv.play().catch(() => {}) }
const pp = $('[data-reel-pp]')
pp.addEventListener('click', () => {
  paused = !paused
  pp.setAttribute('aria-pressed', String(paused))
  paused ? rv.pause() : rv.play().catch(() => {})
  paint()
})

/* ---------- lavori: indice di titoli ---------- */
const idx = $('[data-idx]'), sec = $('.v--works'), bgv = $('[data-bgv]'), bgVid = $('video', bgv), bgImg = $('img', bgv)
const meta = $('[data-idx-meta]')
let filter = 'all'
function buildIdx() {
  idx.innerHTML = ''
  all.forEach((w, i) => {
    const li = document.createElement('li')
    li.dataset.cat = w.cat
    const a = document.createElement('a')
    a.href = w.drive || w.src || '#'
    if (w.drive) { a.target = '_blank'; a.rel = 'noopener' }
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
  if (!w) { sec.classList.remove('is-hover'); bgVid.pause(); meta.textContent = ''; applyFilter(); return }
  sec.classList.add('is-hover')
  meta.textContent = `${tx(CATS[w.cat])} — ${tx(w.sub)}${w.drive ? ' — Drive ↗' : ''}`
  if (w.preview) {
    bgv.classList.remove('is-img')
    if (bgVid.dataset.src !== w.preview) { bgVid.dataset.src = w.preview; bgVid.src = w.preview; bgVid.poster = w.poster }
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

/* lettore */
const player = createPlayer($('[data-player]'), { reduced })
const playable = () => all.filter(w => w.src && (filter === 'all' || w.cat === filter))
idx.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-i]'); if (!a) return
  const w = all[a.dataset.i]
  if (w.drive) return
  e.preventDefault()
  const list = playable().map(x => ({ src: x.src, poster: x.poster, title: `${x.title} — ${tx(CATS[x.cat])}`, dl: x.dl }))
  player.open(list, Math.max(0, playable().indexOf(w)))
})

/* ---------- schermate ---------- */
const views = $$('[data-v]')
const HASH = ['home', 'lavori', 'formati', 'studio']
const pos = $('[data-pos]')
let cur = Math.max(0, HASH.indexOf(location.hash.slice(1)))
function ui(i) {
  document.body.className = document.body.className.replace(/\bat-\d\b/g, '').trim() + ` at-${i}`
  $$('.hd__nav a').forEach(a => a.classList.toggle('is-on', +a.dataset.go === i))
  pos.textContent = String(i + 1).padStart(2, '0')
  history.replaceState(null, '', `#${HASH[i]}`)
}
function onEnter(i) {
  if (i === 0) playReel(); else rv.pause()
  if (i !== 1) showBg(null)
}
const D = reduced ? 0 : .95
function transition(i, dir, from) {
  const a = views[from], b = views[i]
  cur = i
  ui(i)
  return new Promise(res => {
    b.classList.add('is-in')
    const kids = [...b.querySelectorAll('.idx li, .band, .fmt > *, .fl__r, .st > *')]
    const tl = gsap.timeline({ onComplete: () => { a.classList.remove('is-on'); b.classList.remove('is-in'); b.classList.add('is-on'); gsap.set([a, b], { clearProps: 'clipPath,transform' }); onEnter(i); res() } })
    tl.fromTo(b, { clipPath: dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: D, ease: 'expo.inOut' })
      .to(a, { yPercent: -12 * dir, duration: D, ease: 'expo.inOut' }, 0)
      .fromTo(kids, { y: 24 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: reduced ? 0 : .7, ease: 'expo.out', stagger: { each: .025, from: dir > 0 ? 'start' : 'end' }, clearProps: 'transform,opacity' }, D * .45)
  })
}
const nav = viewNav(views.length, transition, { start: cur, canNav: () => !player.isOpen && !document.querySelector('[data-load]') })
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault()
  if (a.dataset.ask) { const s = $('[data-ask-select]'); s.value = a.dataset.ask }
  nav.go(+a.dataset.go)
}))
addEventListener('hashchange', () => { const i = HASH.indexOf(location.hash.slice(1)); if (i >= 0) nav.go(i) })

views.forEach((v, k) => v.classList.toggle('is-on', k === cur))
ui(cur)
buildBand(); buildIdx()
document.addEventListener('langchange', () => { buildBand(); applyFilter(); paint() })
L.apply(L.get())
reveal()
if (cur === 0) playReel()
if (location.search.includes('debug')) window.__gsap = gsap
