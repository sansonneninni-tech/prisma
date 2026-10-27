import '@fontsource/archivo/300.css'
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/400-italic.css'
import './styles/base.css'
import './styles/sections.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { LAVORI, ORIGINAL, SHOWREEL, PREZZI, ESTENSIONI, METODO, FORMATI, CONTATTI } from './data.js'
import { applyLang, captureIT, getLang, t } from './i18n.js'
import { initHeroPrism } from './hero-prism.js'
import { initCommon, fmtEuro, mediaUrl } from './common.js'

gsap.registerPlugin(ScrollTrigger)

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const mobile = () => innerWidth < 900

captureIT()
let lang = getLang()

const { lenis } = initCommon({ gsap, ScrollTrigger, Lenis, reduced, fine })

/* ---------------------------------------------------------
   Showreel nascosto che passa dentro il prisma
   --------------------------------------------------------- */
const reelItems = SHOWREEL.map(id => {
  const w = LAVORI.find(l => l.media === id)
  const o = ORIGINAL.find(l => l.media === id)
  return { id, name: w ? w.cliente : (o ? o.titolo : id) }
})
const reel = document.createElement('video')
reel.muted = true; reel.playsInline = true; reel.setAttribute('playsinline', ''); reel.crossOrigin = 'anonymous'; reel.preload = 'auto'
let reelIdx = 0, reelTimer = 0
const nowEl = $('[data-now]')
function playReel(i) {
  reelIdx = (i + reelItems.length) % reelItems.length
  const it = reelItems[reelIdx]
  reel.src = mediaUrl(it.id, 'web.mp4')
  reel.currentTime = 0
  reel.play().catch(() => {})
  if (nowEl) {
    gsap.to(nowEl, { opacity: 0, y: -6, duration: .25, onComplete: () => { nowEl.textContent = it.name; gsap.fromTo(nowEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .4 }) } })
  }
  clearTimeout(reelTimer)
  reelTimer = setTimeout(() => { playReel(reelIdx + 1); prism?.kick(3.2) }, 5200)
}

/* Marquee: duplico la traccia per un giro continuo */
$$('[data-marquee]').forEach(mq => { const tr = mq.firstElementChild; const cl = tr.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); mq.appendChild(cl) })

/* ---------------------------------------------------------
   Hero
   --------------------------------------------------------- */
let prism = null
const canvas = $('[data-prism]')
if (canvas) {
  prism = initHeroPrism({
    canvas, reduced,
    getVideo: () => reel,
    onFail: () => document.documentElement.classList.add('no-webgl'),
  })
  canvas.addEventListener('click', () => { playReel(reelIdx + 1); prism?.kick(4) })
}

ScrollTrigger.create({
  trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (st) => { if (prism) prism.state.scroll = st.progress },
})
gsap.to('.hero__inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } })

/* ---------------------------------------------------------
   Loader → intro
   --------------------------------------------------------- */
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  const count = $('.loader__count')
  const n = { v: 0 }
  if (reduced) {
    document.body.classList.remove('is-loading'); $('.loader')?.remove()
    if (prism) prism.state.intro = 1
    playReel(0); return
  }
  tl.to('.loader__beam', { strokeDashoffset: 0, duration: .7, ease: 'power2.inOut' })
    .to(n, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(n.v) } }, 0)
    .to('.loader__tri', { strokeDashoffset: 0, duration: .6, ease: 'power2.inOut' }, .45)
    .to('.loader__fan line', { strokeDashoffset: 0, duration: .6, stagger: .06, ease: 'power2.out' }, .9)
    .add(() => playReel(0), .8)
    .to('.loader', { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', duration: .9, ease: 'expo.inOut' }, 1.55)
    .add(() => document.body.classList.remove('is-loading'), 1.9)
    .fromTo('.hero__title .line > span', { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: .09 }, 1.85)
    .fromTo('.hero__eyebrow, .hero__foot', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, stagger: .1 }, 2.1)
    .fromTo('.hdr', { yPercent: -100 }, { yPercent: 0, duration: 1 }, 2.1)
  if (prism) tl.fromTo(prism.state, { intro: 0 }, { intro: 1, duration: 2.6, ease: 'power2.inOut' }, 1.5)
  tl.add(() => $('.loader')?.remove())
}
const fontsReady = document.fonts?.ready ?? Promise.resolve()
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(intro)

