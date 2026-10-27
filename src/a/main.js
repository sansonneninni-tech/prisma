import '@fontsource-variable/archivo/wdth.css'
import './a.css'
import { gsap } from 'gsap'
import { PREZZI, LAVORI, ISABELLA } from '../data.js'
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
  n0: 'Prism', n1: 'Work', n2: 'Formats', n3: 'Studio',
  m0: 'Sequence 00 · Prism', drag: 'Drag the prism', ins: 'Inspector',
  h0: 'One shoot day. Months of content.',
  's.what': 'What', 's.what.v': 'Video production studio', 's.where': 'Base', 's.where.v': 'Puglia, Italy',
  's.fmt': 'Outputs', 's.flow': 'Flow', 's.flow.v': 'Brief, production, editing', 's.work': 'Work', 's.work.v': 'on the timeline',
  cta0: 'Open the work', play: 'Watch', dl: 'Download original', case: 'Open the case',
  'i.client': 'Client', 'i.fmt': 'Format', 'i.ratio': 'Ratio', 'i.dur': 'Length', hint1: 'Move the playhead along the timeline.',
  exp: 'Export', m2: 'Presets · 4', noiva: 'Price range',
  'f.evento': 'Event reel', 'f.evento.s': '9:16 · up to 45″ · delivered the next day',
  'f.social': 'Short form', 'f.social.s': '7–30″ series · every format · one language',
  'f.ed': 'Editorial', 'f.ed.s': 'Concept, shoot, edit, colour · 16:9 and vertical',
  'f.sys': 'Content system', 'f.sys.s': '1 shoot day · 14 ready · 24 in reserve', rec: 'Recommended',
  'p.da': 'from', 'p.a': 'to', note: 'Travel not included. The exact quote follows the brief.',
  sys: 'System', h2: 'From one day, 38 pieces.', l1: 'manifesto', l2: 'short', l3: 'micro', l4: 'ready now, 24 in reserve for 12 months',
  case2: 'Real numbers · Isabella Pistillo', ask: 'Ask for this format',
  crew: 'Crew', where: 'Puglia', h3: 'Two people, from brief to export.', ninni: 'Direction, edit, colour', ernesto: 'Production and clients',
  clients: 'Clients', photo: 'Photo', contact: 'Contact', reply: 'Same-day reply',
  'c.name': 'Name', 'c.fmt': 'Format', 'c.any': 'To be defined', 'c.msg': 'The project, in two lines', 'c.send': 'Send',
  ver: 'Version A', cur: 'Current version', verb: 'Version B', tl: 'Timeline', close: 'Close',
  face1: 'Brief', face2: 'Production', face3: 'Editing',
}
const L = makeLang(EN)
const X = {
  it: { all: 'Tutti', unit: '≈ {v} a contenuto', ok: 'Ricevuto. Ti rispondiamo a breve.', err: 'Qualcosa non va. Scrivici su WhatsApp.', drive: 'Su Drive', tracks: ['Editoriale', 'Short form', 'Reel evento', 'Original'] },
  en: { all: 'All', unit: '≈ {v} per piece', ok: 'Got it. We’ll reply soon.', err: 'Something went wrong. Write us on WhatsApp.', drive: 'On Drive', tracks: ['Editorial', 'Short form', 'Event reel', 'Original'] },
}
const x = (k) => X[L.get()][k]
const tx = (o) => o[L.get()] ?? o.it

wireContacts()
wireForm($('[data-form]'), { ok: () => x('ok'), err: () => x('err') })
$('[data-clients]').textContent = [...new Set(LAVORI.map(w => w.cliente))].join(', ')

