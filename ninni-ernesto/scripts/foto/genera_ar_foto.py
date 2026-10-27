#!/usr/bin/env python3
"""
Modelli AR delle foto (GLB per Android e anteprima 3D, USDZ per iPhone), alla misura reale.

Per ogni foto in dati/opere.json:
  NN-<formato>.glb/.usdz   una per ogni formato di stampa (stampa senza cornice, 3 mm di spessore come un pannello)
  NN-ed.glb/.usdz          l'edizione limitata con la sua cornice e il passe-partout, misura esterna
Scrive assets/ar/index.json (id, misure). Usa le funzioni di packages/core/scripts/ar/genera_ar.py
(stessa geometria, stesso ancoraggio a parete, stessa scala bloccata dei siti di Isabella).

Formati: devono restare uguali a packages/core/src/config/prints.ts (FAMIGLIE, SQUARE_TOLERANCE).
"""
from __future__ import annotations
import json, sys, tempfile
from pathlib import Path
from PIL import Image, ImageOps

QUI = Path(__file__).resolve().parent
RADICE = QUI.parents[1]
sys.path.insert(0, str(RADICE / "packages/core/scripts/ar"))
import genera_ar as G  # noqa: E402

FAMIGLIE = {
    "2:3": [(20, 30), (30, 45), (40, 60), (60, 90)],
    "3:4": [(30, 40), (45, 60), (60, 80)],
    "1:1": [(30, 30), (50, 50), (70, 70)],
}
SQUARE_TOL = 0.04
# cornice: (legno cm, vuoto/passe-partout cm, colore legno, colore vuoto)
CORNICI = {
    "none": (0, 0, None, None),
    "alu": (1.5, 0, (22, 22, 22), None),
    "oak": (2.5, 3.5, (196, 160, 118), (246, 244, 239)),
    "walnut": (2.5, 4.5, (84, 58, 42), (247, 246, 242)),
}
LATO_MAX = 2048


def famiglia(r):
    r = 1 / r if r > 1 else r
    if abs(r - 1) <= SQUARE_TOL:
        return "1:1"
    return "3:4" if abs(r - 0.75) < abs(r - 2 / 3) else "2:3"


def incornicia(img: Image.Image, w_cm, h_cm, cornice):
    legno, vuoto, c_legno, c_vuoto = CORNICI[cornice]
    if not legno:
        return img, w_cm, h_cm
    px_cm = img.width / w_cm
    W, H = w_cm + 2 * (legno + vuoto), h_cm + 2 * (legno + vuoto)
    tela = Image.new("RGB", (round(W * px_cm), round(H * px_cm)), c_legno)
    if vuoto:
        b = round(legno * px_cm)
        tela.paste(Image.new("RGB", (tela.width - 2 * b, tela.height - 2 * b), c_vuoto), (b, b))
    o = round((legno + vuoto) * px_cm)
    tela.paste(img.resize((tela.width - 2 * o, tela.height - 2 * o)), (o, o))
    return tela, W, H


def scrivi(oid, img, w_cm, h_cm, d_cm, titolo, uscita, voci):
    # texture: ~25 px/cm basta per un telefono a un metro dalla parete; mai oltre 2048
    lato = 1024 if max(w_cm, h_cm) <= 45 else LATO_MAX
    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        img.save(tmp.name, "JPEG", quality=92)
        jpeg, _, (tw, th) = G.prepara_texture(Path(tmp.name), lato, 82, True)
    W, H, D = w_cm / 100, h_cm / 100, d_cm / 100
    info = {"id": oid, "titolo": titolo, "larghezza_cm": w_cm, "altezza_cm": h_cm, "profondita_cm": d_cm, "unita": "metri"}
    glb, usdz = uscita / f"{oid}.glb", uscita / f"{oid}.usdz"
    G.scrivi_glb(glb, W, H, D, jpeg, info)
    G.scrivi_usdz(usdz, W, H, D, jpeg, info, "vertical")
    _, err = G.verifica_zip_usdz(usdz)
    if err:
        raise SystemExit(f"{oid}: USDZ non valido: {err}")
    voci.append({**info, "glb": glb.name, "usdz": usdz.name, "glb_kb": round(glb.stat().st_size / 1024), "usdz_kb": round(usdz.stat().st_size / 1024), "texture_px": [tw, th]})
    print(f"+ {oid}: {w_cm:g}x{h_cm:g}x{d_cm:g} cm  {voci[-1]['glb_kb']} KB")


def main():
    opere = json.loads((RADICE / "dati/opere.json").read_text(encoding="utf-8"))
    man = {o["id"]: o for o in json.loads((RADICE / "assets/manifest.json").read_text(encoding="utf-8"))["opere"]}
    uscita = RADICE / "assets/ar"
    for f in uscita.glob("*.glb"): f.unlink()
    for f in uscita.glob("*.usdz"): f.unlink()
    uscita.mkdir(parents=True, exist_ok=True)
    voci = []
    for o in opere:
        m = man[o["id"]]
        tela = m["immagini"]["tela"]
        grande = max(tela["webp"], key=lambda v: v["w"])
        img = ImageOps.exif_transpose(Image.open(RADICE / "assets" / grande["file"])).convert("RGB")
        r = m["aspect_ratio"]
        land = r > 1 + SQUARE_TOL
        for (a, b) in FAMIGLIE[famiglia(r)]:
            if max(a, b) > o["stampa_max_cm"]:
                continue
            w, h = (b, a) if land else (a, b)
            scrivi(f"{o['id']}-{w}x{h}", img, w, h, 0.4, o["titolo"], uscita, voci)
        e = o.get("edizione")
        if e:
            w, h = e["larghezza_cm"], e["altezza_cm"]
            if land and w < h: w, h = h, w
            fi, W, H = incornicia(img, w, h, e["cornice"])
            scrivi(f"{o['id']}-ed", fi, W, H, 3.5 if e["cornice"] != "alu" else 2.5, o["titolo"], uscita, voci)
    (uscita / "index.json").write_text(json.dumps({"generato_da": "scripts/foto/genera_ar_foto.py", "unita": "metri (1 unita' = 1 m)", "opere": voci, "saltate": []}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"fatto: {len(voci)} modelli")


if __name__ == "__main__":
    main()