/* ---------------------------------------------------------
   Lavori
   --------------------------------------------------------- */
const list = $('[data-works]')
const preview = $('[data-preview]')
const pv = preview.querySelector('video'), pimg = preview.querySelector('img')

function coverOf(w) {
  if (w.cover) return `/img/covers/${w.cover}`
  if (w.media) return mediaUrl(w.media, 'poster.jpg')
  return ''
}

function renderWorks() {
  list.innerHTML = ''
  LAVORI.forEach((w, i) => {
    const li = document.createElement('li')
    li.className = 'work'
    li.dataset.format = w.formato
    li.innerHTML = `
      <button class="work__btn" type="button" data-open="${w.id}" aria-label="${w.cliente}, ${t('f.' + w.formato, lang)}">
        <span class="work__thumb">
          <img src="${coverOf(w)}" alt="" loading="lazy" />
          ${w.media ? `<video muted playsinline loop preload="none" data-src="${mediaUrl(w.media, 'web.mp4')}"></video>` : ''}
          ${w.logo ? `<img class="logo" src="/img/loghi/${w.logo}" alt="" loading="lazy" />` : ''}
        </span>
        <span class="work__n">${String(i + 1).padStart(2, '0')}</span>
        <span class="work__name">${w.cliente}<span class="grad-ghost" aria-hidden="true">${w.cliente}</span></span>
        <span class="work__sub">${w.sub[lang]}</span>
        <span class="work__fmt ${w.caso ? 'work__case' : ''}">${w.caso ? t('case.eyebrow', lang) : FORMATI[w.formato][lang]}</span>
      </button>`
    list.appendChild(li)
  })
  $('[data-works-count]').textContent = LAVORI.length
  applyFilter(currentFilter)
  bindThumbVideos()
}

let currentFilter = 'all'
function applyFilter(f) {
  currentFilter = f
  $$('[data-filter]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.filter === f)))
  const items = $$('.work', list)
  const vis = items.filter(li => f === 'all' || li.dataset.format === f)
  items.forEach(li => { li.hidden = !vis.includes(li) })
  if (!reduced) gsap.fromTo(vis, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .7, stagger: .04, ease: 'expo.out', overwrite: true })
  ScrollTrigger.refresh()
}
$$('[data-filter]').forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)))
$$('[data-goto-filter]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault(); applyFilter(a.dataset.gotoFilter); lenis ? lenis.scrollTo('#lavori', { offset: -20 }) : $('#lavori').scrollIntoView()
}))

function setView(v) {
  list.dataset.viewMode = v
  $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)))
  ScrollTrigger.refresh()
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)))
if (!fine) setView('grid')

/* Anteprima che segue il cursore (solo indice, solo mouse) */
let pvOn = false
const pvPos = { x: innerWidth / 2, y: innerHeight / 2 }, pvCur = { x: pvPos.x, y: pvPos.y }
const pvVel = { v: 0 }
window.addEventListener('pointermove', (e) => { pvPos.x = e.clientX; pvPos.y = e.clientY }, { passive: true })
gsap.ticker.add(() => {
  const dx = pvPos.x - pvCur.x
  pvCur.x += dx * .14; pvCur.y += (pvPos.y - pvCur.y) * .14
  pvVel.v += (dx * .02 - pvVel.v) * .2
  const w = preview.offsetWidth, h = preview.offsetHeight
  preview.style.transform = `translate3d(${pvCur.x - w / 2 + 40}px, ${pvCur.y - h / 2}px, 0) rotate(${Math.max(-8, Math.min(8, pvVel.v))}deg)`
})
list.addEventListener('pointerover', (e) => {
  if (!fine || list.dataset.viewMode !== 'index') return
  const btn = e.target.closest('[data-open]'); if (!btn) return
  const w = LAVORI.find(l => l.id === btn.dataset.open)
  $$('.work', list).forEach(li => li.classList.toggle('is-dim', li !== btn.parentElement))
  pimg.src = coverOf(w)
  if (w.media) { pv.src = mediaUrl(w.media, 'web.mp4'); pv.play().catch(() => {}) } else { pv.removeAttribute('src'); pv.load() }
  if (!pvOn) { preview.classList.add('is-on'); pvOn = true }
  setCursor('view', t('cursor.view', lang))
})
list.addEventListener('pointerleave', () => {
  preview.classList.remove('is-on'); pvOn = false; pv.pause()
  $$('.work', list).forEach(li => li.classList.remove('is-dim'))
  setCursor('')
})
list.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open]'); if (!btn) return
  const visible = LAVORI.filter(w => currentFilter === 'all' || w.formato === currentFilter)
  openPlayer(visible, visible.findIndex(w => w.id === btn.dataset.open), btn)
})

