/**
 * Modello AR della stampa così come la si compra: formato, carta e cornice scelti nella scheda (richiesta di ninni
 * del 04/11). I modelli fissi (scripts/foto/genera_ar_foto.py) sono la stampa nuda di ogni formato; tutte le
 * combinazioni pronte sul server sarebbero centinaia di MB, quindi qui si compone il modello nel browser:
 *  - la foto è il JPEG del modello fisso del formato (già scaricato per l'anteprima 3D, nessuna immagine nuova);
 *  - cornice vera in 3D (profilo, battuta, profondità), passe-partout o fondo della cassetta, foto appoggiata dentro;
 *  - carta come materiale: Photo Rag opaca, Baryta lucida, washi più calda e opaca;
 *  - GLB per l'anteprima 3D e Android (WebXR), USDZ per iPhone (Quick Look) con lo stesso ancoraggio a parete e la
 *    stessa rotazione dei modelli fissi (genera_ar.py: Preliminary_AnchoringAPI verticale, geometria ruotata −90° su X).
 * Misure come l'anteprima della scheda (anteprima-client.ts: CORNICI), in metri: 1 unità = 1 m.
 */

export interface Cornice { f: number; m: number }

/** Cornice a vista (f) e passe-partout o aria (m), cm per lato: gli stessi numeri dell'anteprima della scheda. */
export const CORNICI_AR: Record<string, Cornice> = {
  none: { f: 0, m: 0 },
  alu: { f: 1.5, m: 5 },
  oak: { f: 4.5, m: 1.5 },
  walnut: { f: 3, m: 4 },
};

/** Profondità della cornice dal muro e quanto è incassato l'interno (cm). */
const PROFILO: Record<string, { d: number; r: number; foto: number }> = {
  none: { d: 0.4, r: 0, foto: 0 },
  alu: { d: 2.5, r: 0.6, foto: 0.1 },
  oak: { d: 4, r: 2.2, foto: 0.5 }, // a cassetta: la foto è sospesa sul fondo scuro
  walnut: { d: 3.5, r: 1, foto: 0.1 },
};

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linRGB = (c: RGB): RGB => c.map(lin) as RGB;

const COLORE_CORNICE: Record<string, { c: RGB; metallo: number; ruvido: number; legno?: [string, string, string] }> = {
  alu: { c: hex('#161616'), metallo: 0.35, ruvido: 0.42 },
  oak: { c: hex('#c49a64'), metallo: 0, ruvido: 0.7, legno: ['#caa36e', '#b98f59', '#946b3c'] },
  walnut: { c: hex('#4a2e1d'), metallo: 0, ruvido: 0.6, legno: ['#64422c', '#45291a', '#2f1b10'] },
};
const PASSEPARTOUT = hex('#f7f5f0');
const FONDO_CASSETTA = hex('#4f3d2a');
const BORDO_CARTA = hex('#f4f2ec');
const RETRO: RGB = [0.8, 0.75, 0.66];

/** Carta: ruvidezza e tinta (la washi è un po' più calda, come nell'anteprima). */
const CARTE: Record<string, { ruvido: number; tinta: RGB }> = {
  rag: { ruvido: 0.9, tinta: [1, 1, 1] },
  baryta: { ruvido: 0.55, tinta: [1, 1, 1] }, // semilucida: un riflesso morbido, non uno specchio
  washi: { ruvido: 0.96, tinta: [0.97, 0.945, 0.9] },
  bizan: { ruvido: 0.96, tinta: [0.97, 0.945, 0.9] },
};

export interface SceltaAr { formato: string; carta: string; cornice: string; w: number; h: number }
export interface MisureEsterne { w: number; h: number; d: number }

/** Misura esterna in cm (cornice compresa) di una scelta. */
export function misuraEsterna(s: Pick<SceltaAr, 'w' | 'h' | 'cornice'>): MisureEsterne {
  const c = CORNICI_AR[s.cornice] ?? CORNICI_AR.none!;
  const p = PROFILO[s.cornice] ?? PROFILO.none!;
  return { w: s.w + 2 * (c.f + c.m), h: s.h + 2 * (c.f + c.m), d: p.d };
}

