import '@fontsource-variable/archivo/wdth.css'
import './styles/v2.css'
import { gsap } from 'gsap'
import { captureIT, getLang, applyLang, t } from './i18n.js'
import { ISABELLA } from './data.js'
import { createPlayer } from './player.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
const media = (id, f) => `/media/${id}/${f}`
const setH = () => document.documentElement.style.setProperty('--app-h', `${innerHeight}px`)
setH(); addEventListener('resize', setH)

captureIT()
let lang = getLang()
$$('[data-lang]').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; applyLang(lang) }))

const player = createPlayer($('[data-player]'), { reduced })
const items = []
const label = (kind, i) => `Isabella Pistillo — ${kind === 'short' ? t('cs.sh', lang) : kind === 'micro' ? t('cs.mi', lang) : 'Manifesto'} ${i ? String(i).padStart(2, '0') : ''}`.trim()
const add = (id, kind, i) => items.push({ id, kind, i, src: media(id, 'web.mp4'), poster: media(id, 'poster.jpg'), dl: `/originali/${id}.mp4` })
add('isabella-editoriale', 'ed', 0)

$$('[data-thumbs]').forEach(row => {
  const kind = row.dataset.thumbs, n = +row.dataset.n
  for (let i = 1; i <= n; i++) {
    const id = `isabella-${kind}-${i}`
    add(id, kind, i)
    const k = items.length - 1
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'cs__th'; b.dataset.k = k
    b.setAttribute('aria-label', label(kind, i))
    b.innerHTML = `<img src="${media(id, 'poster.jpg')}" alt="" loading="lazy" decoding="async" /><span class="mono">${String(i).padStart(2, '0')}</span>`
    row.append(b)
  }
})
const list = () => items.map(it => ({ ...it, title: label(it.kind, it.i) }))
document.addEventListener('click', (e) => {
  const th = e.target.closest('.cs__th')
  if (th) player.open(list(), +th.dataset.k)
  if (e.target.closest('[data-play-film]')) player.open(list(), 0)
})

// anteprima al passaggio
function preview(th, on) {
  const it = items[th.dataset.k]
  let v = th.querySelector('video')
  if (on) {
    if (!v) { v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.src = media(it.id, 'preview.mp4'); th.prepend(v) }
    v.currentTime = 0; v.play().then(() => th.classList.add('is-playing')).catch(() => {})
  } else if (v) { v.pause(); th.classList.remove('is-playing') }
}
if (fine) {
  document.addEventListener('pointerover', (e) => { const th = e.target.closest('.cs__th'); if (th && !th.contains(e.relatedTarget)) preview(th, true) })
  document.addEventListener('pointerout', (e) => { const th = e.target.closest('.cs__th'); if (th && !th.contains(e.relatedTarget)) preview(th, false) })
}

// riserva: 14 pronti + 24 in attesa
const bar = $('[data-res-bar]')
const tot = ISABELLA.potenziali.manifesto + ISABELLA.potenziali.brevi + ISABELLA.potenziali.micro
const on = ISABELLA.pronti.manifesto + ISABELLA.pronti.brevi + ISABELLA.pronti.micro
for (let i = 0; i < tot; i++) { const s = document.createElement('i'); if (i < on) s.className = 'is-on'; bar.append(s) }

// uscita con la scheggia
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-transition]')
  if (!a || e.metaKey || e.ctrlKey || reduced) return
  e.preventDefault()
  const sh = $('.shard'); sh.style.visibility = 'visible'
  gsap.fromTo(sh, { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%)' }, { clipPath: 'polygon(50% -170%, 270% 200%, -170% 200%)', duration: .8, ease: 'expo.inOut', onComplete: () => { location.href = a.href } })
})
addEventListener('pageshow', (e) => { if (e.persisted) $('.shard').style.visibility = 'hidden' })

applyLang(lang)

// arrivo: la scheggia si ritira, poi il contenuto entra
if (!reduced) {
  if (document.referrer.startsWith(location.origin)) {
    const sh = $('.shard'); sh.style.visibility = 'visible'
    gsap.fromTo(sh, { clipPath: 'polygon(50% -170%, 270% 200%, -170% 200%)' }, { clipPath: 'polygon(50% -30%, 50% -30%, 50% -30%)', duration: .9, ease: 'expo.inOut', onComplete: () => { sh.style.visibility = 'hidden' } })
  }
  gsap.from('.cs__film', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'expo.inOut', delay: .2, clearProps: 'clipPath' })
  gsap.from('.cs__body > *', { y: 14, opacity: 0, duration: .8, ease: 'power3.out', stagger: .05, delay: .45, clearProps: 'all' })
  gsap.from('.cs__bar i', { scaleY: 0, duration: .5, ease: 'expo.out', stagger: .015, delay: 1, clearProps: 'transform' })
}