/* Video delle miniature: partono quando entrano in vista */
let thumbIO
function bindThumbVideos() {
  thumbIO?.disconnect()
  thumbIO = new IntersectionObserver((ens) => {
    ens.forEach(en => {
      const v = en.target
      if (en.isIntersecting && list.dataset.viewMode === 'grid') {
        if (!v.src && v.dataset.src) v.src = v.dataset.src
        v.play().catch(() => {})
      } else v.pause()
    })
  }, { rootMargin: '10% 0px' })
  $$('video[data-src]', list).forEach(v => thumbIO.observe(v))
}

const autoIO = new IntersectionObserver((ens) => ens.forEach(en => { en.isIntersecting ? en.target.play().catch(() => {}) : en.target.pause() }), { threshold: .15 })
$$('[data-autoplay]').forEach(v => autoIO.observe(v))

/* ---------------------------------------------------------
   Player a tutto schermo (si apre da un triangolo)
   --------------------------------------------------------- */
const player = $('[data-player]')
const pVideo = $('[data-player-video]')
let pList = [], pIdx = 0, pFrom = null
function fillPlayer() {
  const w = pList[pIdx]
  $('[data-player-client]').textContent = w.cliente || w.titolo
  $('[data-player-sub]').textContent = w.sub ? `${w.sub[lang]} · ${FORMATI[w.formato]?.[lang] ?? ''}` : t('orig.title', lang)
  const dl = $('[data-player-download]'), dr = $('[data-player-drive]'), cs = $('[data-player-case]')
  if (w.media) {
    pVideo.poster = w.cover ? `/img/covers/${w.cover}` : mediaUrl(w.media, 'poster.jpg')
    pVideo.src = mediaUrl(w.media, 'web.mp4')
    pVideo.play().catch(() => {})
    dl.href = mediaUrl(w.media, 'originale.mp4'); dl.setAttribute('download', `PRISMA-${w.id}.mp4`); dl.hidden = false
  } else {
    pVideo.removeAttribute('src'); pVideo.poster = coverOf(w); pVideo.load()
    dl.hidden = true
  }
  dr.hidden = !w.drive; if (w.drive) dr.href = w.drive
  cs.hidden = !w.caso; if (w.caso) cs.href = w.caso
}
function openPlayer(items, idx, fromEl) {
  pList = items; pIdx = Math.max(0, idx); pFrom = fromEl
  fillPlayer()
  player.hidden = false
  lenis?.stop()
  const r = fromEl?.getBoundingClientRect()
  const cx = r ? ((r.left + r.width / 2) / innerWidth) * 100 : 50
  const cy = r ? ((r.top + r.height / 2) / innerHeight) * 100 : 50
  const startPoly = `polygon(${cx}% ${cy - .5}%, ${cx + .5}% ${cy + .5}%, ${cx - .5}% ${cy + .5}%)`
  if (reduced) { player.style.clipPath = 'none' } else {
    gsap.timeline()
      .fromTo(player, { clipPath: startPoly }, { clipPath: `polygon(${cx}% -160%, 260% 160%, -160% 160%)`, duration: 1.05, ease: 'expo.inOut' })
      .set(player, { clipPath: 'none' })
      .fromTo('.player__ui > *', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, stagger: .05, ease: 'expo.out' }, .6)
  }
  setCursor('')
  $('[data-player-close]').focus({ preventScroll: true })
}
function closePlayer() {
  const done = () => { player.hidden = true; pVideo.pause(); pVideo.removeAttribute('src'); pVideo.load(); lenis?.start(); pFrom?.focus({ preventScroll: true }) }
  if (reduced) return done()
  gsap.fromTo(player, { clipPath: 'polygon(50% -160%, 260% 160%, -160% 160%)' }, { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%)', duration: .8, ease: 'expo.inOut', onComplete: done })
}
function stepPlayer(d) {
  pIdx = (pIdx + d + pList.length) % pList.length
  gsap.fromTo('.player__frame', { opacity: 0, x: d * 40 }, { opacity: 1, x: 0, duration: .6, ease: 'expo.out' })
  fillPlayer()
}
$('[data-player-close]').addEventListener('click', closePlayer)
$('[data-player-prev]').addEventListener('click', () => stepPlayer(-1))
$('[data-player-next]').addEventListener('click', () => stepPlayer(1))
document.addEventListener('keydown', (e) => {
  if (player.hidden) return
  if (e.key === 'Escape') closePlayer()
  if (e.key === 'ArrowRight') stepPlayer(1)
  if (e.key === 'ArrowLeft') stepPlayer(-1)
})
pVideo.addEventListener('timeupdate', () => {
  const p = pVideo.duration ? pVideo.currentTime / pVideo.duration : 0
  $('[data-player-bar]').style.transform = `scaleX(${p})`
})
pVideo.addEventListener('click', () => { pVideo.paused ? pVideo.play() : pVideo.pause() })

/* ---------------------------------------------------------
   Sistema contenuti: 1 → 38 → 14 + 24 in riserva
   --------------------------------------------------------- */
const grid = $('[data-sys-grid]')
const slots = []
const groups = []
;(function buildSystem() {
  const defs = [
    { k: 'manifesto', n: 1, ready: 1, media: () => 'isabella-editoriale', cols: 1, lbl: { it: 'manifesto', en: 'manifesto' } },
    { k: 'breve', n: 12, ready: 5, media: (i) => `isabella-short-${i}`, cols: 3, lbl: { it: 'video brevi', en: 'short videos' } },
    { k: 'micro', n: 25, ready: 8, media: (i) => `isabella-micro-${i}`, cols: 5, lbl: { it: 'micro', en: 'micro' } },
  ]
  defs.forEach(g => {
    const wrap = document.createElement('div')
    wrap.className = 'grp grp--' + g.k
    const inner = document.createElement('div')
    inner.className = 'grp__grid'; inner.style.gridTemplateColumns = `repeat(${g.cols}, 1fr)`
    for (let i = 1; i <= g.n; i++) {
      const d = document.createElement('div')
      d.className = 'slot'
      d.dataset.kind = g.k
      if (i <= g.ready) {
        const id = g.media(i)
        d.dataset.ready = '1'
        d.innerHTML = `<img src="${mediaUrl(id, 'poster.jpg')}" alt="" loading="lazy" /><video muted playsinline loop preload="none" data-src="${mediaUrl(id, 'web.mp4')}"></video>`
      }
      inner.appendChild(d); slots.push(d)
    }
    const cap = document.createElement('p')
    cap.className = 'grp__cap'
    cap.innerHTML = `<b>${g.n}</b> <span data-grp-lbl="${g.k}">${g.lbl.it}</span>`
    wrap.append(inner, cap)
    grid.appendChild(wrap); groups.push({ el: wrap, def: g })
  })
})()

const steps = $$('[data-step]')
function setStep(n) {
  steps.forEach(li => li.classList.toggle('is-on', +li.dataset.step <= n))
}
const readySlots = slots.filter(s => s.dataset.ready)
const reserveSlots = slots.filter(s => !s.dataset.ready)
let sysVideosOn = false
function sysVideos(on) {
  if (on === sysVideosOn) return
  sysVideosOn = on
  readySlots.forEach(s => {
    const v = s.querySelector('video')
    if (on) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}) } else v.pause()
  })
}

