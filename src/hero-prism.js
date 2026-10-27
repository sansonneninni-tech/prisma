/* =========================================================
   HERO — un prisma di vetro (raymarching) che rifrange i video.
   Un raggio entra da sinistra, il prisma ruota, esce un ventaglio
   caldo dentro cui scorrono i nostri lavori.
   ========================================================= */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform sampler2D uVideo;
uniform vec2 uVideoRes;
uniform float uHasVideo;
uniform float uIntro;
uniform float uScroll;
uniform vec2 uCenter;
uniform float uR;
uniform float uSpin;

const vec3 BG = vec3(0.902, 0.871, 0.871);
const vec3 INK = vec3(0.02, 0.008, 0.012);
const vec3 C1 = vec3(0.776, 0.235, 0.067);
const vec3 C2 = vec3(0.933, 0.259, 0.071);
const vec3 C3 = vec3(0.839, 0.400, 0.043);
const vec3 C4 = vec3(0.973, 0.714, 0.141);

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 spectrum(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(C1, C2, smoothstep(0.0, 0.33, t));
  c = mix(c, C3, smoothstep(0.33, 0.66, t));
  c = mix(c, C4, smoothstep(0.66, 1.0, t));
  return c;
}

/* Campiona il video riempiendo lo schermo (object-fit: cover) */
vec3 video(vec2 uv){
  vec2 s = uRes / uVideoRes;
  float k = max(s.x, s.y);
  vec2 sz = uVideoRes * k / uRes;
  vec2 v = (uv - 0.5) / sz + 0.5;
  v = clamp(v, 0.001, 0.999);
  vec3 c = texture2D(uVideo, vec2(v.x, 1.0 - v.y)).rgb;
  return mix(vec3(0.15, 0.1, 0.09), c, uHasVideo);
}

/* Prisma triangolare visto di fronte: il triangolo del logo, con profondità */
float sdPrism(vec3 p){
  p.xz *= rot(sin(uSpin) * 0.62 + uMouse.x * 0.35);
  p.yz *= rot(cos(uSpin * 0.73) * 0.22 - uMouse.y * 0.25);
  p.xy *= rot(sin(uSpin * 0.41) * 0.06);
  p.y += 0.12;
  vec3 a = abs(p);
  float h = 1.32;
  return max(a.z - 0.42, max(a.x * 0.866025 + p.y * 0.5, -p.y) - h * 0.5) - 0.02;
}

vec3 nrm(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    sdPrism(p + e.xyy) - sdPrism(p - e.xyy),
    sdPrism(p + e.yxy) - sdPrism(p - e.yxy),
    sdPrism(p + e.yyx) - sdPrism(p - e.yyx)));
}