/* ------------------------------------------------------------------ geometria */

type V3 = [number, number, number];
type V2 = [number, number];
interface Quad { P: [V3, V3, V3, V3]; n: V3; uv: [V2, V2, V2, V2] }
type NomeMat = 'foto' | 'cornice' | 'fondo' | 'bordo' | 'retro';
type Parti = Record<NomeMat, Quad[]>;

/** Parallelepipedo allineato agli assi (solo le facce indicate), UV in metri × k lungo la venatura. */
function scatola(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, facce: string, k = 1, orizz = true): Quad[] {
  const q: Quad[] = [];
  const uv = (p: V3, ax: 'xy' | 'xz' | 'yz'): V2 => {
    const [x, y, z] = p;
    const a = ax === 'xy' ? (orizz ? [x, y] : [y, x]) : ax === 'xz' ? [x, z] : [y, z];
    return [a[0]! * k, a[1]! * k];
  };
  const add = (P: [V3, V3, V3, V3], n: V3, ax: 'xy' | 'xz' | 'yz') => q.push({ P, n, uv: P.map((p) => uv(p, ax)) as Quad['uv'] });
  if (facce.includes('F')) add([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], 'xy');
  if (facce.includes('R')) add([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], 'yz');
  if (facce.includes('L')) add([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], 'yz');
  if (facce.includes('T')) add([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], 'xz');
  if (facce.includes('B')) add([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], 'xz');
  if (facce.includes('K')) add([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], 'xy');
  return q;
}

/** Pareti interne dell'apertura (guardano verso il centro). */
function paretiInterne(ix: number, iy: number, z0: number, z1: number, k: number): Quad[] {
  const q: Quad[] = [];
  const add = (P: [V3, V3, V3, V3], n: V3, orizz: boolean) => q.push({ P, n, uv: P.map(([x, y, z]) => (orizz ? [x * k, z * k] : [y * k, z * k])) as Quad['uv'] });
  add([[ix, -iy, z1], [ix, -iy, z0], [ix, iy, z0], [ix, iy, z1]].map(([x, y, z]) => [-x!, y!, z!]) as Quad['P'], [1, 0, 0], false); // sinistra, guarda a destra
  add([[ix, -iy, z0], [ix, -iy, z1], [ix, iy, z1], [ix, iy, z0]] as Quad['P'], [-1, 0, 0], false); // destra, guarda a sinistra
  add([[-ix, iy, z0], [ix, iy, z0], [ix, iy, z1], [-ix, iy, z1]] as Quad['P'], [0, -1, 0], true); // sopra, guarda giù
  add([[-ix, -iy, z1], [ix, -iy, z1], [ix, -iy, z0], [-ix, -iy, z0]] as Quad['P'], [0, 1, 0], true); // sotto, guarda su
  return q;
}

