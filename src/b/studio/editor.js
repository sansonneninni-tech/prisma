/* Studio micro: l'editor a tutto schermo. Scrivi sul micro, scegli font, misura, colore, ombra, animazione,
   trascina il testo (si aggancia al centro e ai margini) e scarica l'MP4 con l'audio originale. */
import { FONTS, PALETTE, SIZES, ANIMS, SAFE, FRAME_W, FRAME_H, drawText, textBox, clampPosition, defaultState, sanitizeState, loadFonts, clamp } from './render.js'
import { exportVideo, canExport, ExportCanceled } from './export.js'

const KEY = (n) => `prisma-micro-${n}`
export const store = {
  get(n) { try { return sanitizeState(JSON.parse(localStorage.getItem(KEY(n)))) } catch { return defaultState() } },
  set(n, s) { try { localStorage.setItem(KEY(n), JSON.stringify(s)) } catch { } },
  clear(n) { try { localStorage.removeItem(KEY(n)) } catch { } },
}

const TX = {
  it: {
    close: '← Torna al caso', closeS: '← Caso', title: 'Micro', of: 'di', reset: 'Ricomincia', sure: 'Sicura? Tocca ancora', text: 'Testo', ph: 'Scrivi qui il tuo testo', done: 'Fatto',
    font: 'Font', size: 'Misura', color: 'Colore', shadow: 'Ombra', no: 'No', yes: 'Sì', anim: 'Animazione', pos: 'Posizione', center: 'Centra',
    hint: 'Trascina il testo sul video', save: 'Scarica il video', note: 'MP4 1080×1350 con l’audio originale',
    noexp: 'Per scaricare il video aggiorna Chrome o Safari.', sound: 'Audio', exp: 'Preparo il video', cancel: 'Annulla',
    share: 'Salva video', ready: 'Il video è pronto', again: 'Scarica di nuovo', back: 'Torna al micro', err: 'Non è andata. Riprova.',
    write: 'Scrivi qui', prev: 'Micro precedente', next: 'Micro successivo',
  },
  en: {
    close: '← Back to the case', closeS: '← Case', title: 'Micro', of: 'of', reset: 'Start over', sure: 'Sure? Tap again', text: 'Text', ph: 'Write your text here', done: 'Done',
    font: 'Font', size: 'Size', color: 'Colour', shadow: 'Shadow', no: 'No', yes: 'Yes', anim: 'Animation', pos: 'Position', center: 'Centre',
    hint: 'Drag the text on the video', save: 'Download the video', note: 'MP4 1080×1350 with the original audio',
    noexp: 'To download the video, update Chrome or Safari.', sound: 'Sound', exp: 'Preparing the video', cancel: 'Cancel',
    share: 'Save video', ready: 'Your video is ready', again: 'Download again', back: 'Back to the micro', err: 'That didn’t work. Try again.',
    write: 'Write here', prev: 'Previous micro', next: 'Next micro',
  },
}
const GUIDE = '#D6660B'
const isTouch = () => matchMedia('(hover: none)').matches