const mm = gsap.matchMedia()
mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
  const { desk, reduce } = ctx.conditions
  if (reduce) {
    gsap.set(slots, { opacity: 1, scale: 1 }); readySlots.forEach(s => s.classList.add('is-ready')); reserveSlots.forEach(s => s.classList.add('is-reserve')); setStep(4)
    ScrollTrigger.create({ trigger: '[data-system]', start: 'top 80%', end: 'bottom top', onToggle: st => sysVideos(st.isActive) })
    return
  }
  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: {
      trigger: '[data-system]', start: desk ? 'top top' : 'top 70%', end: desk ? '+=320%' : 'bottom 60%',
      pin: desk ? '.system__pin' : false, scrub: .6,
      onUpdate: (st) => {
        const p = st.progress
        setStep(p < .12 ? 0 : p < .34 ? 1 : p < .56 ? 2 : p < .78 ? 3 : 4)
      },
      onToggle: (st) => sysVideos(st.isActive),
    },
  })
  tl.to('.system__beam line', { strokeDashoffset: 0, duration: 1 })
    .to(slots, { opacity: 1, scale: 1, duration: 1, stagger: { each: .04, from: 'start' } }, .8)
    .to('.system__beam', { opacity: 0, duration: .5 }, 1.6)
    .add(() => {}, 2.6)
    .to(readySlots, { duration: .01, onStart: () => readySlots.forEach(s => s.classList.add('is-ready')), onReverseComplete: () => readySlots.forEach(s => s.classList.remove('is-ready')) }, 3.2)
    .to(reserveSlots, { opacity: .55, duration: .6 }, 3.3)
    .to(reserveSlots, { duration: .01, onStart: () => reserveSlots.forEach(s => s.classList.add('is-reserve')), onReverseComplete: () => reserveSlots.forEach(s => s.classList.remove('is-reserve')) }, 4.4)
    .to(reserveSlots, { opacity: 1, duration: .6, stagger: .01 }, 4.5)
    .to({}, { duration: 1.4 })
  return () => { readySlots.forEach(s => s.classList.remove('is-ready')); reserveSlots.forEach(s => s.classList.remove('is-reserve')) }
})

