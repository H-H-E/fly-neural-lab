"""Gzip-chunk dist/banc-csr.bin + NT signs for the browser worker.

Reads the compact CSR already written by compact_csr.py.
Writes dist/banc-data/*.gz + dist/banc-manifest.json.

Usage: brain-body/.venv/Scripts/python.exe brain-body/banc/pack_banc.py
"""
from __future__ import annotations

import gzip
import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
DIST = ROOT / "dist"
CSR = DIST / "banc-csr.bin"
POP = DIST / "banc-population.json"
OUT = DIST / "banc-data"
CHUNK = 8_000_000


def gzip_write(path: Path, data: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wb", compresslevel=6) as f:
        f.write(data)
    return path.stat().st_size


def main() -> None:
    if not CSR.exists():
        raise SystemExit(f"missing {CSR} — run compact_csr.py first")
    raw = CSR.read_bytes()
    magic, n, ne = raw[:9], *struct.unpack_from("<qq", raw, 9)
    if magic != b"BANC CSR1":
        raise SystemExit(f"bad magic {magic}")
    print(f"csr {len(raw)/1e6:.1f} MB n={n} ne={ne}")

    if OUT.exists():
        for p in OUT.glob("*"):
            p.unlink()
    OUT.mkdir(parents=True, exist_ok=True)

    parts = []
    for i, off in enumerate(range(0, len(raw), CHUNK)):
        chunk = raw[off:off + CHUNK]
        name = f"csr-{i:03d}.gz"
        gz = gzip_write(OUT / name, chunk)
        parts.append({"url": f"banc-data/{name}", "bytes": len(chunk), "gz": gz})
        print(f"  {name} raw={len(chunk)/1e6:.2f} MB gz={gz/1e6:.2f} MB")

    pop = json.loads(POP.read_text(encoding="utf-8"))
    sign = np.asarray(pop["sign"], dtype=np.int8)
    if len(sign) != n:
        raise SystemExit(f"sign {len(sign)} != n {n}")
    sgz = gzip_write(OUT / "sign.bin.gz", sign.tobytes())
    print(f"  sign.bin.gz {sgz} bytes")

    man = {
        "n": n,
        "nEdges": ne,
        "csrBytes": len(raw),
        "csrParts": [{"url": p["url"], "bytes": p["bytes"]} for p in parts],
        "sign": {"url": "banc-data/sign.bin.gz", "bytes": int(sign.nbytes)},
        "skipOptic": True,
    }
    (DIST / "banc-manifest.json").write_text(json.dumps(man), encoding="utf-8")
    total_gz = sgz + sum(p["gz"] for p in parts)
    print(f"wrote banc-manifest.json download={total_gz/1e6:.1f} MB")


if __name__ == "__main__":
    main()