float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;

  vec3 col = BG;
  // grana leggera e vignetta morbida
  col *= 1.0 - 0.06 * smoothstep(0.4, 1.2, length(p * vec2(0.8, 1.0)));

  vec2 c = uCenter;
  float R = uR * mix(0.6, 1.0, smoothstep(0.0, 0.5, uIntro));

  /* ---- ventaglio rifratto ---- */
  vec2 O = c + vec2(R * 0.30, -R * 0.02);
  float open = smoothstep(0.35, 1.0, uIntro);
  float spread = mix(0.02, 0.95, open) + uScroll * 2.4;
  float mid = -0.42 + uMouse.y * 0.14 - uScroll * 0.2;
  float a0 = mid - spread * 0.5;
  float a1 = mid + spread * 0.5;
  vec2 v = p - O;
  float ang = atan(v.y, v.x);
  float t = (ang - a0) / (a1 - a0);
  float len = length(v);
  float fan = smoothstep(0.0, 0.035, t) * smoothstep(1.0, 0.965, t);
  fan *= smoothstep(R * 0.2, R * 1.3, len);
  if (fan > 0.001){
    vec3 tint = spectrum(t);
    vec2 dir = vec2(cos(ang), sin(ang));
    float disp = 0.004 + len * 0.012;
    vec3 vc;
    vc.r = video(uv + dir * disp).r;
    vc.g = video(uv).g;
    vc.b = video(uv - dir * disp).b;
    // bande sottili tra i colori dello spettro
    float bands = 0.92 + 0.08 * smoothstep(0.0, 0.02, abs(fract(t * 6.0) - 0.5) - 0.47);
    vec3 lit = vc * mix(vec3(1.0), tint * 1.55, 0.55) * bands;
    lit = mix(lit, tint, 0.12);
    col = mix(col, lit, fan * 0.97);
  }

  /* ---- raggio entrante: una linea nera da 2px ---- */
  float beamLen = smoothstep(0.0, 0.45, uIntro);
  vec2 S = vec2(-asp * 0.5 - 0.05, c.y + R * 0.75 + uMouse.y * 0.05);
  vec2 E = c + vec2(-R * 0.30, R * 0.02);
  vec2 Ecur = mix(S, E, beamLen);
  float d = segDist(p, S, Ecur);
  float px = 1.0 / uRes.y;
  float core = 1.0 - smoothstep(px * 0.9, px * 2.2, d);
  float glow = exp(-d * 220.0) * 0.25;
  col = mix(col, INK, core * (1.0 - uScroll));
  col += vec3(1.0, 0.6, 0.3) * glow * (1.0 - uScroll) * 0.4;

  /* ---- il prisma ---- */
  vec2 q = (p - c);
  if (length(q) < R * 1.9 && uIntro > 0.01){
    float k = 1.0 / (3.6 * R);
    vec3 ro = vec3(0.0, 0.0, 3.6);
    vec3 rd = normalize(vec3(q * k * 3.6 / 3.6, -1.0));
    rd = normalize(vec3(q / R * 0.27, -1.0));
    float tt = 0.0; bool hit = false; vec3 pos; float dmin = 9.0; vec3 pmin = ro;
    for (int i = 0; i < 72; i++){
      pos = ro + rd * tt;
      float dd = sdPrism(pos);
      if (dd < dmin){ dmin = dd; pmin = pos; }
      if (dd < 0.001){ hit = true; break; }
      tt += dd;
      if (tt > 8.0) break;
    }
    float pxw = 2.2 / (uR * uRes.y) * 0.27;
    float cov = hit ? 1.0 : 1.0 - smoothstep(0.0, pxw, dmin);
    if (!hit && cov > 0.0){ hit = true; pos = pmin; }
    if (hit){
      vec3 n = nrm(pos);
      float fres = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 r1 = refract(rd, n, 1.0 / 1.48);
      // attraversa il vetro
      vec3 ip = pos + r1 * 0.03;
      float ti = 0.0;
      for (int j = 0; j < 32; j++){
        float dd = -sdPrism(ip + r1 * ti);
        if (dd < 0.001) break;
        ti += max(dd, 0.01);
      }
      vec3 ep = ip + r1 * ti;
      vec3 n2 = -nrm(ep);
      vec3 rr = refract(r1, n2, 1.44); if (dot(rr, rr) < 0.01) rr = reflect(r1, n2);
      vec3 rg = refract(r1, n2, 1.48); if (dot(rg, rg) < 0.01) rg = reflect(r1, n2);
      vec3 rb = refract(r1, n2, 1.53); if (dot(rb, rb) < 0.01) rb = reflect(r1, n2);
      // proietta sul "piano video" dietro il prisma
      vec2 base = c / vec2(asp, 1.0) + 0.5;
      vec3 inside;
      inside.r = video(base + rr.xy * 0.32 + ep.xy * 0.18).r;
      inside.g = video(base + rg.xy * 0.32 + ep.xy * 0.18).g;
      inside.b = video(base + rb.xy * 0.32 + ep.xy * 0.18).b;
      inside = mix(inside, inside * vec3(1.08, 0.98, 0.86), 0.5);
      // spigoli luminosi
      float edge = smoothstep(0.55, 0.98, 1.0 - abs(dot(n, normalize(vec3(0.3, 0.6, 0.8)))));
      vec3 glass = mix(inside, BG, 0.10) * (0.95 - fres * 0.3) + fres * vec3(1.0, 0.97, 0.94) * 0.9;
      glass += spectrum(fract(dot(n, vec3(0.5, 0.3, 0.2)) + uTime * 0.03)) * fres * 0.45;
      glass += edge * 0.10;
      float rim = smoothstep(0.82, 1.0, 1.0 - abs(dot(n, rd)));
      glass = mix(glass, vec3(1.0), rim * 0.35);
      float a = smoothstep(0.0, 0.35, uIntro) * cov;
      col = mix(col, glass, a);
    }
  }

  // grana pellicola
  col += (hash(frag + fract(uTime) * 100.0) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`

export function initHeroPrism({ canvas, getVideo, onFail, reduced }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
  if (!gl) { onFail?.(); return null }

  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null }
    return s
  }
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) { onFail?.(); return null }
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { onFail?.(); return null }
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const U = {}
  ;['uRes', 'uTime', 'uMouse', 'uVideo', 'uVideoRes', 'uHasVideo', 'uIntro', 'uScroll', 'uCenter', 'uR', 'uSpin'].forEach(n => { U[n] = gl.getUniformLocation(prog, n) })

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 30, 28, 255]))
  gl.uniform1i(U.uVideo, 0)

  const state = {
    intro: 0, scroll: 0,
    mouse: { x: 0, y: 0 }, target: { x: 0, y: 0 },
    spin: 0.6, spinVel: 0,
    hasVideo: 0, vw: 16, vh: 9,
    running: true, visible: true,
  }

  let W = 0, H = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, W < 800 ? 1.5 : 1.35)
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr))
    canvas.width = W; canvas.height = H
    gl.viewport(0, 0, W, H)
  }
  resize()
  window.addEventListener('resize', resize)

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    state.target.x = ((e.clientX - r.left) / r.width) * 2 - 1
    state.target.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  // Inclinazione del telefono
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return
    state.target.x = Math.max(-1, Math.min(1, e.gamma / 30))
    state.target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 40))
  }, { passive: true })

  const io = new IntersectionObserver(([en]) => { state.visible = en.isIntersecting }, { threshold: 0 })
  io.observe(canvas)

  let last = performance.now(), t0 = last
  const frame = (now) => {
    if (!state.running) return
    requestAnimationFrame(frame)
    if (!state.visible) return
    const dt = Math.min(0.05, (now - last) / 1000); last = now
    state.mouse.x += (state.target.x - state.mouse.x) * Math.min(1, dt * 3)
    state.mouse.y += (state.target.y - state.mouse.y) * Math.min(1, dt * 3)
    state.spin += dt * (reduced ? 0 : 0.45) + state.spinVel * dt
    state.spinVel *= Math.pow(0.04, dt)

    const vid = getVideo?.()
    if (vid && vid.readyState >= 2 && vid.videoWidth) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, vid)
        state.hasVideo = Math.min(1, state.hasVideo + dt * 2)
        state.vw = vid.videoWidth; state.vh = vid.videoHeight
      } catch (e) { /* frame non pronto */ }
    }

    const asp = W / H
    let cx, cy, R
    if (asp >= 1) { cx = asp * 0.5 - Math.min(0.62, asp * 0.3); cy = 0.12; R = 0.2 }
    else { cx = asp * 0.12; cy = 0.2; R = Math.min(0.15, asp * 0.3) }

    gl.uniform2f(U.uRes, W, H)
    gl.uniform1f(U.uTime, (now - t0) / 1000)
    gl.uniform2f(U.uMouse, state.mouse.x, state.mouse.y)
    gl.uniform2f(U.uVideoRes, state.vw, state.vh)
    gl.uniform1f(U.uHasVideo, state.hasVideo)
    gl.uniform1f(U.uIntro, state.intro)
    gl.uniform1f(U.uScroll, state.scroll)
    gl.uniform2f(U.uCenter, cx, cy)
    gl.uniform1f(U.uR, R)
    gl.uniform1f(U.uSpin, state.spin)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  requestAnimationFrame(frame)

  return {
    state,
    kick(v = 2.5) { state.spinVel += v },
    destroy() { state.running = false; io.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove) },
  }
}
