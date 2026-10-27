import '@fontsource/archivo/300.css'
import '@fontsource/archivo/400.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import './styles/base.css'
import './styles/sections.css'
import './styles/case.css'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { applyLang, captureIT, getLang } from './i18n.js'
import { initCommon, mediaUrl } from './common.js'

gsap.registerPlugin(ScrollTrigger)
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches

captureIT()
initCommon({ gsap, ScrollTrigger, Lenis, reduced, fine })

// tessere video di short e micro
$$('[data-tiles]').forEach(row => {
  const kind = row.dataset.tiles, n = +row.dataset.n
  for (let i = 1; i <= n; i++) {
    const id = `isabella-${kind}-${i}`
    const f = document.createElement('figure')
    f.className = 'cs-tile'
    f.innerHTML = `<div class="cs-tile__m"><img src="${mediaUrl(id, 'poster.jpg')}" alt="" loading="lazy" /><video muted playsinline loop preload="none" src="${mediaUrl(id, 'web.mp4')}" data-autoplay></video></div>
      <figcaption><span>${String(i).padStart(2, '0')}</span><a href="${mediaUrl(id, 'originale.mp4')}" download aria-label="Scarica originale ${i}">↓ MP4</a></figcaption>`
    row.appendChild(f)
  }
})

const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()), { threshold: .2 })
$$('[data-autoplay]').forEach(v => io.observe(v))

// barra della riserva: 14 pronti + 24 in attesa
const bar = $('[data-res-bar]')
for (let i = 0; i < 38; i++) { const s = document.createElement('i'); if (i < 14) s.className = 'is-on'; bar.appendChild(s) }

// lingua
$$('[data-lang]').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)))
applyLang(getLang())
$('[data-year]').textContent = new Date().getFullYear()

if (!reduced) {
  gsap.fromTo('.cs-hero__t', { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, ease: 'expo.out', delay: .3 })
  gsap.to('.cs-hero__v', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.cs-hero', start: 'top top', end: 'bottom top', scrub: true } })
  $$('[data-count]').forEach(el => {
    const o = { v: 0 }, end = +el.dataset.count
    gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' }, onUpdate: () => { el.textContent = Math.round(o.v) } })
  })
  gsap.fromTo('.cs-res__bar i', { scaleY: 0 }, { scaleY: 1, duration: .6, stagger: .025, ease: 'expo.out', scrollTrigger: { trigger: '.cs-res', start: 'top 75%' } })
  $$('.cs-tile').forEach((t, i) => gsap.fromTo(t, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: (i % 5) * .06, scrollTrigger: { trigger: t, start: 'top 92%' } }))
}
