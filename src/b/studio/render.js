/* Studio micro: disegno del testo sul fotogramma (anteprima ed export usano la stessa funzione).
   Stesse regole dello studio di prisma-isabella: quadro 1080×1350, 10 font, 3 misure, 12 colori, ombra, 4 animazioni. */
export const FRAME_W = 1080
export const FRAME_H = 1350
export const SAFE = 0.06
const EDGE_PAD = 14

export const FONTS = [
  { id: 'instrument', name: 'Instrument', family: 'Instrument Serif', weight: 400, style: 'normal', ls: 0, lh: 1.1, opt: 1.06 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 500, style: 'italic', ls: 0, lh: 1.12, opt: 0.98 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 500, style: 'normal', ls: 0, lh: 1.1, opt: 1.04 },
  { id: 'bodoni', name: 'Bodoni', family: 'Bodoni Moda', weight: 500, style: 'normal', ls: 0, lh: 1.15, opt: 0.98 },
  { id: 'fraunces', name: 'Fraunces', family: 'Fraunces', weight: 400, style: 'normal', ls: 0, lh: 1.08, opt: 0.98 },
  { id: 'dmserif', name: 'DM Serif', family: 'DM Serif Display', weight: 400, style: 'normal', ls: 0, lh: 1.08, opt: 0.98 },
  { id: 'archivo', name: 'Archivo', family: 'Archivo', weight: 500, style: 'normal', ls: 0, lh: 1.14, opt: 0.94 },
  { id: 'manrope', name: 'Manrope', family: 'Manrope', weight: 600, style: 'normal', ls: 0, lh: 1.18, opt: 0.92 },
  { id: 'syne', name: 'Syne', family: 'Syne', weight: 600, style: 'normal', ls: 0, lh: 1.12, opt: 0.88 },
  { id: 'anton', name: 'Anton', family: 'Anton', weight: 400, style: 'normal', ls: 0.012, lh: 1.16, opt: 1.2, upper: true },
]
export const PALETTE = [
  { hex: '#FFFFFF', it: 'Bianco', en: 'White' }, { hex: '#F4EFE6', it: 'Avorio', en: 'Ivory' },
  { hex: '#E6DEDE', it: 'Cipria', en: 'Powder' }, { hex: '#D9C3A5', it: 'Sabbia', en: 'Sand' },
  { hex: '#B08D57', it: 'Oro', en: 'Gold' }, { hex: '#D89200', it: 'Ambra', en: 'Amber' },
  { hex: '#D6660B', it: 'Arancio', en: 'Orange' }, { hex: '#C63C11', it: 'Rosso', en: 'Red' },
  { hex: '#7A2E1E', it: 'Bordeaux', en: 'Burgundy' }, { hex: '#4A5A3C', it: 'Oliva', en: 'Olive' },
  { hex: '#22313F', it: 'Notte', en: 'Night' }, { hex: '#050203', it: 'Nero', en: 'Black' },
]
export const SIZES = [{ id: 's', target: 36 }, { id: 'm', target: 52 }, { id: 'l', target: 80 }]
export const ANIMS = [
  { id: 'none', it: 'Nessuna', en: 'None' }, { id: 'fade', it: 'Dissolvenza', en: 'Fade' },
  { id: 'rise', it: 'Sale', en: 'Rise' }, { id: 'words', it: 'Parola per parola', en: 'Word by word' },
]
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const defaultState = () => ({ text: '', font: 'instrument', size: 'm', color: '#F4EFE6', shadow: true, anim: 'fade', x: 0.5, y: 0.5 })
export function sanitizeState(s) {
  const d = defaultState()
  if (!s || typeof s !== 'object') return d
  return {
    text: typeof s.text === 'string' ? s.text.slice(0, 400) : d.text,
    font: FONTS.some(f => f.id === s.font) ? s.font : d.font,
    size: SIZES.some(z => z.id === s.size) ? s.size : d.size,
    color: PALETTE.some(c => c.hex === s.color) ? s.color : d.color,
    shadow: !!s.shadow,
    anim: ANIMS.some(a => a.id === s.anim) ? s.anim : d.anim,
    x: clamp(+s.x || d.x, 0, 1), y: clamp(+s.y || d.y, 0, 1),
  }
}

