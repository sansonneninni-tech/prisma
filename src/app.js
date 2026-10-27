import '@fontsource-variable/archivo/wdth.css'
import './styles/v2.css'
import { gsap } from 'gsap'
import { CONTATTI, LAVORI, ORIGINAL, PREZZI, ISABELLA } from './data.js'
import { captureIT, getLang, applyLang, t } from './i18n.js'
import { initTetra } from './tetra.js'
import { createPlayer } from './player.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const media = (id, f) => `/media/${id}/${f}`

/* ---------- altezza reale (iOS) ---------- */
const setH = () => document.documentElement.style.setProperty('--app-h', `${innerHeight}px`)
setH(); addEventListener('resize', setH)

/* ---------- lingua ---------- */
captureIT()
let lang = getLang()
const euro = (n) => {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.')
  return lang === 'en' ? `€${s}` : `€ ${s}`
}
function paintPrices() {
  $$('[data-price-from]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.priceFrom].da) })
  $$('[data-price-to]').forEach(el => { el.textContent = euro(PREZZI[el.dataset.priceTo].a) })
  $$('[data-price-base]').forEach(el => { el.textContent = euro(PREZZI.sistema.base) })
  const unit = $('[data-unit]')
  if (unit) unit.textContent = t('unit', lang).replace('{v}', euro(PREZZI.sistema.base / PREZZI.sistema.contenuti))
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; applyLang(lang) }))
document.addEventListener('langchange', () => { paintPrices(); buildGrid(true) })

/* ---------- contatti ---------- */
$$('[data-wa]').forEach(a => { a.href = `https://wa.me/${CONTATTI.whatsapp}` })
$$('[data-mail]').forEach(a => { a.href = `mailto:${CONTATTI.email}`; if (!a.textContent.trim()) a.textContent = CONTATTI.email })
$$('[data-foto]').forEach(a => { a.href = CONTATTI.sitoFoto })
$$('[data-ig]').forEach(a => { a.href = `https://instagram.com/${CONTATTI.instagram}` })
$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear() })
const logos = $('[data-logos]')
if (logos) {
  const seen = new Set()
  LAVORI.forEach(w => {
    if (!w.logo || seen.has(w.logo)) return
    seen.add(w.logo)
    const li = document.createElement('li')
    li.innerHTML = `<img src="/img/loghi/${w.logo}" alt="${w.cliente}" loading="lazy" class="${['tgtm.png', 'df-marmi.png'].includes(w.logo) ? 'is-tall' : ''}" />`
    logos.append(li)
  })
}

/* =========================================================
   Sezioni a schermo intero
   ========================================================= */
const views = $$('[data-view]')
const navLinks = $$('.top__nav a')
const pos = $('[data-pos]')
const HASH = ['intro', 'lavori', 'formati', 'studio']
let cur = 0, busy = false
let tetra = null

function setActiveUI(i) {
  navLinks.forEach(a => a.classList.toggle('is-active', +a.dataset.go === i))
  if (pos) pos.textContent = String(i).padStart(2, '0')
}

function enter(i) {
  if (i !== 0) tetra?.pause() // il prisma riparte a transizione finita (vedi go)
  if (i === 2) drawRays()
  if (i === 1) layoutGrid()
}

