"""Compact BANC CSR: drop glia/trachea/not_a_neuron/optic, remap indices, fill LUT idx.

Usage:
  brain-body/.venv/Scripts/python.exe brain-body/banc/compact_csr.py
Writes:
  dist/banc-csr.bin
  dist/banc-population.json
  updates idx in dist/banc-channels.json
"""
from __future__ import annotations

import json
import struct
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).parent
ROOT = BASE.parent.parent
DIST = ROOT / "dist"
CSR_IN = BASE / "synapses.bin"
SKIP = {
    "glia", "trachea", "not_a_neuron", "",
    "optic_lobe_intrinsic", "visual_projection", "visual_centrifugal",
    "central_brain_intrinsic",
}


def main() -> None:
    neurons = pd.read_parquet(BASE / "neurons.parquet")
    ids = neurons["banc_888_id"].map(lambda v: str(int(float(v))) if pd.notna(v) else "").to_numpy()
    klass = neurons["super_class"].fillna("").astype(str).to_numpy()
    keep_mask = np.array([k not in SKIP for k in klass], dtype=bool)
    print(f"meta {len(ids)} keep_class {keep_mask.sum()}")

    with open(CSR_IN, "rb") as f:
        magic = f.read(9)
        if magic != b"BANC CSR1":
            raise SystemExit(f"bad magic {magic}")
        n, ne = struct.unpack("<qq", f.read(16))
        offsets = np.fromfile(f, dtype="<i8", count=n + 1)
        dst = np.fromfile(f, dtype="<i4", count=ne)
        w = np.fromfile(f, dtype="<f4", count=ne)
    print(f"csr n={n} ne={ne}")
    if n != len(ids):
        raise SystemExit(f"csr n {n} != meta {len(ids)}")

    old_to_new = np.full(n, -1, dtype=np.int32)
    keep_idx = np.nonzero(keep_mask)[0]
    old_to_new[keep_idx] = np.arange(len(keep_idx), dtype=np.int32)

    src = np.repeat(np.arange(n, dtype=np.int32), np.diff(offsets).astype(np.int32))
    ok = keep_mask[src] & keep_mask[dst]
    src_k = old_to_new[src[ok]]
    dst_k = old_to_new[dst[ok]]
    w_k = w[ok]
    order = np.argsort(src_k, kind="mergesort")
    src_k, dst_k, w_k = src_k[order], dst_k[order], w_k[order]
    nk = int(keep_mask.sum())
    counts = np.bincount(src_k, minlength=nk).astype(np.int64)
    off = np.zeros(nk + 1, dtype=np.int64)
    np.cumsum(counts, out=off[1:])
    print(f"compact n={nk} ne={len(src_k)}")

    nt = neurons["neurotransmitter_predicted_v2"].fillna("").astype(str).str.lower().to_numpy()
    inhib = {"gaba", "glutamate"}
    sign = np.array([(-1 if nt[i] in inhib else 1) for i in keep_idx], dtype=np.int8)
    keep_ids = ids[keep_idx]

    out_csr = DIST / "banc-csr.bin"
    with open(out_csr, "wb") as f:
        f.write(b"BANC CSR1")
        f.write(struct.pack("<qq", nk, len(src_k)))
        f.write(off.astype("<i8").tobytes())
        f.write(dst_k.astype("<i4").tobytes())
        f.write(w_k.astype("<f4").tobytes())
    print(f"wrote {out_csr} {out_csr.stat().st_size / 1e6:.1f} MB")

    pop = {"n": nk, "id": keep_ids.tolist(), "sign": sign.tolist(), "skip": sorted(SKIP)}
    pop_path = DIST / "banc-population.json"
    pop_path.write_text(json.dumps(pop, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {pop_path} {pop_path.stat().st_size / 1e6:.1f} MB")

    id2idx = {i: int(j) for j, i in enumerate(keep_ids)}
    ch_path = DIST / "banc-channels.json"
    ch = json.loads(ch_path.read_text(encoding="utf-8"))
    miss_m = miss_p = 0
    for m in ch["motor"]:
        idx = id2idx.get(m["id"], -1)
        m["idx"] = idx
        if idx < 0:
            miss_m += 1
    for p in ch["proprio"]:
        idx = id2idx.get(p["id"], -1)
        p["idx"] = idx
        if idx < 0:
            miss_p += 1
    ch["meta"]["n_pop"] = nk
    ch["meta"]["n_edges"] = int(len(src_k))
    ch_path.write_text(json.dumps(ch, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"updated channels idx motor_miss={miss_m} proprio_miss={miss_p}")


if __name__ == "__main__":
    main()
