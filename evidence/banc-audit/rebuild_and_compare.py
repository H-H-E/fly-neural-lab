"""Rebuild CSR outside deploy paths and record the multiplicity audit."""
from __future__ import annotations

import hashlib
import json
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]
BASE = ROOT / "brain-body" / "banc"
sys.path.insert(0, str(BASE))
import build  # noqa: E402


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_csr(path: Path) -> tuple[int, int, np.ndarray, np.ndarray, np.ndarray]:
    with path.open("rb") as stream:
        magic = stream.read(9)
        if magic != b"BANC CSR1":
            raise ValueError(f"bad CSR magic in {path}: {magic!r}")
        n, edge_count = struct.unpack("<qq", stream.read(16))
        offsets = np.fromfile(stream, dtype="<i8", count=n + 1)
        destinations = np.fromfile(stream, dtype="<i4", count=edge_count)
        weights = np.fromfile(stream, dtype="<f4", count=edge_count)
    return n, edge_count, offsets, destinations, weights


def csr_summary(path: Path) -> dict:
    n, edges, offsets, dst, weights = read_csr(path)
    return {
        "path": str(path),
        "sha256": sha256(path),
        "n": n,
        "edges": edges,
        "weight_unique": int(np.unique(weights).size),
        "weight_min": float(weights.min()) if len(weights) else None,
        "weight_max": float(weights.max()) if len(weights) else None,
        "weight_sum": float(weights.sum(dtype=np.float64)),
        "weight_one_rows": int(np.count_nonzero(weights == 1)),
        "offset_final": int(offsets[-1]),
        "destination_min": int(dst.min()) if len(dst) else None,
        "destination_max": int(dst.max()) if len(dst) else None,
    }


def main() -> None:
    raw_edge = BASE / "raw" / "edgelist_simple_v2.feather"
    metadata = BASE / "neurons.parquet"
    source = pd.read_feather(raw_edge, columns=["pre", "post", "count"])
    ids = pd.read_parquet(metadata, columns=["banc_888_id"])["banc_888_id"].astype(str)
    id2idx = {value: index for index, value in enumerate(ids)}
    src = source["pre"].map(id2idx).to_numpy()
    dst = source["post"].map(id2idx).to_numpy()
    order = np.lexsort((dst, src))

    with tempfile.TemporaryDirectory(prefix="banc-csr-audit-") as directory:
        out = Path(directory)
        shutil.copy2(metadata, out / "neurons.parquet")
        original_out = build.OUT
        build.OUT = out
        try:
            build.write_csr(source, out / "synapses.bin")
        finally:
            build.OUT = original_out

        n, edges, offsets, rebuilt_dst, rebuilt_w = read_csr(out / "synapses.bin")
        expected_dst = dst[order]
        expected_w = source["count"].to_numpy(dtype=np.float32)[order]
        pair_match = bool(np.array_equal(rebuilt_dst, expected_dst))
        count_match = bool(np.array_equal(rebuilt_w, expected_w))
        rebuilt_summary = csr_summary(out / "synapses.bin")

    result = {
        "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "source": {
            "metadata": {"path": str(metadata), "sha256": sha256(metadata), "rows": len(ids)},
            "edge_table": {
                "path": str(raw_edge),
                "sha256": sha256(raw_edge),
                "rows": len(source),
                "duplicate_pairs": int(source.duplicated(["pre", "post"]).sum()),
                "count_sum": int(source["count"].sum()),
                "count_min": int(source["count"].min()),
                "count_max": int(source["count"].max()),
                "count_one_rows": int((source["count"] == 1).sum()),
            },
        },
        "existing": {
            "brain_body_synapses_bin": csr_summary(BASE / "synapses.bin"),
            "dist_banc_csr_bin": csr_summary(ROOT / "dist" / "banc-csr.bin"),
        },
        "rebuilt_outside_deploy": {
            **rebuilt_summary,
            "exact_source_destination_pairs": pair_match,
            "exact_source_counts": count_match,
            "n_expected": n,
            "edges_expected": edges,
        },
    }
    report = ROOT / "evidence" / "banc-audit" / "count-identifier-audit.json"
    if report.exists():
        raise SystemExit(f"refusing to overwrite existing audit report: {report}")
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"wrote immutable audit: {report}")


if __name__ == "__main__":
    main()