function go(i, { instant = false } = {}) {
  i = Math.max(0, Math.min(views.length - 1, i))
  if (i === cur || busy) return
  const from = views[cur], to = views[i]
  const dir = i > cur ? 1 : -1
  cur = i
  setActiveUI(i)
  history.replaceState(null, '', i === 0 ? location.pathname : `#${HASH[i]}`)
  if (instant || reduced) {
    from.classList.remove('is-active'); to.classList.add('is-active'); enter(i); if (i === 0) tetra?.play(); return
  }
  busy = true
  to.classList.add('is-entering')
  enter(i)
  const start = 'polygon(50% 50%, 50% 50%, 50% 50%)'
  const end = dir > 0 ? 'polygon(50% -170%, 270% 200%, -170% 200%)' : 'polygon(50% 270%, 270% -100%, -170% -100%)'
  from.style.willChange = 'transform'
  to.style.willChange = 'clip-path'
  const sh = $('.shard')
  sh.style.visibility = 'visible'
  const D = .95, LAG = .1 // la luce apre, la sezione segue
  const tl = gsap.timeline()
  if (window.__debug) { tl.pause(); window.__tl = tl }
  tl.fromTo(sh, { clipPath: start }, { clipPath: end, duration: D, ease: 'expo.inOut' }, 0)
    .fromTo(to, { clipPath: start }, { clipPath: end, duration: D, ease: 'expo.inOut' }, LAG)
    .to(from, { scale: .97, duration: D, ease: 'expo.inOut' }, 0)
    .call(() => {
      // fine: scambio delle sezioni e input di nuovo libero
      from.classList.remove('is-active')
      gsap.set(from, { clearProps: 'transform,scale' })
      from.style.willChange = ''
      to.classList.remove('is-entering'); to.classList.add('is-active')
      gsap.set(to, { clearProps: 'clipPath' })
      to.style.willChange = ''
      sh.style.visibility = 'hidden'
      if (i === 0) tetra?.play()
      busy = false
    }, null, D + LAG)
  // entrano solo i blocchi principali
  const kids = to.querySelectorAll(':scope > *:not(.tetra__shadow)')
  if (kids.length && i !== 0) tl.fromTo(kids, { y: 16 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out', stagger: .06, clearProps: 'transform,opacity' }, .42)
}

// link e pulsanti
$$('[data-go]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); go(+a.dataset.go) }))

// rotella / trackpad: un gesto = una sezione
let acc = 0, lastWheel = 0, lockUntil = 0
function canScrollInside(el, dy) {
  while (el && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const st = getComputedStyle(el).overflowY
      if (st === 'auto' || st === 'scroll') {
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
        if (dy < 0 && el.scrollTop > 0) return true
      }
    }
    el = el.parentElement
  }
  return false
}
addEventListener('wheel', (e) => {
  if (!$('[data-player]').hidden) return
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (canScrollInside(e.target, e.deltaY)) return
  e.preventDefault()
  const now = performance.now()
  if (now - lastWheel > 220) acc = 0
  lastWheel = now
  if (now < lockUntil || busy) { lockUntil = now + 260; return } // assorbe l'inerzia del trackpad
  acc += e.deltaY
  if (Math.abs(acc) > 40) {
    const target = cur + Math.sign(acc)
    acc = 0
    if (target >= 0 && target < views.length) { go(target); lockUntil = now + 1100 }
  }
}, { passive: false })

// tocco: scorrimento verticale
let ty0 = null, tx0 = 0, tTarget = null
addEventListener('touchstart', (e) => { ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; tTarget = e.target }, { passive: true })
addEventListener('touchend', (e) => {
  if (ty0 === null || !$('[data-player]').hidden) return
  const dy = ty0 - e.changedTouches[0].clientY, dx = tx0 - e.changedTouches[0].clientX
  ty0 = null
  if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return
  if (tTarget.closest('[data-tetra]')) return
  if (canScrollInside(tTarget, dy)) return
  go(cur + Math.sign(dy))
}, { passive: true })

// tastiera
addEventListener('keydown', (e) => {
  if (!$('[data-player]').hidden) return
  if (e.target.closest('input, textarea')) return
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(cur + 1) }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(cur - 1) }
  if (e.key === 'Home') go(0)
  if (e.key === 'End') go(views.length - 1)
})

/* =========================================================
   00 · Prisma
   ========================================================= */
const tetraEl = $('[data-tetra]')
if (tetraEl) tetra = initTetra(tetraEl, { reduced })

/* =========================================================
   01 · Lavori
   ========================================================= */
const grid = $('[data-grid]')
const ALL = [
  ...LAVORI.map(w => ({ ...w, kind: 'client' })),
  ...ORIGINAL.map(o => ({ ...o, cliente: o.titolo, formato: 'original', kind: 'original' })),
]
const fmtName = (f) => f === 'original' ? t('tag.original', lang) : t({ editoriale: 'f.editoriale', social: 'f.social', evento: 'f.evento', sistema: 'fmt.sys.t' }[f], lang)
let filter = 'all'

function buildGrid(keepFilter = false) {
  if (!grid) return
  if (!keepFilter) filter = 'all'
  grid.innerHTML = ''
  ALL.forEach((w, i) => {
    const el = document.createElement(w.caso ? 'a' : 'button')
    el.className = 'tile'
    if (w.caso) { el.href = w.caso; el.setAttribute('data-transition', '') } else el.type = 'button'
    el.dataset.idx = i
    el.dataset.f = w.formato
    const img = w.cover ? `/img/covers/${w.cover}` : media(w.media, 'poster.jpg')
    const tag = w.caso ? `<span class="tile__tag tile__tag--case">${t('tag.case', lang)}</span>`
      : w.drive ? `<span class="tile__tag">${t('tag.drive', lang)} ↗</span>` : ''
    el.innerHTML = `<span class="tile__m">${tag}<img src="${img}" alt="" loading="lazy" decoding="async" /></span>
      <span class="tile__l"><b>${w.cliente}</b><span>${fmtName(w.formato)}</span></span>`
    grid.append(el)
  })
  applyFilter(false)
}