/* ---------------------------------------------------------
   Metodo: il prisma a facce (dal lavoro con Claude Design)
   --------------------------------------------------------- */
const rotEl = $('[data-prism3d-rot]')
const tabs = $('[data-method-tabs]')
const body = $('[data-method-body]')
let mIdx = 0, mTimer = 0, mInView = false
;(function buildPrism3d() {
  const s = () => parseFloat(getComputedStyle($('[data-prism3d]')).getPropertyValue('--s')) || 300
  const faces = METODO.slice(0, 3)
  faces.forEach((m, i) => {
    const f = document.createElement('div')
    f.className = 'p3-face'; f.dataset.i = i
    f.innerHTML = `<span data-mname="${m.id}">${m.nome[lang]}</span>`
    rotEl.appendChild(f)
  })
  const shadow = document.createElement('div'); shadow.className = 'p3-shadow'; rotEl.parentElement.appendChild(shadow)
  const place = () => {
    const S = s(), apo = S * 0.2887
    $$('.p3-face', rotEl).forEach((f, i) => { f.style.transform = `rotateY(${i * 120}deg) translateZ(${apo}px)` })
  }
  place(); addEventListener('resize', place)
  METODO.forEach((m, i) => {
    const b = document.createElement('button')
    b.type = 'button'; b.role = 'tab'; b.dataset.i = i
    b.textContent = m.nome[lang]
    b.addEventListener('click', () => { setMethod(i, true) })
    tabs.appendChild(b)
  })
})()
const REST = 40
const prismRot = { y: REST, x: -20 }
function setMethod(i, user) {
  mIdx = i
  $$('button', tabs).forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === i)))
  $$('.p3-face', rotEl).forEach(f => f.classList.toggle('is-on', i === 3 || +f.dataset.i === i))
  const m = METODO[i]
  body.innerHTML = `<p class="method__claim">${m.claim[lang]}</p><p class="method__text">${m.body[lang]}</p>`
  if (!reduced) {
    gsap.fromTo(body.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ease: 'expo.out' })
    // Metodo: il prisma fa un giro intero con tutte le facce accese
    let ty
    if (i === 3) ty = prismRot.y - 360
    else { const target = -i * 120 + REST; ty = prismRot.y + ((((target - prismRot.y) % 360) + 540) % 360) - 180 }
    gsap.to(prismRot, { y: ty, x: -20, duration: i === 3 ? 2.2 : 1.4, ease: 'expo.inOut', onUpdate: applyPrismRot })
  } else applyPrismRot()
  if (user) { clearInterval(mTimer); mTimer = 0 }
}
let sway = { x: 0, y: 0 }
function applyPrismRot() {
  rotEl.parentElement.style.transform = `rotateX(${prismRot.x + sway.y}deg)`
  rotEl.style.transform = `rotateY(${prismRot.y + sway.x}deg)`
}
$('[data-method]').addEventListener('pointermove', (e) => {
  if (!fine || reduced) return
  const r = e.currentTarget.getBoundingClientRect()
  gsap.to(sway, { x: ((e.clientX - r.left) / r.width - .5) * 24, y: -((e.clientY - r.top) / r.height - .5) * 10, duration: .8, ease: 'power3.out', onUpdate: applyPrismRot })
})
setMethod(0)
ScrollTrigger.create({
  trigger: '[data-method]', start: 'top 60%', end: 'bottom 30%',
  onToggle: (st) => {
    mInView = st.isActive
    if (mInView && !mTimer && !reduced) mTimer = setInterval(() => setMethod((mIdx + 1) % 4), 3600)
    if (!mInView) { clearInterval(mTimer); mTimer = 0 }
  },
})

