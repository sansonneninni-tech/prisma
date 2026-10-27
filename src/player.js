/* Lettore video a schermo intero, condiviso tra home e caso studio.
   items: [{ src, poster, title, dl }] */
import { gsap } from 'gsap'

const OPEN = 'polygon(50% -170%, 270% 200%, -170% 200%)'
const DOT = 'polygon(50% 50%, 50% 50%, 50% 50%)'

export function createPlayer(el, { reduced = false } = {}) {
  const v = el.querySelector('video')
  const title = el.querySelector('[data-pl-title]')
  const dl = el.querySelector('[data-pl-dl]')
  let items = [], idx = 0, lastFocus = null

  function show() {
    const it = items[idx]
    v.src = it.src
    v.poster = it.poster || ''
    v.muted = false
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
    title.textContent = it.title
    dl.href = it.dl
    dl.setAttribute('download', it.dl.split('/').pop())
  }
  function open(list, i = 0) {
    if (!list.length) return
    items = list; idx = i
    lastFocus = document.activeElement
    show()
    el.hidden = false
    document.body.classList.add('is-dark')
    gsap.fromTo(el, { clipPath: DOT }, { clipPath: OPEN, duration: reduced ? 0 : .8, ease: 'expo.inOut', clearProps: 'clipPath' })
    el.querySelector('[data-pl-close]').focus({ preventScroll: true })
  }
  function close() {
    v.pause()
    gsap.to(el, {
      opacity: 0, duration: reduced ? 0 : .3, onComplete: () => {
        el.hidden = true; gsap.set(el, { clearProps: 'opacity' })
        v.removeAttribute('src'); v.load()
        document.body.classList.remove('is-dark')
        lastFocus?.focus?.({ preventScroll: true })
      },
    })
  }
  const step = (d) => { idx = (idx + d + items.length) % items.length; show() }
  el.querySelector('[data-pl-close]').addEventListener('click', close)
  el.querySelector('[data-pl-prev]').addEventListener('click', () => step(-1))
  el.querySelector('[data-pl-next]').addEventListener('click', () => step(1))
  addEventListener('keydown', (e) => {
    if (el.hidden) return
    if (e.key === 'Escape') close()
    if (e.key === 'ArrowRight' && e.target !== v) step(1)
    if (e.key === 'ArrowLeft' && e.target !== v) step(-1)
  })
  return { open, close, get isOpen() { return !el.hidden } }
}