const fontOf = (id) => FONTS.find(f => f.id === id) || FONTS[0]
const fontCss = (f, px) => `${f.style === 'italic' ? 'italic ' : ''}${f.weight} ${px}px "${f.family}"`

let mctx = null
const metricsCache = new Map(), layoutCache = new Map()
function measureCtx() { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); return mctx }
function fontMetrics(f) {
  if (metricsCache.has(f.id)) return metricsCache.get(f.id)
  const c = measureCtx(); c.font = fontCss(f, 100)
  const cap = c.measureText('H').actualBoundingBoxAscent || 70
  const xh = c.measureText('x').actualBoundingBoxAscent || 50
  const m = { cap: cap / 100, x: xh / 100, visual: (f.upper ? cap : (cap + xh) / 2) / 100 }
  metricsCache.set(f.id, m); return m
}
export async function loadFonts() {
  await Promise.all(FONTS.map(f => document.fonts.load(fontCss(f, 64), 'AaHxÈàè—’').catch(() => {})))
  metricsCache.clear(); layoutCache.clear()
}

function prepText(t, f) {
  let s = (t || '').replace(/\r/g, '').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim())
  while (s.length && !s[0]) s.shift()
  while (s.length && !s[s.length - 1]) s.pop()
  s = s.join('\n')
  return f.upper ? s.toLocaleUpperCase('it-IT') : s
}
function setFont(c, f, px) { c.font = fontCss(f, px); if ('letterSpacing' in c) c.letterSpacing = `${(f.ls * px).toFixed(2)}px` }
function wrapParagraph(c, words, maxW) {
  const lines = []; let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (c.measureText(test).width <= maxW || !line) line = test
    else { lines.push(line); line = w }
  }
  if (line) lines.push(line)
  return lines
}
function balancedWrap(c, para, maxW) {
  const words = para.split(' ').filter(Boolean)
  if (!words.length) return ['']
  const base = wrapParagraph(c, words, maxW)
  if (base.length < 2) return base
  let lo = maxW * 0.4, hi = maxW, best = base
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2, t = wrapParagraph(c, words, mid)
    if (t.length <= base.length && t.every(l => c.measureText(l).width <= mid + 0.5)) { best = t; hi = mid } else lo = mid
  }
  return best
}
function layoutText(state) {
  const f = fontOf(state.font), size = SIZES.find(z => z.id === state.size) || SIZES[1]
  const text = prepText(state.text, f)
  const key = `${f.id}|${size.id}|${text}`
  if (layoutCache.has(key)) return layoutCache.get(key)
  const m = fontMetrics(f), c = measureCtx()
  const MAX_W = FRAME_W * 0.88, MAX_H = FRAME_H * 0.88
  let px = Math.round((size.target / m.visual) * f.opt * 10) / 10
  let lines = [], lineH = 0, widths = []
  for (let pass = 0; pass < 30; pass++) {
    setFont(c, f, px); lineH = px * f.lh
    lines = text.split('\n').flatMap(p => balancedWrap(c, p, MAX_W))
    widths = lines.map(l => c.measureText(l).width)
    if (Math.max(0, ...widths) <= MAX_W && lines.length * lineH <= MAX_H) break
    px *= 0.92
  }
  const out = { f, px, lineH, lines, widths, cap: m.cap * px, w: Math.max(0, ...widths) + px * 0.12, h: lines.length * lineH + px * 0.24, empty: !text }
  layoutCache.set(key, out)
  return out
}
function blockCenter(L, state) {
  const hw = L.w / 2, hh = L.h / 2
  return {
    cx: clamp(state.x * FRAME_W, hw + EDGE_PAD, FRAME_W - hw - EDGE_PAD),
    cy: clamp(state.y * FRAME_H, hh + EDGE_PAD, FRAME_H - hh - EDGE_PAD),
  }
}
/* riquadro del testo in frazioni del quadro (per trascinare e per le guide) */
export function textBox(state) {
  const L = layoutText(state)
  if (L.empty) return null
  const { cx, cy } = blockCenter(L, state)
  return { x: (cx - L.w / 2) / FRAME_W, y: (cy - L.h / 2) / FRAME_H, w: L.w / FRAME_W, h: L.h / FRAME_H, cx: cx / FRAME_W, cy: cy / FRAME_H }
}
export function clampPosition(state) {
  const L = layoutText(state)
  if (L.empty) return { x: state.x, y: state.y }
  const { cx, cy } = blockCenter(L, state)
  return { x: cx / FRAME_W, y: cy / FRAME_H }
}