function visibleTiles() { return $$('.tile:not(.is-out)', grid) }

function applyFilter(anim = true) {
  $$('.tile', grid).forEach(el => {
    const f = el.dataset.f
    const show = filter === 'all' || f === filter || (filter === 'editoriale' && f === 'sistema')
    el.classList.toggle('is-out', !show)
  })
  const n = visibleTiles().length
  const c = $('[data-works-count]'); if (c) c.textContent = n
  layoutGrid()
  if (anim) {
    visibleTiles().forEach((el, i) => el.style.setProperty('--i', i))
    grid.classList.remove('is-swap'); void grid.offsetWidth; grid.classList.add('is-swap')
  }
}

// la griglia riempie lo spazio: sceglie colonne e righe migliori
function layoutGrid() {
  if (!grid || !grid.offsetParent && cur !== 1) return
  const tiles = visibleTiles(), n = tiles.length
  if (!n) return
  const W = grid.clientWidth, H = grid.clientHeight
  if (!W || !H) return
  const g = innerWidth < 700 ? 6 : 10
  const lab = innerWidth < 700 ? 0 : 22
  let best = null
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    let w = (W - (cols - 1) * g) / cols
    let h = (H - (rows - 1) * g) / rows - lab
    if (h <= 20 || w <= 20) continue
    // proporzioni tra 4:3 orizzontale e 2:3 verticale
    if (h / w > 1.5) h = w * 1.5
    if (h / w < .75) w = h / .75
    const empty = rows * cols - n
    const score = w * h * n * (1 - empty * 0.04)
    if (!best || score > best.score) best = { cols, rows, w, h, score }
  }
  if (!best) return
  grid.style.setProperty('--gap', `${g}px`)
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${Math.floor(best.w)}px)`
  grid.style.gridAutoRows = `${Math.floor(best.h + lab)}px`
}
addEventListener('resize', layoutGrid)

$$('[data-filter]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter
  $$('[data-filter]').forEach(x => x.setAttribute('aria-selected', String(x === b)))
  applyFilter()
}))

// anteprima video al passaggio (desktop)
function playPreview(tile) {
  const w = ALL[tile.dataset.idx]
  if (!w.media) return
  let v = tile.querySelector('video')
  if (!v) {
    v = document.createElement('video')
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'
    v.src = media(w.media, 'preview.mp4')
    tile.querySelector('.tile__m').append(v)
  }
  v.currentTime = 0
  v.play().then(() => tile.classList.add('is-playing')).catch(() => {})
}
function stopPreview(tile) {
  const v = tile.querySelector('video')
  tile.classList.remove('is-playing')
  if (v) v.pause()
}
if (grid && fine) {
  grid.addEventListener('pointerover', (e) => { const tl = e.target.closest('.tile'); if (tl && !tl.contains(e.relatedTarget)) playPreview(tl) })
  grid.addEventListener('pointerout', (e) => { const tl = e.target.closest('.tile'); if (tl && !tl.contains(e.relatedTarget)) stopPreview(tl) })
}
// telefono: un'anteprima alla volta, a turno
if (grid && !fine && !reduced) {
  let k = 0, last = null
  setInterval(() => {
    if (cur !== 1 || !$('[data-player]').hidden) return
    const ts = visibleTiles().filter(el => ALL[el.dataset.idx].media)
    if (!ts.length) return
    if (last) stopPreview(last)
    last = ts[k++ % ts.length]
    playPreview(last)
  }, 2800)
}

/* ---------- lettore ---------- */
const player = createPlayer($('[data-player]'), { reduced })
function openPlayer(idx) {
  const ids = visibleTiles().map(el => +el.dataset.idx).filter(i => ALL[i].media && !ALL[i].caso)
  const list = ids.map(i => {
    const w = ALL[i]
    return { src: media(w.media, 'web.mp4'), poster: w.cover ? `/img/covers/${w.cover}` : media(w.media, 'poster.jpg'), title: `${w.cliente} — ${fmtName(w.formato)}`, dl: `/originali/${w.media}.mp4` }
  })
  player.open(list, Math.max(0, ids.indexOf(idx)))
}
grid?.addEventListener('click', (e) => {
  const tl = e.target.closest('.tile')
  if (!tl || tl.tagName === 'A') return
  const w = ALL[tl.dataset.idx]
  if (w.drive && !w.media) { window.open(w.drive, '_blank', 'noopener'); return }
  openPlayer(+tl.dataset.idx)
})

/* =========================================================
   02 · Sistema: 1 giornata → 38 contenuti → 14 pronti + 24 riserva
   ========================================================= */
const rays = $('[data-rays]')
const allCells = () => $$('[data-cells] .cell')
{
  const { potenziali: P, pronti: R } = ISABELLA
  const fill = (key, n, on) => {
    const box = $(`[data-cells="${key}"]`); if (!box) return
    for (let i = 0; i < n; i++) { const c = document.createElement('span'); c.className = `cell${i < on ? ' is-on' : ''}`; box.append(c) }
  }
  fill('manifesto', P.manifesto, R.manifesto)
  fill('brevi', P.brevi, R.brevi)
  fill('micro', P.micro, R.micro)
}
let raysDrawn = false
function drawRays() {
  if (!rays) return
  const box = rays.getBoundingClientRect()
  if (!box.width) return
  const dot = $('.sys__dot').getBoundingClientRect()
  const x0 = dot.left + dot.width / 2 - box.left, y0 = dot.top + dot.height / 2 - box.top
  rays.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
  rays.innerHTML = allCells().map(c => {
    const r = c.getBoundingClientRect()
    const x = r.left - box.left + 1, y = r.top + r.height / 2 - box.top
    return `<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" class="${c.classList.contains('is-on') ? 'is-on' : ''}" />`
  }).join('')
  if (!reduced && !raysDrawn) {
    raysDrawn = true
    const lines = $$('line', rays)
    lines.forEach(l => { const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value); l.style.strokeDasharray = len; l.style.strokeDashoffset = len })
    gsap.to(lines, { strokeDashoffset: 0, duration: 1.1, ease: 'power3.inOut', stagger: .012, delay: .5 })
    gsap.fromTo(allCells(), { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(2)', stagger: .012, delay: .9, clearProps: 'all' })
  }
}
addEventListener('resize', () => { if (cur === 2) { raysDrawn = true; drawRays() } })

