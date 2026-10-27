/* Parti comuni a tutte le pagine: scroll morbido, altezza reale su iOS,
   header, cursore, tendina tra le pagine. */

// Video originali (qualità piena) per il tasto "scarica originale"
export const mediaUrl = (id, file) => file === 'originale.mp4' ? `/originali/${id}.mp4` : `/media/${id}/${file}`

export function fmtEuro(n, lang = 'it') {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.')
  return lang === 'en' ? `€${s}` : `€ ${s}`
}

export function initCommon({ gsap, ScrollTrigger, Lenis, reduced, fine }) {
  const root = document.documentElement

  // Altezza reale dello schermo (iOS non è affidabile con 100vh)
  const setH = () => root.style.setProperty('--app-h', `${window.innerHeight}px`)
  setH()
  let lastW = innerWidth
  addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40 || !matchMedia('(pointer: coarse)').matches) { setH(); lastW = innerWidth } })
  addEventListener('orientationchange', () => setTimeout(setH, 300))

  // Scroll morbido
  let lenis = null
  if (!reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href')
        if (id.length < 2) return
        const el = document.querySelector(id)
        if (!el) return
        e.preventDefault()
        lenis.scrollTo(el, { offset: id === '#top' ? 0 : -10, duration: 1.6 })
      })
    })
  }

  // Header: si nasconde scendendo, torna risalendo
  const hdr = document.querySelector('[data-hdr]')
  if (hdr) {
    let lastY = 0
    const onScroll = () => {
      const y = window.scrollY
      hdr.classList.toggle('is-solid', y > 40)
      hdr.classList.toggle('is-hidden', y > lastY && y > innerHeight * .6)
      lastY = y
    }
    addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    // voce di menu attiva
    document.querySelectorAll('.hdr__nav a').forEach(a => {
      const sec = document.querySelector(a.getAttribute('href'))
      if (!sec) return
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: st => a.classList.toggle('is-active', st.isActive) })
    })
  }

  // Cursore
  const cursor = document.querySelector('.cursor')
  if (cursor && fine) {
    root.classList.add('has-cursor')
    const pos = { x: -100, y: -100 }, cur = { x: -100, y: -100 }
    addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY }, { passive: true })
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'))
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'))
    gsap.ticker.add(() => {
      cur.x += (pos.x - cur.x) * .22; cur.y += (pos.y - cur.y) * .22
      cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
    })
  }

  // Tendina tra le pagine: un triangolo che cresce
  const wipe = document.querySelector('.wipe')
  if (wipe && !reduced) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-transition]')
      if (!a || e.metaKey || e.ctrlKey || a.target === '_blank') return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      e.preventDefault()
      gsap.fromTo(wipe, { clipPath: 'polygon(50% 120%, 50% 120%, 50% 120%)' }, {
        clipPath: 'polygon(50% -150%, 250% 130%, -150% 130%)', duration: .9, ease: 'expo.inOut',
        onComplete: () => { location.href = url.href },
      })
    })
    // in arrivo: il triangolo si ritira
    if (sessionStorage.getItem('prisma-wipe') === '1' || document.referrer.startsWith(location.origin)) {
      gsap.fromTo(wipe, { clipPath: 'polygon(50% -150%, 250% 130%, -150% 130%)' }, { clipPath: 'polygon(50% -20%, 50% -20%, 50% -20%)', duration: 1, ease: 'expo.inOut', delay: .05 })
    }
    addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(wipe, { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%)' }) })
  }

  return { lenis }
}
