#!/usr/bin/env python3
"""Verifica i file USDZ: struttura zip (niente compressione, allineamento 64 byte),
validatori ufficiali OpenUSD (quelli di `usdchecker`, inclusi i controlli USDZ), unita' in metri,
asse Y in alto, misure e ancoraggio a parete.
Uso: python3 verifica_usdz.py [cartella]   (default: siti/assets/ar)"""
import sys

sys.dont_write_bytecode = True  # niente __pycache__ nella cartella condivisa
from pathlib import Path

from pxr import Usd, UsdGeom, UsdValidation

sys.path.insert(0, str(Path(__file__).resolve().parent))
from genera_ar import verifica_zip_usdz  # noqa: E402

cartella = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[4] / "assets" / "ar"
# Tutti i validatori registrati di OpenUSD (gli stessi di `usdchecker`), compresi
# quelli specifici per i pacchetti USDZ (UsdzValidators).
CONTESTO = UsdValidation.ValidationContext(UsdValidation.ValidationRegistry().GetOrLoadAllValidators())
falliti = 0
files = sorted(cartella.glob("*.usdz"))
for p in files:
    errori = []
    nomi, err_zip = verifica_zip_usdz(p)
    errori += err_zip
    st = Usd.Stage.Open(str(p))
    avvisi = []
    for e in CONTESTO.Validate(st):
        (errori if e.GetType() == UsdValidation.ValidationErrorType.Error else avvisi).append(
            f"{e.GetName()}: {e.GetMessage()}")
    mpu, up = UsdGeom.GetStageMetersPerUnit(st), UsdGeom.GetStageUpAxis(st)
    if mpu != 1.0:
        errori.append(f"metersPerUnit={mpu}")
    if up != "Y":
        errori.append(f"upAxis={up}")
    radice = st.GetDefaultPrim()
    tipo = radice.GetAttribute("preliminary:anchoring:type").Get()
    allin = radice.GetAttribute("preliminary:planeAnchoring:alignment").Get()
    bb = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ["default"]).ComputeWorldBound(radice).ComputeAlignedRange()
    dim = bb.GetSize()
    print(f"{'✗' if errori else '✓'} {p.name}: {dim[0]*100:.1f} x {dim[1]*100:.1f} x {dim[2]*100:.1f} cm, "
          f"ancoraggio {tipo}/{allin}, file {nomi}")
    for e in errori:
        print("    ERRORE", e)
    for a in avvisi:
        print("    avviso", a)
    falliti += bool(errori)
print(f"{len(files)} USDZ controllati, {falliti} con errori")
sys.exit(1 if falliti else 0)
