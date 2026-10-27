#!/usr/bin/env python3
"""
Prepara le foto per il sito: varianti AVIF/WebP/JPEG, colori, segnaposto, manifest.

Legge  scripts/foto/sorgenti.json  (id -> file originale) e scrive
  assets/opere/NN/   foto in vendita (tela, miniatura 4:5, due particolari)
  assets/foto/       altre foto (ritratto chi siamo)
  assets/manifest.json

Uso:  python3 scripts/foto/prepara_foto.py [--sorgenti <cartella>]
Le foto originali NON vanno nel repo: si leggono dalla cartella indicata.
"""
from __future__ import annotations
import argparse, base64, io, json
from pathlib import Path
from PIL import Image, ImageOps

QUI = Path(__file__).resolve().parent
RADICE = QUI.parents[1]
ASSETS = RADICE / "assets"

LARGHEZZE_TELA = [480, 960, 1600, 2400]
Q_AVIF, Q_WEBP, Q_JPG = 62, 80, 84


def palette(img: Image.Image, n=5):
    small = img.convert("RGB").resize((96, 96))
    q = small.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: n * 3]
    counts = sorted(q.getcolors(), reverse=True)
    tot = sum(c for c, _ in counts)
    out = []
    for c, idx in counts:
        r, g, b = pal[idx * 3: idx * 3 + 3]
        out.append({"hex": f"#{r:02x}{g:02x}{b:02x}", "share": round(c / tot, 3)})
    return out


def lqip(img: Image.Image) -> str:
    t = img.copy(); t.thumbnail((20, 20))
    buf = io.BytesIO(); t.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def salva_varianti(img: Image.Image, cartella: Path, nome: str, larghezze, rel: str, jpg_w: int):
    cartella.mkdir(parents=True, exist_ok=True)
    avif, webp = [], []
    W, H = img.size
    ws = sorted({min(w, W) for w in larghezze})
    for w in ws:
        h = round(H * w / W)
        r = img.resize((w, h), Image.LANCZOS) if w != W else img
        for fmt, lista, q in (("avif", avif, Q_AVIF), ("webp", webp, Q_WEBP)):
            f = f"{nome}_{w}.{fmt}"
            r.save(cartella / f, fmt.upper(), quality=q)
            lista.append({"w": w, "h": h, "file": f"{rel}/{f}"})
    jw = min(jpg_w, W); jh = round(H * jw / W)
    f = f"{nome}_{jw}.jpg"
    img.resize((jw, jh), Image.LANCZOS).save(cartella / f, "JPEG", quality=Q_JPG, optimize=True, progressive=True)
    return {"w": W if W <= max(larghezze) else ws[-1], "h": H if W <= max(larghezze) else round(H * ws[-1] / W),
            "avif": avif, "webp": webp, "jpg": {"w": jw, "h": jh, "file": f"{rel}/{f}"}}


def ritaglio(img, cx, cy, frac, ratio=1.0):
    W, H = img.size
    w = int(min(W, H) * frac); h = int(w / ratio)
    x = int(min(max(cx * W - w / 2, 0), W - w)); y = int(min(max(cy * H - h / 2, 0), H - h))
    return img.crop((x, y, x + w, y + h))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sorgenti", required=True, help="cartella con le foto originali")
    args = ap.parse_args()
    src = Path(args.sorgenti)
    cfg = json.loads((QUI / "sorgenti.json").read_text(encoding="utf-8"))
    man = {"versione": 1, "opere": [], "foto": []}

    for o in cfg["opere"]:
        oid = o["id"]
        img = ImageOps.exif_transpose(Image.open(src / o["file"])).convert("RGB")
        W, H = img.size
        rel = f"opere/{oid}"
        out = ASSETS / rel
        pal = palette(img)
        r = round(W / H, 4)
        ori = "quadrato" if abs(r - 1) < 0.03 else ("orizzontale" if r > 1 else "verticale")
        tela = salva_varianti(img, out, f"foto-{oid}_tela", LARGHEZZE_TELA, rel, 1600)
        tela.update({"src": o["file"], "aspect_ratio": r})
        if r >= 0.8:
            # 4:5 dalla foto: altezza piena
            h = H; w = int(h * 0.8)
            if w > W: w = W; h = int(w / 0.8)
            cx = o.get("centro", (0.5, 0.5))[0]
            x = int(min(max(cx * W - w / 2, 0), W - w)); mini = img.crop((x, (H - h) // 2, x + w, (H - h) // 2 + h))
        else:
            w = W; h = int(w / 0.8)
            cy = o.get("centro", (0.5, 0.5))[1]
            y = int(min(max(cy * H - h / 2, 0), H - h)); mini = img.crop((0, y, w, y + h))
        immagini = {
            "tela": tela,
            "miniatura": salva_varianti(mini, out, f"foto-{oid}_miniatura", [400, 800], rel, 800),
        }
        for i, (cx, cy, frac) in enumerate(o.get("particolari", [])[:2], start=1):
            immagini[f"dettaglio-{i}"] = salva_varianti(ritaglio(img, cx, cy, frac), out, f"foto-{oid}_dettaglio-{i}", [480, 960, 1500], rel, 1500)
        man["opere"].append({
            "id": oid, "slug": f"foto-{oid}", "aspect_ratio": r, "orientamento": ori,
            "tela_px": [W, H], "colore_dominante": pal[0]["hex"], "palette": pal, "lqip": lqip(img),
            "alt": o.get("alt"), "immagini": immagini,
        })
        print(f"+ {oid} {o['file']} {W}x{H}")

    for f in cfg.get("foto", []):
        img = ImageOps.exif_transpose(Image.open(src / f["file"])).convert("RGB")
        W, H = img.size
        v = salva_varianti(img, ASSETS / "foto", f["id"], [480, 960, 1600], "foto", 1200)
        man["foto"].append({"id": f["id"], "src": f["file"], "gruppo": f.get("gruppo", "ritratti"),
                            "soggetto": f.get("soggetto"), "aspect_ratio": round(W / H, 4),
                            "colore_dominante": palette(img)[0]["hex"], "lqip": lqip(img), **{k: v[k] for k in ("avif", "webp", "jpg")}})
        print(f"+ foto {f['id']}")

    (ASSETS / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("manifest scritto")


if __name__ == "__main__":
    main()
