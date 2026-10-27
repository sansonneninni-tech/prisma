/* Tetraedro regolare in CSS 3D: quattro facce triangolari equilatere.
   Ogni fotogramma ruota i vertici, calcola la matrice di ogni faccia
   e una luce semplice dalla normale. Niente WebGL, testo nitido. */

const S = Math.SQRT1_2
// vertici del tetraedro regolare centrato nell'origine (raggio 1)
const V0 = [
  [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
].map(v => v.map(c => c / Math.sqrt(3)))
// facce: indici dei vertici (ordine antiorario visto da fuori)
const F = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = a => mul(a, 1 / Math.hypot(...a))

function rot([x, y, z], ax, ay, az) {
  // rotazione X, poi Y, poi Z
  let c = Math.cos(ax), s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c]
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c]
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c]
  return [x, y, z]
}

export function initTetra(stage, { reduced = false } = {}) {
  const faces = [...stage.querySelectorAll('.tf')]
  const inner = stage.querySelector('.tetra__in')
  // ombreggiatura con un velo: cambia solo l'opacità (niente ridisegno)
  const shades = faces.map(f => { const d = document.createElement('i'); d.className = 'tf__sh'; f.prepend(d); return d })
  const lastLit = faces.map(() => -1), lastBack = faces.map(() => null)
  const LIGHT = norm([-0.45, -0.75, 0.6]) // dall'alto a sinistra, verso chi guarda (y in basso)
  let size = 300
  const st = { cx: 0, cy: 0, ax: -0.5, ay: 0.6, az: 0, mx: 0, my: 0, tx: 0, ty: 0, vy: 0.12, drag: null, spin: 0 }

  const measure = () => {
    size = stage.clientWidth
    faces.forEach(f => {
      f.style.width = `${size}px`
      f.style.height = `${size * Math.sqrt(3) / 2}px`
    })
  }
  measure()
  new ResizeObserver(measure).observe(stage)

  // mouse: leggera inclinazione
  addEventListener('pointermove', (e) => {
    st.tx = (e.clientX / innerWidth - 0.5)
    st.ty = (e.clientY / innerHeight - 0.5)
  }, { passive: true })

  // trascina per girarlo, con inerzia
  stage.addEventListener('pointerdown', (e) => {
    st.drag = { x: e.clientX, y: e.clientY, t: performance.now() }
    stage.setPointerCapture(e.pointerId)
    stage.classList.add('is-drag')
  })
  stage.addEventListener('pointermove', (e) => {
    if (!st.drag) return
    const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y
    st.ay += dx * 0.008; st.ax -= dy * 0.006
    st.spin = dx * 0.5
    st.drag.x = e.clientX; st.drag.y = e.clientY
  })
  const end = () => { st.drag = null; stage.classList.remove('is-drag') }
  stage.addEventListener('pointerup', end)
  stage.addEventListener('pointercancel', end)

  let last = performance.now(), running = true, raf = 0
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    if (!st.drag) {
      st.ay += (reduced ? 0.02 : st.vy) * dt + st.spin * dt
      st.spin *= Math.pow(0.04, dt)
    }
    st.mx += (st.tx - st.mx) * Math.min(1, dt * 3)
    st.my += (st.ty - st.my) * Math.min(1, dt * 3)
    const ax = st.ax + st.my * 0.35 + Math.sin(now / 3200) * 0.06
    const ay = st.ay + st.mx * 0.5
    const R = size / 2 * 1.06
    const v = V0.map(p => mul(rot(p, ax, ay, st.az), R))

    F.forEach((idx, i) => {
      // vertici della faccia: A in alto, B e C alla base (nel triangolo del div)
      const [A, B, C] = idx.map(k => v[k])
      const a = size, h = size * Math.sqrt(3) / 2
      const U = mul(sub(C, B), 1 / a)
      const Vv = mul(sub(mul(U, a / 2), sub(A, B)), 1 / h)
      const O = sub(B, mul(Vv, h))
      let N = norm(cross(U, Vv))
      // normale verso l'esterno
      const cen = mul(add(add(A, B), C), 1 / 3)
      if (dot(N, cen) < 0) N = mul(N, -1)
      const facing = N[2] // in CSS la z positiva viene verso chi guarda
      const lit = Math.max(0, dot(N, LIGHT))
      const el = faces[i]
      el.style.transform = `matrix3d(${U[0]},${U[1]},${U[2]},0,${Vv[0]},${Vv[1]},${Vv[2]},0,${N[0]},${N[1]},${N[2]},0,${O[0]},${O[1]},${O[2]},1)`
      const l = Math.round(lit * 50) / 50
      if (l !== lastLit[i]) { shades[i].style.opacity = (0.5 - l * 0.5).toFixed(2); lastLit[i] = l }
      const back = facing <= 0
      if (back !== lastBack[i]) { el.classList.toggle('is-back', back); lastBack[i] = back }
    })
    // centra la sagoma proiettata (non il baricentro), con morbidezza
    const P = 1400
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    v.forEach(([x, y, z]) => { const k = P / (P - z); x0 = Math.min(x0, x * k); x1 = Math.max(x1, x * k); y0 = Math.min(y0, y * k); y1 = Math.max(y1, y * k) })
    st.cx += (-(x0 + x1) / 2 - st.cx) * Math.min(1, dt * 4)
    st.cy += (-(y0 + y1) / 2 - st.cy) * Math.min(1, dt * 4)
    inner.style.transform = `translate3d(${st.cx.toFixed(1)}px, ${st.cy.toFixed(1)}px, 0)`
    if (running) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    pause() { running = false; cancelAnimationFrame(raf) },
    play() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame) } },
    kick(v = 6) { st.spin += v },
  }
}
