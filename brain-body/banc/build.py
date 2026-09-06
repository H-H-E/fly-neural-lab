"""Build the pinned BANC data layer from raw downloads.

Inputs (brain-body/banc/raw/):
  banc_888_meta_20260521.parquet   neuron metadata (required)
  edgelist_simple_v2.feather       synapses_v2 edgelist (Dataverse 13992792)
  banc_fafb_reviewed_matches.csv   reviewed BANC->FAFB crosswalk (Dataverse 13994485)
  banc_888_nt_v2.csv               per-neuron NT predictions (audit source)
  cell_info.parquet                cell info supplement (optional)

Outputs (brain-body/banc/):
  neurons.parquet, synapses_edge.parquet (+synapses.bin, engine-ready CSR),
  fafb_banc_crosswalk.parquet, sensory_channels.parquet,
  motor_channels.parquet, body_targets.parquet

Usage: brain-body/.venv/Scripts/python.exe brain-body/banc/build.py
"""
import gzip
import shutil
import struct
import sys
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent
META = RAW / "banc_888_meta_20260521.parquet"

NEURON_COLS = [
    "banc_888_id", "root_888", "proofread", "roughly_proofread", "side",
    "region", "super_class", "cell_class", "cell_sub_class", "cell_type",
    "hemilineage", "nerve", "neuromere",
    "dn_type", "an_type",
    "body_part_sensory", "body_part_effector", "peripheral_target_type",
    "cell_function", "cell_function_detailed",
    "neurotransmitter_predicted_v2", "neurotransmitter_score_v2",
    "neurotransmitter_verified",
    "fafb_match", "manc_match", "fanc_match",
    "input_connections", "output_connections",
]


def main():
    if not META.exists():
        sys.exit(f"missing required input: {META}")
    m = pd.read_parquet(META)
    keep = [c for c in NEURON_COLS if c in m.columns]
    neurons = m[keep].copy()
    neurons.to_parquet(OUT / "neurons.parquet", index=False)
    print(f"neurons.parquet: {neurons.shape}")

    # --- crosswalk: reviewed matches primary, in-meta fafb_match fallback
    xwalk = neurons[["banc_888_id", "root_888", "cell_type", "fafb_match"]].copy()
    xwalk = xwalk.rename(columns={"fafb_match": "fafb_id_meta"})
    reviewed = RAW / "banc_fafb_reviewed_matches.csv"
    if reviewed.exists():
        r = pd.read_csv(reviewed, dtype=str)
        r = r[r["valid"] == "t"].dropna(subset=["pt_root_id", "match_id"])
        numeric = r["pt_root_id"].str.fullmatch(r"\d+") & r["match_id"].str.fullmatch(r"\d+")
        print(f"reviewed rows valid={len(r)}, numeric={(numeric.fillna(False)).sum()}")
        r = r[numeric.fillna(False)]
        r = r[["pt_root_id", "match_id", "match_cell_type"]].astype(
            {"pt_root_id": "int64", "match_id": "int64"})
        r = r.rename(columns={"pt_root_id": "banc_888_id",
                              "match_id": "fafb_id_reviewed",
                              "match_cell_type": "fafb_type_reviewed"})
        r["banc_888_id"] = r["banc_888_id"].astype(str)
        xwalk["banc_888_id"] = xwalk["banc_888_id"].astype(str)
        xwalk = xwalk.merge(r, on="banc_888_id", how="left")
        print(f"reviewed matches joined: {xwalk['fafb_id_reviewed'].notna().sum()}")
    for c in ("fafb_id_reviewed", "fafb_id_meta"):
        if c not in xwalk.columns:
            xwalk[c] = ""
    def idstr(s):
        try:
            f = float(s)
            return str(int(f)) if f == f and abs(f) != float("inf") else ""
        except (TypeError, ValueError):
            return ""
    xwalk["fafb_id"] = [b if b and b != "" else a
                        for a, b in zip((idstr(v) for v in xwalk["fafb_id_meta"]),
                                        (idstr(v) for v in xwalk["fafb_id_reviewed"]))]
    xwalk["fafb_id_reviewed"] = [idstr(v) for v in xwalk["fafb_id_reviewed"]]
    xwalk["fafb_id_meta"] = [idstr(v) for v in xwalk["fafb_id_meta"]]
    xwalk.to_parquet(OUT / "fafb_banc_crosswalk.parquet", index=False)
    print(f"fafb_banc_crosswalk.parquet: with fafb_id={(xwalk['fafb_id'] != '').sum()}")

    # --- sensory / motor channels
    sensory = neurons[neurons["super_class"].isin(["sensory", "sensory_ascending"])]
    sensory_channels = sensory[[
        "banc_888_id", "root_888", "cell_type", "cell_function",
        "body_part_sensory", "peripheral_target_type", "side",
        "neurotransmitter_predicted_v2",
    ]].copy()
    sensory_channels.to_parquet(OUT / "sensory_channels.parquet", index=False)
    print(f"sensory_channels.parquet: {sensory_channels.shape}")
    print(sensory_channels.groupby(
        ["body_part_sensory", "peripheral_target_type"], dropna=False).size()
        .sort_values(ascending=False).head(20).to_string())

    motor = neurons[neurons["super_class"] == "motor"]
    motor_channels = motor[[
        "banc_888_id", "root_888", "cell_type", "cell_function",
        "body_part_effector", "peripheral_target_type", "side",
        "neurotransmitter_predicted_v2",
    ]].copy()
    motor_channels.to_parquet(OUT / "motor_channels.parquet", index=False)
    body_targets = (motor_channels.groupby(
        ["body_part_effector", "peripheral_target_type", "cell_type"],
        dropna=False).size().rename("n_motor_neurons").reset_index())
    body_targets.to_parquet(OUT / "body_targets.parquet", index=False)
    print(f"motor_channels.parquet: {motor_channels.shape}")
    print(f"body_targets.parquet: {body_targets.shape}")
    print(body_targets.sort_values("n_motor_neurons", ascending=False).head(30).to_string())

    # --- edgelist -> analysis parquet + engine CSR binary
    edge = RAW / "edgelist_simple_v2.feather"
    if edge.exists() and edge.stat().st_size > 300_000_000:
        e = pd.read_feather(edge)
        print("edgelist cols:", list(e.columns), e.shape)
        e.to_parquet(OUT / "synapses_edge.parquet", index=False)
        write_csr(e, OUT / "synapses.bin")
    else:
        print("edgelist not ready; skipping synapses outputs")