export function createEditor({ items, lang = () => 'it', onClose = () => {} }) {
  const L = () => TX[lang()] || TX.it
  const root = document.createElement('div')
  root.className = 'se'; root.hidden = true
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true')
  document.body.append(root)
  let i = 0, state = defaultState(), dragging = false, guides = { x: false, y: false }, raf = 0, focusBack = null, ac = null, fontsReady = false

  function build() {
    const t = L()
    root.setAttribute('aria-label', `${t.title} — Isabella Pistillo`)
    root.innerHTML = `
      <header class="se__bar">
        <button type="button" class="se__close" data-x><span class="se__cl">${t.close}</span><span class="se__cs" aria-hidden="true">${t.closeS}</span></button>
        <div class="se__nav">
          <button type="button" class="se__arrow" data-step="-1" aria-label="${t.prev}">←</button>
          <p class="se__title">${t.title} <b data-num></b> <span data-count></span></p>
          <button type="button" class="se__arrow" data-step="1" aria-label="${t.next}">→</button>
        </div>
        <button type="button" class="se__reset" data-reset>${t.reset}</button>
      </header>
      <div class="se__body">
        <div class="se__stage" data-stage>
          <div class="se__frame" data-frame>
            <video class="se__video" muted playsinline loop preload="auto"></video>
            <canvas class="se__canvas" data-cv></canvas>
            <button type="button" class="se__sound" data-sound aria-pressed="false">${t.sound} <span data-snd>off</span></button>
            <div class="se__time"><i data-time></i></div>
          </div>
        </div>
        <div class="se__panel">
          <div class="se__scroll">
            <section class="se__sec"><div class="se__head"><p class="se__k">${t.text}</p><button type="button" class="se__done" data-done hidden>${t.done}</button></div>
              <textarea class="se__text" data-text rows="3" maxlength="400" placeholder="${t.ph}"></textarea></section>
            <section class="se__sec"><p class="se__k">${t.font}</p><div class="se__fonts" role="radiogroup" aria-label="${t.font}">
              ${FONTS.map(f => `<button type="button" role="radio" class="se__font" data-font="${f.id}" title="${f.name}" aria-label="${f.name}" style="font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style}">${f.upper ? 'AA' : 'Aa'}<small>${f.name}</small></button>`).join('')}</div></section>
            <section class="se__sec se__two">
              <div><p class="se__k">${t.size}</p><div class="se__seg" role="radiogroup" aria-label="${t.size}">${SIZES.map(z => `<button type="button" role="radio" class="se__opt se__size--${z.id}" data-size="${z.id}">${z.id.toUpperCase()}</button>`).join('')}</div></div>
              <div><p class="se__k">${t.shadow}</p><button type="button" role="switch" class="se__switch" data-shadow><i></i><span data-sh></span></button></div>
            </section>
            <section class="se__sec"><p class="se__k">${t.color}</p><div class="se__colors" role="radiogroup" aria-label="${t.color}">
              ${PALETTE.map(c => `<button type="button" role="radio" class="se__color" data-color="${c.hex}" style="--c:${c.hex}" aria-label="${c[lang()] || c.it}" title="${c[lang()] || c.it}"></button>`).join('')}</div></section>
            <section class="se__sec"><p class="se__k">${t.anim}</p><div class="se__seg se__anims" role="radiogroup" aria-label="${t.anim}">
              ${ANIMS.map(a => `<button type="button" role="radio" class="se__opt" data-anim="${a.id}">${a[lang()] || a.it}</button>`).join('')}</div></section>
            <section class="se__sec se__pos"><div class="se__head"><p class="se__k">${t.pos}</p><button type="button" class="se__pill" data-center>${t.center}</button></div>
              <p class="se__hint">${t.hint}</p></section>
          </div>
          <div class="se__actions">
            <button type="button" class="btn se__save" data-save>${t.save} ↓</button>
            <p class="se__note" data-note>${canExport() ? t.note : t.noexp}</p>
          </div>
        </div>
      </div>
      <div class="se__export" data-exp hidden>
        <div class="se__card">
          <p class="se__k" data-exp-k>${t.exp}</p>
          <div class="se__progress"><i data-prog></i></div>
          <p class="se__pct" data-pct>0%</p>
          <div class="se__btns" data-exp-btns></div>
        </div>
      </div>`
    wire()
  }
  const $ = (s) => root.querySelector(s)
  const $$ = (s) => [...root.querySelectorAll(s)]
  let video, cv, ctx, frame

  function wire() {
    video = $('.se__video'); cv = $('[data-cv]'); ctx = cv.getContext('2d'); frame = $('[data-frame]')
    $('[data-x]').addEventListener('click', () => close())
    $$('[data-step]').forEach(b => b.addEventListener('click', () => go(i + +b.dataset.step)))
    const ta = $('[data-text]')
    ta.addEventListener('input', () => { state.text = ta.value; commit(); $('[data-done]').hidden = false })
    ta.addEventListener('blur', () => { $('[data-done]').hidden = true })
    $('[data-done]').addEventListener('mousedown', (e) => e.preventDefault())
    $('[data-done]').addEventListener('click', () => ta.blur())
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-font],[data-size],[data-color],[data-anim]')
      if (!b) return
      if (b.dataset.font) state.font = b.dataset.font
      if (b.dataset.size) state.size = b.dataset.size
      if (b.dataset.color) state.color = b.dataset.color
      if (b.dataset.anim) { state.anim = b.dataset.anim; restart() }
      Object.assign(state, clampPosition(state)); commit()
    })
    $('[data-shadow]').addEventListener('click', () => { state.shadow = !state.shadow; commit() })
    $('[data-center]').addEventListener('click', (e) => { const b = e.currentTarget; state.x = 0.5; state.y = 0.5; commit(); b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 700) })
    const rs = $('[data-reset]'); let rsT = 0
    rs.addEventListener('click', () => {
      if (!rs.classList.contains('is-confirm')) { rs.classList.add('is-confirm'); rs.textContent = L().sure; clearTimeout(rsT); rsT = setTimeout(() => { rs.classList.remove('is-confirm'); rs.textContent = L().reset }, 3200); return }
      clearTimeout(rsT); rs.classList.remove('is-confirm'); rs.textContent = L().reset
      store.clear(items[i].n); state = defaultState(); sync(); restart()
    })
    $('[data-sound]').addEventListener('click', () => { video.muted = !video.muted; syncSound() })
    $('[data-save]').addEventListener('click', doExport)
    new ResizeObserver(sizeCanvas).observe(frame)
    // trascinamento con aggancio
    let start = null
    cv.addEventListener('pointerdown', (e) => {
      const box = textBox(state), r = cv.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
      start = { x: e.clientX, y: e.clientY, t: performance.now(), px, py }
      if (!box) return
      const padX = Math.max(0.035, 22 / r.width), padY = Math.max(0.03, 22 / r.height)
      if (px < box.x - padX || px > box.x + box.w + padX || py < box.y - padY || py > box.y + box.h + padY) return
      dragging = { dx: px - box.cx, dy: py - box.cy, r }
      cv.setPointerCapture(e.pointerId); frame.classList.add('is-drag'); e.preventDefault()
    })
    cv.addEventListener('pointermove', (e) => {
      if (!dragging) return
      const { r } = dragging
      let x = (e.clientX - r.left) / r.width - dragging.dx, y = (e.clientY - r.top) / r.height - dragging.dy
      const tx = Math.max(0.012, 10 / r.width), ty = Math.max(0.010, 10 / r.height)
      const was = guides.x || guides.y
      guides = { x: Math.abs(x - 0.5) < tx, y: Math.abs(y - 0.5) < ty }
      if (guides.x) x = 0.5
      if (guides.y) y = 0.5
      const box = textBox(state)
      if (box && !guides.x) { if (Math.abs(x - box.w / 2 - SAFE) < tx) x = SAFE + box.w / 2; if (Math.abs(x + box.w / 2 - (1 - SAFE)) < tx) x = 1 - SAFE - box.w / 2 }
      if (box && !guides.y) { if (Math.abs(y - box.h / 2 - SAFE) < ty) y = SAFE + box.h / 2; if (Math.abs(y + box.h / 2 - (1 - SAFE)) < ty) y = 1 - SAFE - box.h / 2 }
      if (!was && (guides.x || guides.y)) navigator.vibrate?.(6)
      state.x = clamp(x, 0, 1); state.y = clamp(y, 0, 1)
      Object.assign(state, clampPosition(state))
    })
    const end = (e) => {
      if (dragging) { dragging = false; guides = { x: false, y: false }; frame.classList.remove('is-drag'); commit(); return }
      if (!start) return
      const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = performance.now() - start.t
      if (Math.abs(dx) > 48 && Math.abs(dx) > 1.4 * Math.abs(dy) && dt < 700) go(i + (dx < 0 ? 1 : -1))
      else if (Math.hypot(dx, dy) < 8 && !state.text) $('[data-text]').focus()
      start = null
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end)
  }
  function sizeCanvas() {
    const r = frame.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3)
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr)
  }
  function draw() {
    raf = requestAnimationFrame(draw)
    if (!cv.width) return
    const s = cv.width / FRAME_W
    ctx.clearRect(0, 0, cv.width, cv.height)
    if (!state.text.trim()) {
      // segnaposto: "Scrivi qui"
      ctx.save(); ctx.scale(s, s)
      const w = 300, h = 84, x = state.x * FRAME_W - w / 2, y = state.y * FRAME_H - h / 2
      ctx.fillStyle = 'rgba(239,237,233,.82)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill()
      ctx.fillStyle = '#0B0A0A'; ctx.font = '500 30px "Archivo Variable", Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(L().write, x + w / 2, y + h / 2 + 1); ctx.restore()
    } else drawText(ctx, state, dragging ? 99 : video.currentTime, s)
    if (dragging) {
      ctx.save(); ctx.strokeStyle = GUIDE; ctx.lineWidth = 1; ctx.setLineDash([6, 5])
      if (guides.x) { ctx.beginPath(); ctx.moveTo(cv.width / 2, 0); ctx.lineTo(cv.width / 2, cv.height); ctx.stroke() }
      if (guides.y) { ctx.beginPath(); ctx.moveTo(0, cv.height / 2); ctx.lineTo(cv.width, cv.height / 2); ctx.stroke() }
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(214,102,11,.5)'
      ctx.strokeRect(SAFE * cv.width, SAFE * cv.height, (1 - 2 * SAFE) * cv.width, (1 - 2 * SAFE) * cv.height)
      ctx.restore()
    }
    const tEl = $('[data-time]')
    if (tEl && video.duration) tEl.style.transform = `scaleX(${video.currentTime / video.duration})`
  }
  function sync() {
    $('[data-text]').value = state.text
    $$('[data-font]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.font === state.font)))
    $$('[data-size]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.size === state.size)))
    $$('[data-color]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.color === state.color)))
    $$('[data-anim]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.anim === state.anim)))
    const sw = $('[data-shadow]'); sw.setAttribute('aria-checked', String(state.shadow)); $('[data-sh]').textContent = state.shadow ? L().yes : L().no
    $('[data-num]').textContent = String(items[i].n).padStart(2, '0')
    $('[data-count]').textContent = `${L().of} ${String(items.length).padStart(2, '0')}`
  }
  function syncSound() { const b = $('[data-sound]'); b.setAttribute('aria-pressed', String(!video.muted)); $('[data-snd]').textContent = video.muted ? 'off' : 'on' }
  function commit() { store.set(items[i].n, state); sync() }
  function restart() { try { video.currentTime = 0 } catch { } video.play().catch(() => {}) }
  function load() {
    const it = items[i]
    state = store.get(it.n)
    video.poster = it.poster; video.src = it.src
    restart(); sync()
  }
  function go(n) {
    i = (n + items.length) % items.length
    frame.classList.remove('is-switch'); void frame.offsetWidth; frame.classList.add('is-switch')
    load()
  }
  function onKey(e) {
    if (root.hidden) return
    if (e.key === 'Escape') {
      /* l'Esc chiude solo l'editor, non il caso sotto */
      e.stopPropagation(); e.preventDefault()
      const exp = $('[data-exp]')
      if (!exp.hidden) { if (busy) ac?.abort(); else { exp.hidden = true; video.play().catch(() => {}) } return }
      close(); return
    }
    if (e.target.closest?.('textarea')) return
    if (e.key === 'ArrowRight') go(i + 1)
    if (e.key === 'ArrowLeft') go(i - 1)
    if (e.key === 'Tab') {
      const exp = $('[data-exp]')
      const f = $$(exp.hidden ? 'button, textarea' : '[data-exp] button').filter(el => el.offsetParent !== null && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden')
      const k = f.indexOf(document.activeElement)
      if (k < 0) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0])?.focus() } else if (e.shiftKey && k === 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
  }
  addEventListener('keydown', onKey, true)
  /* il tasto indietro (e il gesto su Android) chiude l'editor e torna al caso */
  let pushed = false, busy = false
  addEventListener('popstate', () => { if (!root.hidden && pushed) { pushed = false; close(true) } })

  async function doExport() {
    if (!canExport()) return
    const it = items[i], snap = { ...state }
    const exp = $('[data-exp]'), prog = $('[data-prog]'), pct = $('[data-pct]'), btns = $('[data-exp-btns]'), k = $('[data-exp-k]')
    const t = L()
    exp.hidden = false; k.textContent = t.exp; prog.style.transform = 'scaleX(0)'; pct.textContent = '0%'
    btns.innerHTML = `<button type="button" class="se__pill" data-cancel>${t.cancel}</button>`
    ac = new AbortController(); busy = true
    btns.querySelector('[data-cancel]').addEventListener('click', () => ac.abort())
    video.pause()
    try {
      if (!fontsReady) { await loadFonts(); fontsReady = true }
      const blob = await exportVideo({ url: it.original, state: snap, signal: ac.signal, onProgress: (p) => { prog.style.transform = `scaleX(${p})`; pct.textContent = `${Math.round(p * 100)}%` } })
      busy = false
      const name = `Isabella-Micro-${it.n}.mp4`
      const file = new File([blob], name, { type: 'video/mp4' })
      k.textContent = t.ready
      const dl = () => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000) }
      if (isTouch() && navigator.canShare?.({ files: [file] })) {
        btns.innerHTML = `<button type="button" class="btn" data-share>${t.share}</button><button type="button" class="se__pill" data-back>${t.back}</button>`
        btns.querySelector('[data-share]').addEventListener('click', async () => { try { await navigator.share({ files: [file] }) } catch (e) { if (e.name !== 'AbortError') dl() } })
      } else {
        dl()
        btns.innerHTML = `<button type="button" class="btn" data-again>${t.again} ↓</button><button type="button" class="se__pill" data-back>${t.back}</button>`
        btns.querySelector('[data-again]').addEventListener('click', dl)
      }
      btns.querySelector('[data-back]').addEventListener('click', () => { exp.hidden = true; video.play().catch(() => {}) })
      btns.querySelector('button')?.focus()
    } catch (e) {
      busy = false
      if (e instanceof ExportCanceled) { exp.hidden = true; video.play().catch(() => {}); return }
      console.error(e)
      k.textContent = t.err
      btns.innerHTML = `<button type="button" class="se__pill" data-back>${t.back}</button>`
      btns.querySelector('[data-back]').addEventListener('click', () => { exp.hidden = true; video.play().catch(() => {}) })
    }
  }

  function open(n) {
    focusBack = document.activeElement
    build()
    root.hidden = false; document.body.classList.add('is-se')
    sizeCanvas()
    i = Math.max(0, items.findIndex(it => it.n === n))
    load(); syncSound()
    cancelAnimationFrame(raf); draw()
    loadFonts().then(() => { fontsReady = true })
    $('[data-x]').focus({ preventScroll: true })
    history.pushState({ se: 1 }, '', location.hash); pushed = true
  }
  /* quiet: chi chiama gestisce la cronologia; restituisce se c'era un passo da togliere */
  function close(quiet = false) {
    if (root.hidden) return false
    const had = pushed; pushed = false
    if (had && !quiet) history.back()
    ac?.abort()
    cancelAnimationFrame(raf)
    video.pause(); video.removeAttribute('src'); video.load()
    root.hidden = true; document.body.classList.remove('is-se')
    onClose()
    focusBack?.focus?.({ preventScroll: true })
    return had
  }
  return { open, close, get isOpen() { return !root.hidden } }
}