/* ---------- prezzi ---------- */
function paint() {
  const l = L.get()
  $$('[data-from]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.from].da, l) })
  $$('[data-to]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.to].a, l) })
  $$('[data-base]').forEach(el => { el.textContent = euro(PREZZI.sistema.base, l) })
  $$('[data-unit]').forEach(el => { el.textContent = x('unit').replace('{v}', euro(PREZZI.sistema.base / PREZZI.sistema.contenuti, l)) })
}

/* =========================================================
   Timeline
   ========================================================= */
const DUR = { isabella: 52.6, 'df-marmi': 71.4, 'archemi-editoriale': 22.4, 'archemi-social': 15.5, edward: 12.9, tgtm: 13.9, 'archemi-evento': 9.4, 'original-trailer': 37.3, 'original-petali': 18.4, 'original-pagine': 40.4, 'original-outro': 2.8 }
const TRACK = { editoriale: 0, sistema: 0, social: 1, evento: 2, original: 3 }
const COLOR = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)']
// ordine di montaggio: alterna le tracce come in una vera sequenza
const ORDER = ['df-marmi', 'edward', 'isabella', 'archemi-evento', 'original-petali', 'archemi-social', 'archemi-editoriale', 'nugnes-evento', 'tgtm', 'original-trailer', 'nugnes-editoriale', 'antica-enotria', 'original-outro', 'panegos', 'original-pagine']
const byId = Object.fromEntries(works().map(w => [w.id, w]))
const clips = ORDER.map(id => byId[id]).filter(Boolean)
let acc = 0, accX = 0
clips.forEach(c => { c.dur = DUR[c.id] ?? 30; c.wgt = Math.max(5.5, Math.pow(c.dur, .55)) })
const totW = clips.reduce((s, c) => s + c.wgt, 0)
clips.forEach((c, i) => { c.i = i; c.x = accX / totW; c.w = c.wgt / totW; c.t0 = acc; accX += c.wgt; acc += c.dur; c.track = TRACK[c.cat] })
const TOTAL = acc
$('[data-count]').textContent = clips.length

const area = $('[data-tl-area]'), tracksEl = $('[data-tracks]'), ruler = $('[data-ruler]'), ph = $('[data-ph]')
const labels = $('.tl__labels')
function buildTracks() {
  labels.innerHTML = '<span></span>' + x('tracks').map((n, k) => `<span><b>V${4 - k}</b><i>${n}</i></span>`).join('')
}
tracksEl.innerHTML = [0, 1, 2, 3].map(k => `<div class="trk" data-trk="${k}"></div>`).join('')
clips.forEach(c => {
  const b = document.createElement('button')
  b.type = 'button'; b.className = 'clip'
  if (c.drive) b.classList.add('is-drive')
  if (c.caso) b.classList.add('is-case')
  b.style.left = `${c.x * 100}%`; b.style.width = `calc(${c.w * 100}% - 2px)`
  b.style.setProperty('--k', COLOR[c.track])
  b.style.backgroundImage = `url(${c.poster})`
  b.dataset.i = c.i
  b.innerHTML = `<span class="clip__l">${c.title}</span>`
  b.setAttribute('aria-label', c.title)
  tracksEl.children[c.track].append(b)
  c.el = b
})
const tcOf = (p) => {
  const c = clipAt(p)
  return c.t0 + Math.max(0, Math.min(1, (p - c.x) / c.w)) * c.dur
}
const fmtTC = (s, frames = true) => {
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = Math.floor(s) % 60, f = Math.floor((s % 1) * 25)
  const p = (n) => String(n).padStart(2, '0')
  return frames ? `${p(h)}:${p(m)}:${p(sec)}:${p(f)}` : `${p(m)}:${p(sec)}`
}
function buildRuler() {
  let h = ''
  for (let k = 0; k <= 20; k++) {
    const p = k / 20
    h += k % 2 === 0 ? `<span style="left:${p * 100}%">${fmtTC(tcOf(Math.min(p, .9999)), false)}</span>` : `<span class="min" style="left:${p * 100}%"></span>`
  }
  ruler.innerHTML = h
}
buildRuler()
function clipAt(p) {
  for (let k = clips.length - 1; k >= 0; k--) if (p >= clips[k].x) return clips[k]
  return clips[0]
}

/* filtri */
const filtersEl = $('[data-filters]')
let filter = 'all'
const FILTERS = ['all', 'editoriale', 'social', 'evento', 'original']
function buildFilters() {
  filtersEl.innerHTML = FILTERS.map(f => `<button type="button" data-f="${f}" aria-pressed="${f === filter}">${f === 'all' ? x('all') : tx(CATS[f])}</button>`).join('')
}
const isOn = (c) => filter === 'all' || c.cat === filter || (filter === 'editoriale' && c.cat === 'sistema')
filtersEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return
  filter = b.dataset.f
  $$('[data-f]', filtersEl).forEach(z => z.setAttribute('aria-pressed', String(z.dataset.f === filter)))
  clips.forEach(c => { c.el.classList.toggle('is-off', !isOn(c)); c.el.tabIndex = isOn(c) ? 0 : -1 })
  const first = clips.find(isOn)
  if (first && !isOn(clipAt(head))) setHead(first.x + first.w * .02, true)
})