def write_csr(e: pd.DataFrame, path: Path):
    """Compact engine-ready CSR. Normalizes pre/post/weight column names."""
    cols = {c.lower(): c for c in e.columns}
    pre = next((cols[k] for k in cols if k in ("pre", "src", "source", "pre_root_id")), None)
    post = next((cols[k] for k in cols if k in ("post", "dst", "target", "post_root_id")), None)
    w = next((cols[k] for k in cols if k in ("weight", "syn_count", "n_syn", "synapses")), None)
    if pre is None or post is None:
        print(f"cannot normalize edgelist columns {list(e.columns)}; skipping synapses.bin")
        return
    import numpy as np

    ids = pd.read_parquet(OUT / "neurons.parquet")[["banc_888_id"]].copy()
    id2idx = {v: i for i, v in enumerate(ids["banc_888_id"].to_numpy())}
    df = pd.DataFrame({"s": e[pre].map(id2idx), "d": e[post].map(id2idx)})
    if w is not None:
        df["w"] = e[w].to_numpy()
    else:
        df["w"] = 1.0
    df = df.dropna().astype({"s": "int32", "d": "int32", "w": "float32"})
    df = df.sort_values(["s", "d"]).reset_index(drop=True)
    n = len(ids)
    counts = np.bincount(df["s"].to_numpy(), minlength=n).astype(np.int64)
    offsets = np.zeros(n + 1, dtype=np.int64)
    np.cumsum(counts, out=offsets[1:])
    with open(path, "wb") as f:
        f.write(b"BANC CSR1")
        f.write(struct.pack("<qq", n, len(df)))
        f.write(offsets.astype("<i8").tobytes())
        f.write(df["d"].to_numpy().astype("<i4").tobytes())
        f.write(df["w"].to_numpy().astype("<f4").tobytes())
    print(f"synapses.bin: n={n} edges={len(df)} size={path.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
