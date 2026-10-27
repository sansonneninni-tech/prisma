#!/usr/bin/env python3
"""
Genera i modelli 3D per la realta' aumentata ("Visualizza nella stanza").

Per ogni opera produce:
  NN.glb   -> Android (Scene Viewer / WebXR) e anteprima 3D <model-viewer>
  NN.usdz  -> iPhone/iPad (AR Quick Look), ancorato a parete verticale
e un indice  index.json  con misure, file e note.

Il modello e' una tela a parallelepipedo alle MISURE REALI (1 unita' = 1 metro):
  - fronte  = immagine dell'opera
  - lati    = prolungamento dei colori del bordo dell'immagine (tela dipinta
              sui lati; per le opere fotografate con cornice diventano la cornice)
  - retro   = colore legno/tela grezza
  - origine al centro del fronte in X/Y, retro a z = 0, fronte a z = +spessore:
    il retro (-Z) e' la faccia che va contro il muro.

Dati letti (vedi AR.md):
  siti/dati/opere.json        id, titolo, misure.larghezza_cm, misure.altezza_cm
  siti/assets/manifest.json   immagini.tela: la webp piu' grande (2400/3200), altrimenti il jpg
  scripts/ar/override.json    correzioni per singola opera (misure, spessore...)

Uso:
  python3 genera_ar.py                 # tutte le opere con misure
  python3 genera_ar.py --solo 01 05    # solo alcune
Richiede: usd-core, pillow (vedi requirements.txt).
"""
from __future__ import annotations

import argparse
import io
import json
import math
import os
import shutil
import struct
import sys
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

QUI = Path(__file__).resolve().parent
SITI = QUI.parents[3]  # siti/packages/core/scripts/ar -> siti

COLORE_RETRO = (0.80, 0.75, 0.66)  # legno/tela grezza (sRGB 0-1)
LATO_STRISCIA = 0.006               # frazione d'immagine stirata sui lati
PIXEL_MAX_TEXTURE = 4096 * 2048        # al massimo 8 Mpx per texture
TOLLERANZA_PROPORZIONI = 0.06       # oltre il 6% di differenza foto/misure -> avviso


# --------------------------------------------------------------------------- dati

def carica_json(p: Path):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def lista_opere(dati):
    """opere.json puo' essere una lista o {"opere": [...]}."""
    if isinstance(dati, dict):
        dati = dati.get("opere", [])
    return dati


def misure_da_opera(o: dict):
    """Ritorna (larghezza_cm, altezza_cm, profondita_cm|None) o None."""
    m = o.get("misure") if isinstance(o.get("misure"), dict) else {}
    def pick(*keys):
        for k in keys:
            for src in (o, m):  # campi in cima (es. override) vincono su "misure"
                v = src.get(k)
                if isinstance(v, (int, float)) and v > 0:
                    return float(v)
        return None
    w = pick("larghezza_cm", "larghezza", "width_cm")
    h = pick("altezza_cm", "altezza", "height_cm")
    d = pick("profondita_cm", "spessore_cm", "depth_cm")
    if w and h:
        return w, h, d
    return None


def immagine_tela(manifest_opere: dict, oid: str, grande: bool = True) -> Path | None:
    """Con grande=True usa la tela piu' grande del manifest (webp 2400/3200, anche
    ingrandita): sui telefoni la texture da ~1000 px risultava sgranata (audit 19/10)."""
    m = manifest_opere.get(oid)
    if m:
        tela = (m.get("immagini") or {}).get("tela") or {}
        if grande:
            cand = [v for v in (tela.get("webp") or []) if isinstance(v, dict) and v.get("file")]
            if cand:
                p = SITI / "assets" / max(cand, key=lambda v: v.get("w", 0))["file"]
                if p.exists():
                    return p
        try:
            return SITI / "assets" / tela["jpg"]["file"]
        except (KeyError, TypeError):
            pass
    # ripiego: il jpg "tela" piu' grande nella cartella dell'opera
    cartella = SITI / "assets" / "opere" / oid
    cand = sorted(cartella.glob(f"*_tela_*.jpg"), key=lambda p: p.stat().st_size)
    return cand[-1] if cand else None