/* ---------------------------------------------------------
   Formati: prezzi e "menu" del sistema
   --------------------------------------------------------- */
function fillPrices() {
  $$('[data-price]').forEach(el => {
    const [k, f] = el.dataset.price.split('.')
    el.textContent = fmtEuro(PREZZI[k][f], lang)
  })
}
const optsEl = $('[data-menu-opts]')
let menuSel = 'nessuna'
function renderMenu() {
  optsEl.innerHTML = ''
  ESTENSIONI.forEach(o => {
    const l = document.createElement('label')
    l.className = 'opt' + (o.id === menuSel ? ' is-on' : '')
    l.innerHTML = `<input type="radio" name="estensione" value="${o.id}" ${o.id === menuSel ? 'checked' : ''} />
      <span class="opt__dot"></span>
      <span class="opt__t">${o[lang]}<small>${o.det[lang]}</small></span>
      <span class="opt__p">${o.prezzo ? '+ ' + fmtEuro(o.prezzo, lang) : '—'}</span>
      ${o.top ? `<span class="opt__badge">${lang === 'en' ? 'Best value' : 'Miglior valore'}</span>` : ''}`
    l.querySelector('input').addEventListener('change', () => { menuSel = o.id; renderMenu() })
    optsEl.appendChild(l)
  })
  updateMenu()
}
const bar = $('[data-menu-bar]')
for (let i = 0; i < 38; i++) bar.appendChild(document.createElement('i'))
const priceObj = { v: PREZZI.sistema.base, u: Math.round(PREZZI.sistema.base / 14), c: 14 }
function updateMenu() {
  const o = ESTENSIONI.find(e => e.id === menuSel)
  const total = PREZZI.sistema.base + o.prezzo
  const count = PREZZI.sistema.contenuti + o.piu
  const unit = Math.round(total / count)
  gsap.to(priceObj, {
    v: total, u: unit, c: count, duration: reduced ? 0 : .8, ease: 'expo.out',
    onUpdate: () => {
      $('[data-menu-price]').textContent = fmtEuro(Math.round(priceObj.v), lang)
      $('[data-menu-unit]').textContent = fmtEuro(Math.round(priceObj.u), lang)
      $('[data-menu-count]').textContent = Math.round(priceObj.c)
    },
  })
  $$('i', bar).forEach((b, i) => { b.className = i < 14 ? 'is-base' : i < count ? 'is-plus' : '' })
  const cfg = $('[data-form-config]')
  if (cfg) cfg.value = `Sistema contenuti: ${o.it} (${count} contenuti, ${fmtEuro(total, 'it')})`
}

/* ---------------------------------------------------------
   Original
   --------------------------------------------------------- */