/* testina */
let head = 0.002, hovering = false, holdUntil = 0, active = null
const SPEED = 1 / 75 // tutta la timeline in 75 secondi
const tcEl = $('[data-tc]'), tlName = $('[data-tl-name]')
function setHead(p, snap = false) {
  head = Math.max(0, Math.min(.9999, p))
  const c = clipAt(head)
  if (c !== active) select(c, snap)
}
function renderHead() {
  ph.style.transform = `translateX(${(head * area.clientWidth).toFixed(1)}px)`
  tcEl.textContent = fmtTC(tcOf(head))
}
let last = performance.now()
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  if (!hovering && now > holdUntil && !player.isOpen && !document.hidden) {
    let p = head + SPEED * dt
    if (p >= .9999) p = 0
    let c = clipAt(p)
    if (!isOn(c)) { const nx = clips.find(z => z.i > c.i && isOn(z)) || clips.find(isOn); p = nx.x + .0005 }
    setHead(p)
  }
  renderHead()
  requestAnimationFrame(tick)
}

/* posizione dal puntatore */
const pAt = (e) => { const r = area.getBoundingClientRect(); return (e.clientX - r.left) / r.width }
if (fine) {
  area.addEventListener('pointerenter', () => { hovering = true })
  area.addEventListener('pointerleave', () => { hovering = false; holdUntil = performance.now() + 1500 })
  area.addEventListener('pointermove', (e) => setHead(pAt(e)))
}
area.addEventListener('click', (e) => {
  const b = e.target.closest('.clip')
  if (!b) { setHead(pAt(e)); holdUntil = performance.now() + 6000; return }
  const c = clips[b.dataset.i]
  if (!fine && active !== c) { setHead(c.x + c.w * .05, true); holdUntil = performance.now() + 8000; if (nav.cur !== 1) nav.go(1); return }
  if (nav.cur !== 1) { setHead(c.x + c.w * .05, true); holdUntil = performance.now() + 8000; nav.go(1); return }
  openClip(c)
})
area.addEventListener('focusin', (e) => { const b = e.target.closest('.clip'); if (b) { const c = clips[b.dataset.i]; setHead(c.x + c.w * .05, true); holdUntil = performance.now() + 8000 } })

/* =========================================================
   Monitor e ispettore (sequenza 01)
   ========================================================= */
