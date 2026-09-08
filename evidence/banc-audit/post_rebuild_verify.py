"""Post-rebuild verification for the corrected BANC assets."""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "brain-body" / "banc"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def csr(path: Path):
    with path.open("rb") as stream:
        assert stream.read(9) == b"BANC CSR1"
        n, ne = struct.unpack("<qq", stream.read(16))
        off = np.fromfile(stream, dtype="<i8", count=n + 1)
        dst = np.fromfile(stream, dtype="<i4", count=ne)
        w = np.fromfile(stream, dtype="<f4", count=ne)
    return n, ne, off, dst, w


def main(report: Path | None = None) -> None:
    neurons = pd.read_parquet(BASE / "neurons.parquet")
    ids = neurons["banc_888_id"].astype(str)
    id2idx = {value: index for index, value in enumerate(ids)}
    edge = pd.read_parquet(BASE / "synapses_edge.parquet", columns=["pre", "post", "count"])
    src = edge["pre"].map(id2idx).to_numpy()
    dst = edge["post"].map(id2idx).to_numpy()
    order = np.lexsort((dst, src))
    n, ne, off, actual_dst, actual_w = csr(BASE / "synapses.bin")
    expected_dst = dst[order]
    expected_w = edge["count"].to_numpy(dtype=np.float32)[order]

    keep = ~neurons["super_class"].fillna("").isin({
        "glia", "trachea", "not_a_neuron", "", "optic_lobe_intrinsic",
        "visual_projection", "visual_centrifugal", "central_brain_intrinsic",
    }).to_numpy()
    old_to_new = np.full(len(ids), -1, dtype=np.int32)
    kept = np.flatnonzero(keep)
    old_to_new[kept] = np.arange(len(kept), dtype=np.int32)
    retained = keep[src] & keep[dst]
    retained_order = order[retained[order]]
    cn, cne, coff, cdst, cw = csr(ROOT / "dist" / "banc-csr.bin")
    expected_compact_dst = old_to_new[dst[retained_order]]
    expected_compact_w = edge["count"].to_numpy(dtype=np.float32)[retained_order]

    population = json.loads((ROOT / "dist" / "banc-population.json").read_text(encoding="utf-8"))
    channels = json.loads((ROOT / "dist" / "banc-channels.json").read_text(encoding="utf-8"))
    channel_ids = [x["id"] for x in channels["motor"] + channels["proprio"]]
    tibia = json.loads((ROOT / "dist" / "reflex-tibia.json").read_text(encoding="utf-8"))
    result = {
        "assets": {
            "full_csr_sha256": sha256(BASE / "synapses.bin"),
            "compact_csr_sha256": sha256(ROOT / "dist" / "banc-csr.bin"),
            "population_sha256": sha256(ROOT / "dist" / "banc-population.json"),
            "channels_sha256": sha256(ROOT / "dist" / "banc-channels.json"),
            "reflex_sha256": sha256(ROOT / "dist" / "reflex-tibia.json"),
        },
        "full_csr": {
            "shape": [n, ne],
            "exact_source_destination_pairs": bool(np.array_equal(actual_dst, expected_dst)),
            "exact_source_counts": bool(np.array_equal(actual_w, expected_w)),
            "weight_sum": float(actual_w.sum(dtype=np.float64)),
            "weight_unique": int(np.unique(actual_w).size),
        },
        "compact_csr": {
            "shape": [cn, cne],
            "exact_retained_destination_indices": bool(np.array_equal(cdst, expected_compact_dst)),
            "exact_retained_counts": bool(np.array_equal(cw, expected_compact_w)),
            "weight_sum": float(cw.sum(dtype=np.float64)),
            "expected_weight_sum": float(expected_compact_w.sum(dtype=np.float64)),
            "weight_unique": int(np.unique(cw).size),
        },
        "identifiers": {
            "population_rows": len(population["id"]),
            "population_exact_metadata_matches": sum(str(x) in id2idx for x in population["id"]),
            "channel_rows": len(channel_ids),
            "channel_exact_metadata_matches": sum(x in id2idx for x in channel_ids),
            "motor_idx_missing": sum(x.get("idx", -1) < 0 for x in channels["motor"]),
            "proprio_idx_missing": sum(x.get("idx", -1) < 0 for x in channels["proprio"]),
        },
        "reflex": {
            "nodes": tibia["meta"]["n_nodes"],
            "edges": tibia["meta"]["n_edges"],
            "count_sum": int(sum(tibia["count"])),
            "count_unique": len(set(tibia["count"])),
            "count_one_rows": sum(x == 1 for x in tibia["count"]),
        },
    }
    report = report or (ROOT / "evidence" / "banc-audit" / "post-rebuild-verify-final.json")
    report = report if report.is_absolute() else ROOT / report
    if report.exists():
        raise SystemExit(f"refusing to overwrite existing audit report: {report}")
    report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"wrote immutable audit: {report}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=None, help="new immutable report path")
    main(parser.parse_args().out)