const origRow = $('[data-original]')
ORIGINAL.forEach((o, i) => {
  const b = document.createElement('button')
  b.className = 'orig'; b.type = 'button'
  b.innerHTML = `<span class="orig__media"><img src="${mediaUrl(o.media, 'poster.jpg')}" alt="" loading="lazy" /><video muted playsinline loop preload="none" src="${mediaUrl(o.media, 'web.mp4')}" data-autoplay></video></span><span class="orig__t">${o.titolo}</span>`
  b.addEventListener('click', () => openPlayer(ORIGINAL, i, b))
  b.addEventListener('pointerenter', () => setCursor('view', t('cursor.play', lang)))
  b.addEventListener('pointerleave', () => setCursor(''))
  origRow.appendChild(b)
  autoIO.observe(b.querySelector('video'))
})

/* ---------------------------------------------------------
   Contatti
   --------------------------------------------------------- */
function fillContacts() {
  const msg = encodeURIComponent(lang === 'en' ? 'Hi PRISMA, I’d like to talk about a project.' : 'Ciao PRISMA, vorrei parlarvi di un progetto.')
  const wa = $('[data-wa]'); wa.href = `https://wa.me/${CONTATTI.whatsapp}?text=${msg}`; $('[data-wa-label]').textContent = CONTATTI.whatsappLabel
  const ml = $('[data-mail]'); ml.href = `mailto:${CONTATTI.email}`; $('[data-mail-label]').textContent = CONTATTI.email
  const ig = $('[data-ig]'); ig.href = `https://instagram.com/${CONTATTI.instagram}`; $('[data-ig-label]').textContent = '@' + CONTATTI.instagram
  $$('[data-site-foto]').forEach(a => { a.href = CONTATTI.sitoFoto })
}
$$('[data-pick]').forEach(a => a.addEventListener('click', () => {
  const r = $(`[data-form-formats] input[value="${a.dataset.pick}"]`)
  if (r) r.checked = true
}))
const form = $('[data-form]')
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const data = new URLSearchParams(new FormData(form)).toString()
  try {
    await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data })
  } catch (err) { /* in locale non c'è Netlify */ }
  $('[data-form-ok]').hidden = false
  form.querySelector('button[type="submit"]').disabled = true
})

/* ---------------------------------------------------------
   Cursore
   --------------------------------------------------------- */
const cursor = $('.cursor'), cLabel = $('[data-cursor-label]')
function setCursor(mode, label = '') {
  if (!fine) return
  cursor.classList.toggle('is-view', mode === 'view')
  cLabel.textContent = label
}
$$('[data-case-teaser] a').forEach(a => {
  a.addEventListener('pointerenter', () => setCursor('view', t('cursor.case', lang)))
  a.addEventListener('pointerleave', () => setCursor(''))
})

/* ---------------------------------------------------------
   Lingua
   --------------------------------------------------------- */
function setLang(l) {
  lang = l
  applyLang(l)
  renderWorks(); fillPrices(); renderMenu(); fillContacts()
  $$('[data-mname]').forEach(s => { const m = METODO.find(x => x.id === s.dataset.mname); s.textContent = m.nome[l] })
  $$('button', tabs).forEach(b => { b.textContent = METODO[+b.dataset.i].nome[l] })
  $$('[data-grp-lbl]').forEach(s => { const g = groups.find(x => x.def.k === s.dataset.grpLbl); s.textContent = g.def.lbl[l] })
  setMethod(mIdx)
  document.title = l === 'en' ? 'PRISMA — Video production studio' : 'PRISMA — Studio di produzione video'
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)))
setLang(lang)

/* Header chiaro sulle sezioni scure */
$$('.system, .contact, .ftr').forEach(sec => ScrollTrigger.create({
  trigger: sec, start: 'top 40px', end: 'bottom 40px',
  onToggle: st => $('[data-hdr]').classList.toggle('is-dark', st.isActive),
}))

/* Titoli che salgono */
$$('[data-reveal]').forEach(el => {
  if (reduced) return
  gsap.fromTo(el.children, { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
})
gsap.fromTo('.studio__img img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.studio', start: 'top bottom', end: 'bottom top', scrub: true } })
gsap.fromTo('.fcard, .menu', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.formats__cards', start: 'top 85%' } })
gsap.fromTo('.ftr__mark', { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'bottom bottom', scrub: true } })

$('[data-year]').textContent = new Date().getFullYear()