const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const easeInOut = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p)
const ANIM_DELAY = 0.1
const prog = (t, start, dur) => clamp((t - start) / dur, 0, 1)
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

/* disegna il testo su ctx; scale = pixel per unità del quadro; t = secondi dall'inizio del video */
export function drawText(ctx, state, t, scale = 1) {
  const L = layoutText(state)
  if (L.empty) return
  const { f, px, lineH, lines, widths } = L
  const { cx, cy } = blockCenter(L, state)
  const top = cy - (lines.length * lineH) / 2
  let alpha = 1, dy = 0
  if (state.anim === 'fade') alpha = easeInOut(prog(t, ANIM_DELAY, 0.8))
  if (state.anim === 'rise') { const p = prog(t, ANIM_DELAY, 0.85); alpha = easeOut(Math.min(1, p * 1.5)); dy = (1 - easeOut(p)) * FRAME_H * 0.045 }
  ctx.save()
  ctx.scale(scale, scale)
  setFont(ctx, f, px)
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = state.color
  const words = state.anim === 'words' ? lines.map(l => l.split(' ')) : null
  const nWords = words ? words.reduce((a, l) => a + l.length, 0) : 0
  const stagger = nWords > 1 ? Math.min(0.14, 0.4 / (nWords - 1)) : 0
  const paint = () => {
    let wi = 0
    lines.forEach((line, i) => {
      const base = top + i * lineH + lineH / 2 + L.cap / 2
      const x0 = cx - widths[i] / 2
      if (!words) { ctx.globalAlpha = alpha; ctx.fillText(line, x0, base + dy); return }
      let x = x0
      const space = ctx.measureText(' ').width
      words[i].forEach((w) => {
        const p = prog(t, ANIM_DELAY + wi * stagger, 0.5)
        ctx.globalAlpha = easeOut(Math.min(1, p * 1.4))
        ctx.fillText(w, x, base + (1 - easeOut(p)) * px * 0.32)
        x += ctx.measureText(w).width + space; wi++
      })
    })
  }
  if (state.shadow) {
    const dark = luminance(state.color) < 0.18
    const layers = dark
      ? [{ c: 'rgba(244,239,230,.55)', b: 0.55, y: 0 }, { c: 'rgba(244,239,230,.35)', b: 0.14, y: 0 }]
      : [{ c: 'rgba(5,2,3,.42)', b: 0.5, y: 0.07 }, { c: 'rgba(5,2,3,.28)', b: 0.1, y: 0.025 }]
    const OFF = FRAME_W * 3
    layers.forEach(l => {
      ctx.save()
      ctx.shadowColor = l.c; ctx.shadowBlur = l.b * px * scale; ctx.shadowOffsetX = OFF * scale; ctx.shadowOffsetY = l.y * px * scale
      ctx.translate(-OFF, 0)
      paint()
      ctx.restore()
    })
  }
  paint()
  ctx.restore()
}