# ------------------------------------------------------------------ geometria

def geometria(W, H, D, s=LATO_STRISCIA):
    """Parallelepipedo. Ritorna due gruppi: 'dipinto' (fronte+lati, con UV)
    e 'retro'. UV in convenzione glTF (v=0 in alto nell'immagine)."""
    x0, x1, y0, y1, z0, z1 = -W / 2, W / 2, -H / 2, H / 2, 0.0, D

    def u_of(x):
        return (x - x0) / W

    def v_of(y):
        return 1.0 - (y - y0) / H

    quads_dip = []  # (4 punti CCW visti da fuori, normale, 4 uv)
    # fronte (+Z)
    P = [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    quads_dip.append((P, (0, 0, 1), [(u_of(p[0]), v_of(p[1])) for p in P]))
    # destra (+X): u da 1 (bordo fronte) a 1-s (verso il muro)
    P = [(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)]
    quads_dip.append((P, (1, 0, 0), [(1 - s * (1 - p[2] / D), v_of(p[1])) for p in P]))
    # sinistra (-X)
    P = [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)]
    quads_dip.append((P, (-1, 0, 0), [(s * (1 - p[2] / D), v_of(p[1])) for p in P]))
    # sopra (+Y): v da 0 (bordo fronte) a s
    P = [(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)]
    quads_dip.append((P, (0, 1, 0), [(u_of(p[0]), s * (1 - p[2] / D)) for p in P]))
    # sotto (-Y)
    P = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)]
    quads_dip.append((P, (0, -1, 0), [(u_of(p[0]), 1 - s * (1 - p[2] / D)) for p in P]))

    quads_retro = [([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), None)]

    for P, n, _ in quads_dip + quads_retro:  # controllo orientamento facce
        a = [P[1][i] - P[0][i] for i in range(3)]
        b = [P[2][i] - P[0][i] for i in range(3)]
        c = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
        assert sum(c[i] * n[i] for i in range(3)) > 0, "faccia girata al contrario"

    def appiattisci(quads):
        pos, nor, uv, idx = [], [], [], []
        for P, n, U in quads:
            base = len(pos)
            pos += P
            nor += [n] * 4
            if U is not None:
                uv += U
            idx += [base, base + 1, base + 2, base, base + 2, base + 3]
        return pos, nor, uv, idx

    return appiattisci(quads_dip), appiattisci(quads_retro)


# ----------------------------------------------------------------------- GLB