export function geometria(s: SceltaAr): Parti {
  const cm = 0.01;
  const c = CORNICI_AR[s.cornice] ?? CORNICI_AR.none!;
  const p = PROFILO[s.cornice] ?? PROFILO.none!;
  const w = s.w * cm, h = s.h * cm;
  const f = c.f * cm, m = c.m * cm, D = p.d * cm;
  const W = w + 2 * (f + m), H = h + 2 * (f + m);
  const X = W / 2, Y = H / 2;
  const parti: Parti = { foto: [], cornice: [], fondo: [], bordo: [], retro: [] };
  const fotoQuad = (z: number): Quad => ({
    P: [[-w / 2, -h / 2, z], [w / 2, -h / 2, z], [w / 2, h / 2, z], [-w / 2, h / 2, z]], n: [0, 0, 1],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]], // glTF: v = 0 in alto nell'immagine
  });
  parti.retro = scatola(-X, X, -Y, Y, 0, D, 'K');
  if (!f) {
    // stampa senza cornice: pannello di 4 mm con i bordi di carta
    parti.foto.push(fotoQuad(D));
    parti.bordo = scatola(-X, X, -Y, Y, 0, D, 'RLTB');
    return parti;
  }
  const K = 1 / 0.3; // la venatura si ripete ogni 30 cm
  const zi = D - p.r * cm; // fondo dell'apertura
  // fianchi esterni e fronte della cornice (4 listelli)
  parti.cornice.push(...scatola(-X, X, -Y, Y, 0, D, 'TB', K), ...scatola(-X, X, -Y, Y, 0, D, 'RL', K, false));
  parti.cornice.push(...scatola(-X, X, Y - f, Y, 0, D, 'F', K), ...scatola(-X, X, -Y, -Y + f, 0, D, 'F', K));
  parti.cornice.push(...scatola(-X, -X + f, -Y + f, Y - f, 0, D, 'F', K, false), ...scatola(X - f, X, -Y + f, Y - f, 0, D, 'F', K, false));
  parti.cornice.push(...paretiInterne(X - f, Y - f, zi, D, K));
  // fondo: passe-partout (alluminio, noce) o fondo scuro della cassetta (rovere)
  parti.fondo = scatola(-X + f, X - f, -Y + f, Y - f, 0, zi, 'F');
  const zf = zi + Math.max(p.foto * cm, 0.0005);
  parti.foto.push(fotoQuad(zf));
  if (p.foto >= 0.3) parti.bordo = scatola(-w / 2, w / 2, -h / 2, h / 2, zi, zf, 'RLTB');
  return parti;
}

/* --------------------------------------------------------------- texture legno */

/** Venatura a strisce lunghe (512 × 128), ripetuta lungo i listelli. JPEG, come la foto. */
async function texturaLegno(col: [string, string, string]): Promise<Uint8Array | null> {
  try {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    if (!g) return null;
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, col[0]); grad.addColorStop(0.5, col[1]); grad.addColorStop(1, col[0]);
    g.fillStyle = grad; g.fillRect(0, 0, 512, 128);
    // venatura dritta: tante fibre sottili quasi parallele (niente onde, che a distanza diventano un motivo)
    let seme = 7;
    const rnd = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      const y = rnd() * 128, a = 0.04 + rnd() * 0.12, deriva = (rnd() - 0.5) * 2;
      g.strokeStyle = rnd() < 0.8 ? col[2] : col[0]; g.globalAlpha = a; g.lineWidth = 0.4 + rnd() * 1.4;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(170, y + deriva, 340, y - deriva, 512, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ GLB */

/** Il JPEG della foto dentro un GLB (primo images[] con bufferView). */
export function jpegDaGlb(buf: ArrayBuffer): Uint8Array {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('non è un GLB');
  const lenJson = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, lenJson))) as {
    images?: { bufferView?: number }[]; bufferViews: { byteOffset?: number; byteLength: number }[];
  };
  const inizioBin = 20 + lenJson + 8;
  const bvi = json.images?.find((i) => i.bufferView !== undefined)?.bufferView;
  if (bvi === undefined) throw new Error('GLB senza immagine');
  const bv = json.bufferViews[bvi]!;
  return new Uint8Array(buf, inizioBin + (bv.byteOffset ?? 0), bv.byteLength).slice();
}

interface Materiale { nome: NomeMat; colore: RGB; ruvido: number; metallo: number; texture?: 0 | 1 }

function materiali(s: SceltaAr, conLegno: boolean): Materiale[] {
  const carta = CARTE[s.carta] ?? CARTE.rag!;
  const cc = COLORE_CORNICE[s.cornice];
  return [
    { nome: 'foto', colore: carta.tinta, ruvido: carta.ruvido, metallo: 0, texture: 0 },
    { nome: 'cornice', colore: conLegno ? [1, 1, 1] : linRGB(cc?.c ?? [0.1, 0.1, 0.1]), ruvido: cc?.ruvido ?? 0.6, metallo: cc?.metallo ?? 0, ...(conLegno ? { texture: 1 as const } : {}) },
    { nome: 'fondo', colore: linRGB(s.cornice === 'oak' ? FONDO_CASSETTA : PASSEPARTOUT), ruvido: 0.95, metallo: 0 },
    { nome: 'bordo', colore: linRGB(BORDO_CARTA), ruvido: 0.9, metallo: 0 },
    { nome: 'retro', colore: linRGB(RETRO), ruvido: 1, metallo: 0 },
  ];
}