const mon = $('.sq--1 .mon'), monV = $('[data-mon-v]'), monI = $('[data-mon-i]')
const I = {
  name: $('[data-mon-name]'), ratio: $('[data-mon-ratio]'), n: $('[data-ins-n]'), title: $('[data-ins-title]'),
  client: $('[data-ins-client]'), fmt: $('[data-ins-fmt]'), r: $('[data-ins-ratio]'), dur: $('[data-ins-dur]'),
  dl: $('[data-ins-dl]'), cas: $('[data-ins-case]'), play: $('[data-ins-play]'),
}
function select(c, snap) {
  active?.el.classList.remove('is-hot')
  active = c; c.el.classList.add('is-hot')
  tlName.textContent = c.title
  paintInspector()
  if (nav?.cur === 1) loadMon(c)
}
function paintInspector() {
  const c = active; if (!c) return
  I.name.textContent = c.title
  I.ratio.textContent = c.ratio.replace('/', ':')
  I.n.textContent = `${String(c.i + 1).padStart(2, '0')} / ${clips.length}`
  I.title.textContent = tx(c.sub)
  I.client.textContent = c.title
  I.fmt.textContent = tx(CATS[c.cat])
  I.r.textContent = c.ratio.replace('/', ':')
  I.dur.textContent = c.drive ? x('drive') : fmtTC(c.dur, false)
  I.dl.hidden = !c.dl; if (c.dl) I.dl.href = c.dl
  I.cas.hidden = !c.caso
  I.play.querySelector('span').textContent = c.drive ? x('drive') : L.t('play')
}
let monTimer = 0
function loadMon(c) {
  clearTimeout(monTimer)
  monTimer = setTimeout(() => {
    if (c.preview) {
      mon.classList.remove('is-img')
      if (monV.dataset.src !== c.preview) { monV.dataset.src = c.preview; monV.src = c.preview; monV.poster = c.poster }
      monV.play().catch(() => {})
    } else {
      mon.classList.add('is-img'); monI.src = c.poster; monV.pause()
    }
  }, 90)
}
const player = createPlayer($('[data-player]'), { reduced })
function openClip(c) {
  if (c.drive) { window.open(c.drive, '_blank', 'noopener'); return }
  const list = clips.filter(z => z.src && isOn(z))
  player.open(list.map(z => ({ src: z.src, poster: z.poster, title: `${z.title} — ${tx(CATS[z.cat])}`, dl: z.dl })), Math.max(0, list.indexOf(c)))
}
$('[data-mon-play]').addEventListener('click', () => active && openClip(active))
I.play.addEventListener('click', () => active && openClip(active))

/* =========================================================
   Sequenza 00: raggi e prisma
   ========================================================= */
const rays = $('[data-rays]')
const SPEC = ['#F3EDE4', '#F8B624', '#F49A1E', '#EE4212', '#B1340E', '#6A1C0A']
rays.innerHTML = `<line class="ray ray--in" x1="0" y1="330" x2="490" y2="280" stroke="#fff" stroke-width="1.4" vector-effect="non-scaling-stroke" />` +
  SPEC.map((c, k) => `<line class="ray ray--out" x1="510" y1="280" x2="1000" y2="${150 + k * 52}" stroke="${c}" stroke-width="${k === 0 ? 1.2 : 1.6}" vector-effect="non-scaling-stroke" />`).join('')
const tetra = initTetra($('[data-tetra]'), { reduced })

/* sistema: 38 celle */
const cells = $('[data-cells]')
{
  const P = ISABELLA.potenziali, R = ISABELLA.pronti
  const kinds = [...Array(P.manifesto).fill(1), ...Array(P.brevi).fill(2), ...Array(P.micro).fill(3)]
  const ready = { 1: R.manifesto, 2: R.brevi, 3: R.micro }, seen = { 1: 0, 2: 0, 3: 0 }
  cells.innerHTML = kinds.map(k => { seen[k]++; return `<i class="c${k}${seen[k] > ready[k] ? ' res' : ''}"></i>` }).join('')
}

/* preset: chiedi */
let ask = 'sistema'
$$('.pre__r').forEach(b => b.addEventListener('click', () => {
  ask = b.dataset.ask
  $$('.pre__r').forEach(z => z.classList.toggle('is-sel', z === b))
}))
$$('.pre__r').forEach(b => b.addEventListener('dblclick', () => { $('[data-ask-select]').value = b.dataset.ask; nav.go(3) }))