def srgb_a_lineare(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def scrivi_glb(percorso: Path, W, H, D, jpeg: bytes, info: dict):
    (pos, nor, uv, idx), (rpos, rnor, _, ridx) = geometria(W, H, D)
    blob = bytearray()
    views, accessors = [], []

    def aggiungi(dati: bytes, target=None):
        while len(blob) % 4:
            blob.append(0)
        v = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(dati)}
        if target:
            v["target"] = target
        blob.extend(dati)
        views.append(v)
        return len(views) - 1

    def acc_float(vals, tipo, minmax=False):
        flat = [c for v in vals for c in v]
        bv = aggiungi(struct.pack(f"<{len(flat)}f", *flat), 34962)
        a = {"bufferView": bv, "componentType": 5126, "count": len(vals), "type": tipo}
        if minmax:
            n = len(vals[0])
            a["min"] = [min(v[i] for v in vals) for i in range(n)]
            a["max"] = [max(v[i] for v in vals) for i in range(n)]
        accessors.append(a)
        return len(accessors) - 1

    def acc_idx(vals):
        bv = aggiungi(struct.pack(f"<{len(vals)}H", *vals), 34963)
        accessors.append({"bufferView": bv, "componentType": 5123, "count": len(vals), "type": "SCALAR"})
        return len(accessors) - 1

    p_pos, p_nor, p_uv, p_idx = acc_float(pos, "VEC3", True), acc_float(nor, "VEC3"), acc_float(uv, "VEC2"), acc_idx(idx)
    r_pos, r_nor, r_idx = acc_float(rpos, "VEC3", True), acc_float(rnor, "VEC3"), acc_idx(ridx)
    img_view = aggiungi(jpeg)
    while len(blob) % 4:
        blob.append(0)

    retro_lin = [round(srgb_a_lineare(c), 4) for c in COLORE_RETRO] + [1.0]
    gltf = {
        "asset": {"version": "2.0", "generator": "genera_ar.py (siti Isabella Pistillo)",
                  "copyright": "Isabella Pistillo", "extras": info},
        "scene": 0,
        "scenes": [{"name": "Scena", "nodes": [0]}],
        "nodes": [{"name": "Quadro", "mesh": 0}],
        "meshes": [{"name": "Quadro", "primitives": [
            {"attributes": {"POSITION": p_pos, "NORMAL": p_nor, "TEXCOORD_0": p_uv}, "indices": p_idx, "material": 0},
            {"attributes": {"POSITION": r_pos, "NORMAL": r_nor}, "indices": r_idx, "material": 1},
        ]}],
        "materials": [
            {"name": "Dipinto", "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0}, "metallicFactor": 0.0, "roughnessFactor": 0.85}},
            {"name": "Retro", "pbrMetallicRoughness": {
                "baseColorFactor": retro_lin, "metallicFactor": 0.0, "roughnessFactor": 1.0}},
        ],
        "textures": [{"sampler": 0, "source": 0}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "images": [{"name": "opera", "bufferView": img_view, "mimeType": "image/jpeg"}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    totale = 12 + 8 + len(js) + 8 + len(blob)
    with open(percorso, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, totale))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(blob), b"BIN\x00") + bytes(blob))


# ---------------------------------------------------------------------- USDZ

def scrivi_usdz(percorso: Path, W, H, D, jpeg: bytes, info: dict, allineamento="vertical"):
    from pxr import Gf, Kind, Sdf, Usd, UsdGeom, UsdShade, UsdUtils, Vt

    (pos, nor, uv, idx), (rpos, rnor, _, ridx) = geometria(W, H, D)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        (tmp / "opera.jpg").write_bytes(jpeg)
        usda = tmp / "quadro.usda"
        stage = Usd.Stage.CreateNew(str(usda))
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(stage, 1.0)
        stage.SetMetadata("comment", f"Isabella Pistillo - {info.get('titolo') or ''} "
                                     f"{info['larghezza_cm']:g}x{info['altezza_cm']:g} cm")

        radice = UsdGeom.Xform.Define(stage, "/Quadro")
        prim = radice.GetPrim()
        stage.SetDefaultPrim(prim)
        Usd.ModelAPI(prim).SetKind(Kind.Tokens.component)
        # Ancoraggio per AR Quick Look (schema "Preliminary_AnchoringAPI" di Apple)
        prim.SetMetadata("apiSchemas", Sdf.TokenListOp.Create(prependedItems=["Preliminary_AnchoringAPI"]))
        prim.CreateAttribute("preliminary:anchoring:type", Sdf.ValueTypeNames.Token,
                             variability=Sdf.VariabilityUniform).Set("plane")
        prim.CreateAttribute("preliminary:planeAnchoring:alignment", Sdf.ValueTypeNames.Token,
                             variability=Sdf.VariabilityUniform).Set(allineamento)

        # materiali
        UsdGeom.Scope.Define(stage, "/Quadro/Materiali")
        mat_d = UsdShade.Material.Define(stage, "/Quadro/Materiali/Dipinto")
        sh = UsdShade.Shader.Define(stage, "/Quadro/Materiali/Dipinto/Superficie")
        sh.CreateIdAttr("UsdPreviewSurface")
        sh.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.85)
        sh.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
        lettore = UsdShade.Shader.Define(stage, "/Quadro/Materiali/Dipinto/LettoreST")
        lettore.CreateIdAttr("UsdPrimvarReader_float2")
        lettore.CreateInput("varname", Sdf.ValueTypeNames.String).Set("st")
        lettore.CreateOutput("result", Sdf.ValueTypeNames.Float2)
        tex = UsdShade.Shader.Define(stage, "/Quadro/Materiali/Dipinto/Immagine")
        tex.CreateIdAttr("UsdUVTexture")
        tex.CreateInput("file", Sdf.ValueTypeNames.Asset).Set("opera.jpg")
        tex.CreateInput("sourceColorSpace", Sdf.ValueTypeNames.Token).Set("sRGB")
        tex.CreateInput("wrapS", Sdf.ValueTypeNames.Token).Set("clamp")
        tex.CreateInput("wrapT", Sdf.ValueTypeNames.Token).Set("clamp")
        tex.CreateInput("st", Sdf.ValueTypeNames.Float2).ConnectToSource(lettore.ConnectableAPI(), "result")
        tex.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
        sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).ConnectToSource(tex.ConnectableAPI(), "rgb")
        mat_d.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")

        mat_r = UsdShade.Material.Define(stage, "/Quadro/Materiali/Retro")
        shr = UsdShade.Shader.Define(stage, "/Quadro/Materiali/Retro/Superficie")
        shr.CreateIdAttr("UsdPreviewSurface")
        shr.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*[srgb_a_lineare(c) for c in COLORE_RETRO]))
        shr.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(1.0)
        shr.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
        mat_r.CreateSurfaceOutput().ConnectToSource(shr.ConnectableAPI(), "surface")

        # Con l'ancoraggio verticale ARKit usa l'asse Y locale come normale del muro
        # (doc ARPlaneAnchor: "the y-axis is the plane's normal") e -Z come "su";
        # stessa rotazione in model-viewer PR #4030. La geometria e' modellata
        # col fronte verso +Z e l'alto verso +Y (convenzione glTF): la ruotiamo di
        # -90 gradi attorno a X, cosi' il fronte guarda fuori dal muro (+Y) e l'alto
        # del quadro va verso -Z. Senza questa rotazione il quadro esce dal muro
        # come una mensola (screenshot da iPhone del 19/10).
        # Dopo ogni rigenerazione aumentare VERSIONE_MODELLI_AR in src/ar/index.ts.
        genitore = "/Quadro"
        if allineamento == "vertical":
            geo = UsdGeom.Xform.Define(stage, "/Quadro/Geometria")
            geo.AddRotateXOp().Set(-90.0)
            genitore = "/Quadro/Geometria"

        def mesh(nome, P, N, I, ST, mat):
            m = UsdGeom.Mesh.Define(stage, f"{genitore}/{nome}")
            m.CreatePointsAttr(Vt.Vec3fArray([Gf.Vec3f(*p) for p in P]))
            m.CreateFaceVertexCountsAttr(Vt.IntArray([3] * (len(I) // 3)))
            m.CreateFaceVertexIndicesAttr(Vt.IntArray(I))
            m.CreateNormalsAttr(Vt.Vec3fArray([Gf.Vec3f(*n) for n in N]))
            m.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
            m.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
            m.CreateDoubleSidedAttr(False)
            xs, ys, zs = zip(*P)
            m.CreateExtentAttr(Vt.Vec3fArray([Gf.Vec3f(min(xs), min(ys), min(zs)), Gf.Vec3f(max(xs), max(ys), max(zs))]))
            if ST is not None:
                # USD: origine st in basso a sinistra -> v_usd = 1 - v_gltf
                pv = UsdGeom.PrimvarsAPI(m).CreatePrimvar("st", Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
                pv.Set(Vt.Vec2fArray([Gf.Vec2f(u, 1.0 - v) for u, v in ST]))
            UsdShade.MaterialBindingAPI.Apply(m.GetPrim()).Bind(mat)

        mesh("Dipinto", pos, nor, idx, uv, mat_d)
        mesh("Retro", rpos, rnor, ridx, None, mat_r)
        stage.GetRootLayer().Save()

        tmp_usdz = tmp / "quadro.usdz"
        ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(str(usda)), str(tmp_usdz))
        if not ok:
            raise RuntimeError("creazione USDZ fallita")
        shutil.copyfile(tmp_usdz, percorso)


def verifica_zip_usdz(p: Path):
    """USDZ = zip senza compressione, dati di ogni file allineati a 64 byte."""
    errori = []
    with zipfile.ZipFile(p) as z, open(p, "rb") as f:
        nomi = z.namelist()
        if not nomi or not nomi[0].endswith((".usdc", ".usda", ".usd")):
            errori.append(f"il primo file non e' il layer USD ({nomi[:1]})")
        for zi in z.infolist():
            if zi.compress_type != zipfile.ZIP_STORED:
                errori.append(f"{zi.filename}: compresso")
            f.seek(zi.header_offset)
            h = f.read(30)
            n_len, x_len = struct.unpack("<HH", h[26:30])
            inizio = zi.header_offset + 30 + n_len + x_len
            if inizio % 64:
                errori.append(f"{zi.filename}: dati a offset {inizio} non allineati a 64")
    return nomi, errori


# --------------------------------------------------------------------- texture

def potenza_di_due(n: int, massimo: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return min(p, massimo)


def prepara_texture(img_path: Path, lato_max: int, qualita: int, pot: bool = True):
    """Ritorna (jpeg, dimensioni originali, dimensioni texture).
    Con pot=True la texture e' portata a lati potenza di 2 (es. 1290x954 -> 2048x1024):
    le UV coprono 0..1, quindi a schermo le proporzioni restano quelle vere, ma i
    visualizzatori possono usare le mipmap senza problemi (niente NPOT)."""
    im = Image.open(img_path).convert("RGB")
    orig = im.size
    if pot:
        k = min(1.0, lato_max / max(im.size))
        n = (round(im.width * k), round(im.height * k))
        dim = [potenza_di_due(n[0], lato_max), potenza_di_due(n[1], lato_max)]
        # tetto di 4096x2048 pixel (memoria dei telefoni): si dimezza il lato
        # piu' "gonfiato" dall'arrotondamento a potenza di 2
        while dim[0] * dim[1] > PIXEL_MAX_TEXTURE:
            i = 0 if dim[0] / n[0] >= dim[1] / n[1] else 1
            dim[i] //= 2
        dim = tuple(dim)
    elif max(im.size) > lato_max:
        k = lato_max / max(im.size)
        dim = (round(im.width * k), round(im.height * k))
    else:
        dim = im.size
    if dim != im.size:
        im = im.resize(dim, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=qualita, optimize=True, progressive=False)
    return buf.getvalue(), orig, im.size


# ------------------------------------------------------------------------ main

def main():
    global SITI
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--siti", default=os.environ.get("SITI_DIR", str(SITI)), help="cartella siti/")
    ap.add_argument("--dati", help="default: <siti>/dati/opere.json")
    ap.add_argument("--manifest", help="default: <siti>/assets/manifest.json")
    ap.add_argument("--override", default=str(QUI / "override.json"))
    ap.add_argument("--uscita", help="default: <siti>/assets/ar")
    ap.add_argument("--solo", nargs="*", help="id delle opere da generare (es. 01 05)")
    ap.add_argument("--lato-max", type=int, default=4096, help="lato lungo massimo della texture in px")
    ap.add_argument("--solo-jpg", action="store_true", help="usa il jpg della tela (~1000 px) invece della tela grande")
    ap.add_argument("--no-pot", action="store_true", help="non portare la texture a potenze di 2")
    ap.add_argument("--qualita", type=int, default=85, help="qualita' JPEG della texture")
    ap.add_argument("--spessore-cm", type=float, default=3.0, help="spessore tela standard")
    ap.add_argument("--spessore-grande-cm", type=float, default=4.0, help="spessore se un lato >= 150 cm")
    ap.add_argument("--allineamento-ios", default="vertical", choices=["vertical", "horizontal", "any"])
    args = ap.parse_args()
    SITI = Path(args.siti).resolve()
    args.dati = args.dati or str(SITI / "dati" / "opere.json")
    args.manifest = args.manifest or str(SITI / "assets" / "manifest.json")
    args.uscita = args.uscita or str(SITI / "assets" / "ar")

    uscita = Path(args.uscita)
    uscita.mkdir(parents=True, exist_ok=True)

    opere = lista_opere(carica_json(Path(args.dati))) if Path(args.dati).exists() else []
    manifest = carica_json(Path(args.manifest)) if Path(args.manifest).exists() else {"opere": []}
    man_op = {str(o["id"]).zfill(2): o for o in manifest.get("opere", [])}
    override = carica_json(Path(args.override)) if Path(args.override).exists() else {}
    override = {k: v for k, v in override.items() if not k.startswith("_")}

    if not opere:  # dati non ancora pronti: solo opere in override.json
        print("! opere.json assente: uso solo le opere elencate in override.json (misure provvisorie)")
        opere = [{"id": k} for k in override]

    indice = {"generato_da": "packages/core/scripts/ar/genera_ar.py", "unita": "metri (1 unita' = 1 m)",
              "opere": [], "saltate": []}
    for o in opere:
        oid = str(o.get("id") or o.get("numero")).zfill(2)
        if args.solo and oid not in args.solo:
            continue
        note = []
        ov = override.get(oid, {})
        mis = misure_da_opera({**o, **ov})
        if not mis:
            indice["saltate"].append({"id": oid, "motivo": "misure mancanti"})
            print(f"- {oid}: saltata, misure mancanti")
            continue
        w_cm, h_cm, d_cm = mis
        if ov.get("nota"):
            note.append(ov["nota"])
        img = immagine_tela(man_op, oid, not args.solo_jpg)
        if not img or not img.exists():
            indice["saltate"].append({"id": oid, "motivo": "immagine tela mancante"})
            print(f"- {oid}: saltata, immagine mancante")
            continue
        jpeg, (pw, ph), (tw, th) = prepara_texture(img, args.lato_max, args.qualita, not args.no_pot)

        # orientamento: comanda la foto (es. 150x200 scritto "alla rovescia")
        r_img = pw / ph
        if (r_img > 1.02 and w_cm < h_cm) or (r_img < 0.98 and w_cm > h_cm):
            w_cm, h_cm = h_cm, w_cm
            note.append("larghezza/altezza scambiate per seguire l'orientamento della foto")
        diff = abs((w_cm / h_cm) / r_img - 1)
        if diff > TOLLERANZA_PROPORZIONI:
            note.append(f"proporzioni foto {r_img:.3f} vs misure {w_cm / h_cm:.3f} "
                        f"(diff {diff:.0%}): immagine adattata alle misure")
        if d_cm is None:
            d_cm = args.spessore_grande_cm if max(w_cm, h_cm) >= 150 else args.spessore_cm

        W, H, D = w_cm / 100, h_cm / 100, d_cm / 100
        info = {"id": oid, "titolo": o.get("titolo"), "larghezza_cm": w_cm, "altezza_cm": h_cm,
                "profondita_cm": d_cm, "unita": "metri"}
        glb = uscita / f"{oid}.glb"
        usdz = uscita / f"{oid}.usdz"
        scrivi_glb(glb, W, H, D, jpeg, info)
        scrivi_usdz(usdz, W, H, D, jpeg, info, args.allineamento_ios)
        _, err = verifica_zip_usdz(usdz)
        if err:
            raise SystemExit(f"{oid}: USDZ non valido: {err}")
        voce = {**info, "glb": glb.name, "usdz": usdz.name,
                "glb_kb": round(glb.stat().st_size / 1024), "usdz_kb": round(usdz.stat().st_size / 1024),
                "texture_px": [tw, th], "foto_px": [pw, ph], "proporzioni_foto": round(r_img, 4),
                "immagine": str(img.relative_to(SITI)) if img.is_relative_to(SITI) else str(img)}
        if note:
            voce["note"] = note
        indice["opere"].append(voce)
        print(f"+ {oid} {o.get('titolo') or ''}: {w_cm:g}x{h_cm:g}x{d_cm:g} cm, "
              f"tex {tw}x{th}, glb {voce['glb_kb']} KB, usdz {voce['usdz_kb']} KB"
              + (f"  [{'; '.join(note)}]" if note else ""))

    if not args.solo:
        with open(uscita / "index.json", "w", encoding="utf-8") as f:
            json.dump(indice, f, ensure_ascii=False, indent=1)
            f.write("\n")
    print(f"fatto: {len(indice['opere'])} modelli in {uscita}")


if __name__ == "__main__":
    main()