function appiattisci(quads: Quad[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const q of quads) {
    const b = pos.length / 3;
    for (let i = 0; i < 4; i++) { pos.push(...q.P[i]!); nor.push(...q.n); uv.push(...q.uv[i]!); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { pos, nor, uv, idx };
}

function scriviGlb(parti: Parti, mats: Materiale[], foto: Uint8Array, legno: Uint8Array | null, extras: Record<string, unknown>): Uint8Array {
  const pezzi: Uint8Array[] = [];
  let off = 0;
  const views: Record<string, number>[] = [];
  const accessors: Record<string, unknown>[] = [];
  const aggiungi = (dati: Uint8Array, target?: number) => {
    const pad = (4 - (off % 4)) % 4;
    if (pad) { pezzi.push(new Uint8Array(pad)); off += pad; }
    views.push({ buffer: 0, byteOffset: off, byteLength: dati.byteLength, ...(target ? { target } : {}) });
    pezzi.push(dati); off += dati.byteLength;
    return views.length - 1;
  };
  const accF = (v: number[], tipo: 'VEC3' | 'VEC2', minmax = false) => {
    const n = tipo === 'VEC3' ? 3 : 2;
    const a: Record<string, unknown> = { bufferView: aggiungi(new Uint8Array(new Float32Array(v).buffer), 34962), componentType: 5126, count: v.length / n, type: tipo };
    if (minmax) {
      a.min = [0, 1, 2].map((i) => Math.min(...v.filter((_, j) => j % 3 === i)));
      a.max = [0, 1, 2].map((i) => Math.max(...v.filter((_, j) => j % 3 === i)));
    }
    accessors.push(a);
    return accessors.length - 1;
  };
  const accI = (v: number[]) => {
    accessors.push({ bufferView: aggiungi(new Uint8Array(new Uint16Array(v).buffer), 34963), componentType: 5123, count: v.length, type: 'SCALAR' });
    return accessors.length - 1;
  };
  const primitive: Record<string, unknown>[] = [];
  mats.forEach((m, i) => {
    const q = parti[m.nome];
    if (!q.length) return;
    const g = appiattisci(q);
    primitive.push({ attributes: { POSITION: accF(g.pos, 'VEC3', true), NORMAL: accF(g.nor, 'VEC3'), TEXCOORD_0: accF(g.uv, 'VEC2') }, indices: accI(g.idx), material: i });
  });
  const imgFoto = aggiungi(foto);
  const imgLegno = legno ? aggiungi(legno) : -1;
  const pad = (4 - (off % 4)) % 4;
  if (pad) { pezzi.push(new Uint8Array(pad)); off += pad; }
  const gltf = {
    asset: { version: '2.0', generator: 'ar-composto.ts (Ninni & Ernesto)', extras },
    scene: 0,
    scenes: [{ name: 'Scena', nodes: [0] }],
    nodes: [{ name: 'Quadro', mesh: 0 }],
    meshes: [{ name: 'Quadro', primitives: primitive }],
    materials: mats.map((m) => ({
      name: m.nome,
      pbrMetallicRoughness: {
        baseColorFactor: [...m.colore, 1], metallicFactor: m.metallo, roughnessFactor: m.ruvido,
        ...(m.texture !== undefined ? { baseColorTexture: { index: m.texture } } : {}),
      },
    })),
    textures: [{ sampler: 0, source: 0 }, ...(legno ? [{ sampler: 1, source: 1 }] : [])],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }, { magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [{ name: 'foto', bufferView: imgFoto, mimeType: 'image/jpeg' }, ...(legno ? [{ name: 'legno', bufferView: imgLegno, mimeType: 'image/jpeg' }] : [])],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: off }],
  };
  let js = new TextEncoder().encode(JSON.stringify(gltf));
  const pj = (4 - (js.length % 4)) % 4;
  if (pj) { const t = new Uint8Array(js.length + pj).fill(0x20); t.set(js); js = t; }
  const tot = 12 + 8 + js.length + 8 + off;
  const out = new Uint8Array(tot);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, tot, true);
  dv.setUint32(12, js.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(js, 20);
  let o = 20 + js.length;
  dv.setUint32(o, off, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
  for (const p of pezzi) { out.set(p, o); o += p.byteLength; }
  return out;
}

/* ----------------------------------------------------------------------- USDZ */

const n6 = (v: number) => (Math.round(v * 1e6) / 1e6).toString();
const tupla = (a: readonly number[]) => `(${a.map(n6).join(', ')})`;

function scriviUsda(parti: Parti, mats: Materiale[], conLegno: boolean, titolo: string): string {
  const righe: string[] = [];
  const shader = (m: Materiale) => {
    const b = `/Quadro/Materiali/${m.nome}`;
    const tex = m.texture === 0 ? 'foto.jpg' : m.texture === 1 && conLegno ? 'legno.jpg' : null;
    const wrap = m.texture === 1 ? 'repeat' : 'clamp';
    return `
        def Material "${m.nome}"
        {
            token outputs:surface.connect = <${b}/Superficie.outputs:surface>

            def Shader "Superficie"
            {
                uniform token info:id = "UsdPreviewSurface"
                ${tex ? `color3f inputs:diffuseColor.connect = <${b}/Immagine.outputs:rgb>` : `color3f inputs:diffuseColor = ${tupla(m.colore)}`}
                float inputs:metallic = ${n6(m.metallo)}
                float inputs:roughness = ${n6(m.ruvido)}
                token outputs:surface
            }${tex ? `

            def Shader "LettoreST"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                string inputs:varname = "st"
                float2 outputs:result
            }

            def Shader "Immagine"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${tex}@
                float4 inputs:scale = ${tupla([...m.colore, 1])}
                token inputs:sourceColorSpace = "sRGB"
                float2 inputs:st.connect = <${b}/LettoreST.outputs:result>
                token inputs:wrapS = "${wrap}"
                token inputs:wrapT = "${wrap}"
                float3 outputs:rgb
            }` : ''}
        }`;
  };
  const mesh = (m: Materiale) => {
    const q = parti[m.nome];
    if (!q.length) return '';
    const g = appiattisci(q);
    const pts: string[] = [], nrm: string[] = [], st: string[] = [];
    for (let i = 0; i < g.pos.length / 3; i++) {
      pts.push(tupla(g.pos.slice(i * 3, i * 3 + 3)));
      nrm.push(tupla(g.nor.slice(i * 3, i * 3 + 3)));
      st.push(tupla([g.uv[i * 2]!, 1 - g.uv[i * 2 + 1]!])); // USD: origine st in basso
    }
    const xs = g.pos.filter((_, j) => j % 3 === 0), ys = g.pos.filter((_, j) => j % 3 === 1), zs = g.pos.filter((_, j) => j % 3 === 2);
    return `
        def Mesh "${m.nome}" (
            prepend apiSchemas = ["MaterialBindingAPI"]
        )
        {
            uniform bool doubleSided = 0
            float3[] extent = [${tupla([Math.min(...xs), Math.min(...ys), Math.min(...zs)])}, ${tupla([Math.max(...xs), Math.max(...ys), Math.max(...zs)])}]
            int[] faceVertexCounts = [${new Array(g.idx.length / 3).fill(3).join(', ')}]
            int[] faceVertexIndices = [${g.idx.join(', ')}]
            rel material:binding = </Quadro/Materiali/${m.nome}>
            normal3f[] normals = [${nrm.join(', ')}] (
                interpolation = "vertex"
            )
            point3f[] points = [${pts.join(', ')}]
            texCoord2f[] primvars:st = [${st.join(', ')}] (
                interpolation = "vertex"
            )
            uniform token subdivisionScheme = "none"
        }`;
  };
  righe.push(`#usda 1.0
(
    doc = "Ninni & Ernesto - ${titolo.replace(/["\\]/g, '')}"
    defaultPrim = "Quadro"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Quadro" (
    prepend apiSchemas = ["Preliminary_AnchoringAPI"]
    kind = "component"
)
{
    uniform token preliminary:anchoring:type = "plane"
    uniform token preliminary:planeAnchoring:alignment = "vertical"

    def Scope "Materiali"
    {${mats.filter((m) => parti[m.nome].length).map(shader).join('\n')}
    }

    def Xform "Geometria"
    {
        float xformOp:rotateX = -90
        uniform token[] xformOpOrder = ["xformOp:rotateX"]
${mats.map(mesh).join('\n')}
    }
}
`);
  return righe.join('');
}