/* richiedi → contatti con formato già scelto */
$$('[data-ask]').forEach(b => b.addEventListener('click', () => {
  const r = $(`[data-form-formats] input[value="${b.dataset.ask}"]`)
  if (r) r.checked = true
  go(3)
}))

/* =========================================================
   03 · Modulo (Netlify Forms)
   ========================================================= */
const form = $('[data-form]')
form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const ok = $('[data-form-ok]')
  try {
    const body = new URLSearchParams(new FormData(form)).toString()
    const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!r.ok) throw new Error(r.status)
    form.reset()
    ok.textContent = t('ct.ok', lang)
  } catch (err) {
    ok.textContent = t('ct.err', lang)
  }
  ok.hidden = false
})

/* ---------- uscita verso il caso studio ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-transition]')
  if (!a || e.metaKey || e.ctrlKey || reduced) return
  e.preventDefault()
  const sh = $('.shard')
  sh.style.visibility = 'visible'
  gsap.fromTo(sh, { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%)' }, { clipPath: 'polygon(50% -170%, 270% 200%, -170% 200%)', duration: .8, ease: 'expo.inOut', onComplete: () => { location.href = a.href } })
})
addEventListener('pageshow', (e) => { if (e.persisted) $('.shard').style.visibility = 'hidden' })

/* ---------- precarica le immagini delle altre sezioni (senza bloccare) ---------- */
function warm() {
  $$('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; img.decode?.().catch(() => {}) })
}
;(window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(warm, { timeout: 2500 })
if (location.search.includes('debug')) { window.__gsap = gsap; window.__debug = true }

/* ---------- avvio ---------- */
applyLang(lang)
paintPrices()
buildGrid()
const startIdx = Math.max(0, HASH.indexOf(location.hash.slice(1)))
if (startIdx) { views[0].classList.remove('is-active'); views[startIdx].classList.add('is-active'); cur = startIdx; enter(startIdx) }
setActiveUI(cur)
addEventListener('hashchange', () => { const i = HASH.indexOf(location.hash.slice(1)); if (i >= 0) go(i) })
// arrivo dal caso studio: la scheggia si ritira
if (document.referrer.startsWith(location.origin) && !reduced) {
  const sh = $('.shard'); sh.style.visibility = 'visible'
  gsap.fromTo(sh, { clipPath: 'polygon(50% -170%, 270% 200%, -170% 200%)' }, { clipPath: 'polygon(50% -30%, 50% -30%, 50% -30%)', duration: .9, ease: 'expo.inOut', onComplete: () => { sh.style.visibility = 'hidden' } })
}