/* =========================================================
   Sequenze
   ========================================================= */
const views = $$('[data-v]')
const HASH = ['prisma', 'lavori', 'formati', 'studio']
const wipe = $$('[data-wipe] i')
let start = Math.max(0, HASH.indexOf(location.hash.slice(1)))
function ui(i) {
  document.body.className = document.body.className.replace(/\bat-\d\b/g, '').trim() + ` at-${i}`
  $$('.bar__seq a').forEach(a => a.classList.toggle('is-on', +a.dataset.go === i))
  history.replaceState(null, '', `#${HASH[i]}`)
}
function onEnter(i) {
  if (i === 0) tetra.play(); else tetra.pause()
  if (i === 1 && active) loadMon(active); else monV.pause()
  if (i === 2) gsap.fromTo($$('i', cells), { scaleY: 0 }, { scaleY: 1, duration: reduced ? 0 : .5, ease: 'expo.out', stagger: .012 })
}
const kidsOf = (v) => [...v.querySelectorAll('.pan__h, .ins > *, .pre__r, .crew__txt > *, .tetra, .mon__v')]
function transition(i, dir, from) {
  const a = views[from], b = views[i]
  ui(i)
  if (reduced) { a.classList.remove('is-on'); b.classList.add('is-on'); onEnter(i); return Promise.resolve() }
  tetra.pause()
  return new Promise(res => {
    const o = dir > 0 ? '0% 50%' : '100% 50%', o2 = dir > 0 ? '100% 50%' : '0% 50%'
    gsap.timeline({ onComplete: res })
      .set(wipe, { transformOrigin: o })
      .to(wipe, { scaleX: 1, duration: .42, ease: 'expo.in', stagger: .05 })
      .add(() => { a.classList.remove('is-on'); b.classList.add('is-on'); onEnter(i) })
      .set(wipe, { transformOrigin: o2 })
      .to(wipe, { scaleX: 0, duration: .5, ease: 'expo.out', stagger: .05 })
      .fromTo(kidsOf(b), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .55, ease: 'expo.out', stagger: .025, clearProps: 'opacity,transform' }, '<.08')
  })
}
const nav = viewNav(views.length, transition, { start, canNav: (e) => !player.isOpen && !(e.target?.closest?.('.tl') && e.type === 'wheel' && false) })
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault()
  if (a.hasAttribute('data-ask-go')) $('[data-ask-select]').value = ask
  nav.go(+a.dataset.go)
}))
addEventListener('hashchange', () => { const i = HASH.indexOf(location.hash.slice(1)); if (i >= 0) nav.go(i) })

/* ---------- avvio ---------- */
views.forEach((v, k) => v.classList.toggle('is-on', k === start))
ui(start)
buildFilters(); buildTracks()
document.addEventListener('langchange', () => { buildFilters(); buildTracks(); paint(); paintInspector() })
L.apply(L.get())
setHead(head, true)
onEnter(start)
requestAnimationFrame(tick)
addEventListener('resize', renderHead)

if (!reduced) {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.from('.pan, .tl', { opacity: 0, y: 14, duration: .9, stagger: .07, clearProps: 'opacity,transform' })
    .from($$('.clip'), { scaleX: 0, transformOrigin: '0 50%', duration: .7, stagger: .03, clearProps: 'transform' }, '-=.5')
    .fromTo('.ray--in', { attr: { x2: 0, y2: 330 } }, { attr: { x2: 490, y2: 280 }, duration: .8, ease: 'power2.inOut' }, .5)
    .fromTo('.ray--out', { attr: { x2: 510, y2: 280 } }, { attr: (k) => ({ x2: 1000, y2: 150 + k * 52 }), duration: 1, stagger: .04, ease: 'expo.out' }, 1.2)
}
if (location.search.includes('debug')) window.__gsap = gsap