let tabellaCrc: Uint32Array | null = null;
function crc32(d: Uint8Array): number {
  if (!tabellaCrc) {
    tabellaCrc = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabellaCrc[i] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = tabellaCrc[(c ^ d[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** USDZ = zip senza compressione, con i dati di ogni file allineati a 64 byte (campo extra di riempimento). */
export function zipUsdz(file: { nome: string; dati: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const locali: Uint8Array[] = [];
  const centrali: Uint8Array[] = [];
  let off = 0;
  for (const f of file) {
    const nome = enc.encode(f.nome);
    const crc = crc32(f.dati);
    let pad = (64 - ((off + 30 + nome.length + 4) % 64)) % 64;
    const extra = new Uint8Array(4 + pad);
    new DataView(extra.buffer).setUint16(0, 12345, true);
    new DataView(extra.buffer).setUint16(2, pad, true);
    const h = new Uint8Array(30 + nome.length + extra.length);
    const v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0, true); v.setUint16(8, 0, true);
    v.setUint16(10, 0, true); v.setUint16(12, 0x21, true); v.setUint32(14, crc, true);
    v.setUint32(18, f.dati.length, true); v.setUint32(22, f.dati.length, true);
    v.setUint16(26, nome.length, true); v.setUint16(28, extra.length, true);
    h.set(nome, 30); h.set(extra, 30 + nome.length);
    const c = new Uint8Array(46 + nome.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, f.dati.length, true); cv.setUint32(24, f.dati.length, true); cv.setUint16(28, nome.length, true);
    cv.setUint32(42, off, true);
    c.set(nome, 46);
    locali.push(h, f.dati); centrali.push(c);
    off += h.length + f.dati.length;
    pad = 0;
  }
  const lenC = centrali.reduce((a, c) => a + c.length, 0);
  const fine = new Uint8Array(22);
  const fv = new DataView(fine.buffer);
  fv.setUint32(0, 0x06054b50, true); fv.setUint16(8, file.length, true); fv.setUint16(10, file.length, true);
  fv.setUint32(12, lenC, true); fv.setUint32(16, off, true);
  const out = new Uint8Array(off + lenC + 22);
  let o = 0;
  for (const p of [...locali, ...centrali, fine]) { out.set(p, o); o += p.length; }
  return out;
}

/* --------------------------------------------------------------------- insieme */

export interface ModelloComposto { glb: Uint8Array; usdz: Uint8Array; misure: MisureEsterne }

/** Compone GLB e USDZ di una scelta a partire dal GLB fisso del formato (da cui prende la foto). */
export async function componiModello(glbBase: ArrayBuffer, s: SceltaAr, titolo: string): Promise<ModelloComposto> {
  const foto = jpegDaGlb(glbBase);
  const cc = COLORE_CORNICE[s.cornice];
  const legno = cc?.legno ? await texturaLegno(cc.legno) : null;
  const parti = geometria(s);
  const mats = materiali(s, !!legno);
  const misure = misuraEsterna(s);
  const glb = scriviGlb(parti, mats, foto, legno, { titolo, larghezza_cm: misure.w, altezza_cm: misure.h, profondita_cm: misure.d, carta: s.carta, cornice: s.cornice });
  const usda = new TextEncoder().encode(scriviUsda(parti, mats, !!legno, titolo));
  const usdz = zipUsdz([{ nome: 'quadro.usda', dati: usda }, { nome: 'foto.jpg', dati: foto }, ...(legno ? [{ nome: 'legno.jpg', dati: legno }] : [])]);
  return { glb, usdz, misure };
}
