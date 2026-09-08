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
import argparse
import gzip
import shutil
import struct
import sys
from pathlib import Path

import pandas as pd

from id_utils import identifier_series

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


def main(*, one_row_per_synapse: bool = False):
    if not META.exists():
        sys.exit(f"missing required input: {META}")
    m = pd.read_parquet(META)
    keep = [c for c in NEURON_COLS if c in m.columns]
    neurons = m[keep].copy()
    neurons["banc_888_id"] = identifier_series(neurons["banc_888_id"], field="banc_888_id")
    neurons["root_888"] = identifier_series(
        neurons["root_888"], field="root_888", preserve_null=True
    )
    if neurons["banc_888_id"].eq("").any() or neurons["banc_888_id"].duplicated().any():
        raise ValueError("neurons metadata has missing or duplicate banc_888_id values")
    neurons.to_parquet(OUT / "neurons.parquet", index=False)
    print(f"neurons.parquet: {neurons.shape}")

    # --- crosswalk: reviewed matches primary, in-meta fafb_match fallback
    xwalk = neurons[["banc_888_id", "root_888", "cell_type", "fafb_match"]].copy()
    xwalk = xwalk.rename(columns={"fafb_match": "fafb_id_meta"})
    xwalk["fafb_id_meta"] = identifier_series(xwalk["fafb_id_meta"], field="fafb_id_meta")
    reviewed = RAW / "banc_fafb_reviewed_matches.csv"
    if reviewed.exists():
        r = pd.read_csv(reviewed, dtype="string")
        r = r[r["valid"] == "t"].dropna(subset=["pt_root_id", "match_id"])
        numeric = r["pt_root_id"].str.fullmatch(r"\d+") & r["match_id"].str.fullmatch(r"\d+")
        print(f"reviewed rows valid={len(r)}, numeric={(numeric.fillna(False)).sum()}")
        r = r[numeric.fillna(False)].copy()
        r["pt_root_id"] = identifier_series(r["pt_root_id"], field="pt_root_id")
        r["match_id"] = identifier_series(r["match_id"], field="match_id")
        r = r[["pt_root_id", "match_id", "match_cell_type"]]
        r = r.rename(columns={"pt_root_id": "banc_888_id",
                              "match_id": "fafb_id_reviewed",
                              "match_cell_type": "fafb_type_reviewed"})
        if r["banc_888_id"].duplicated().any():
            raise ValueError("reviewed crosswalk has duplicate banc_888_id keys")
        known = set(xwalk["banc_888_id"])
        reviewed_ids = set(r["banc_888_id"])
        print(
            "reviewed join losses: "
            f"matched={len(known & reviewed_ids)} "
            f"unmatched_reviewed={len(reviewed_ids - known)} "
            f"unmatched_neurons={len(known - reviewed_ids)}"
        )
        xwalk = xwalk.merge(r, on="banc_888_id", how="left", validate="one_to_one")
        print(f"reviewed matches joined: {xwalk['fafb_id_reviewed'].notna().sum()}")
    for c in ("fafb_id_reviewed", "fafb_id_meta"):
        if c not in xwalk.columns:
            xwalk[c] = ""
    xwalk["fafb_id_reviewed"] = identifier_series(
        xwalk["fafb_id_reviewed"], field="fafb_id_reviewed"
    )
    xwalk["fafb_id_meta"] = identifier_series(xwalk["fafb_id_meta"], field="fafb_id_meta")
    xwalk["fafb_id"] = [reviewed or meta for meta, reviewed in zip(
        xwalk["fafb_id_meta"], xwalk["fafb_id_reviewed"]
    )]
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
        write_csr(e, OUT / "synapses.bin", one_row_per_synapse=one_row_per_synapse)
    else:
        print("edgelist not ready; skipping synapses outputs")


def write_csr(
    e: pd.DataFrame,
    path: Path,
    *,
    one_row_per_synapse: bool = False,
):
    """Write engine-ready CSR from an exact-ID edge table.

    The normal source contract is an aggregated neuron-pair table with a
    positive multiplicity column. Per-synapse input is permitted only through
    the explicit ``one_row_per_synapse`` audit flag.
    """
    import numpy as np

    cols = {str(c).lower(): c for c in e.columns}
    pre = next((cols[k] for k in ("pre", "src", "source", "pre_root_id") if k in cols), None)
    post = next((cols[k] for k in ("post", "dst", "target", "post_root_id") if k in cols), None)
    weight_names = ("weight", "syn_count", "n_syn", "synapses", "count")
    w = next((cols[k] for k in weight_names if k in cols), None)
    if pre is None or post is None:
        raise ValueError(f"cannot normalize edgelist columns {list(e.columns)}")
    if w is None and not one_row_per_synapse:
        raise ValueError(
            "edgelist has no supported synapse multiplicity column; "
            "select the audited one-row-per-synapse source format explicitly"
        )
    if w is not None and not one_row_per_synapse and e.duplicated([pre, post]).any():
        raise ValueError("aggregated edge table contains duplicate pre/post pairs")

    ids = pd.read_parquet(OUT / "neurons.parquet")[["banc_888_id"]].copy()
    ids["banc_888_id"] = identifier_series(ids["banc_888_id"], field="banc_888_id")
    if ids["banc_888_id"].eq("").any() or ids["banc_888_id"].duplicated().any():
        raise ValueError("neurons.parquet has missing or duplicate banc_888_id values")
    id2idx = {value: index for index, value in enumerate(ids["banc_888_id"])}

    source = pd.DataFrame({
        "pre_id": identifier_series(e[pre], field=str(pre)),
        "post_id": identifier_series(e[post], field=str(post)),
    })
    source["s"] = source["pre_id"].map(id2idx)
    source["d"] = source["post_id"].map(id2idx)
    if w is None:
        source["w"] = 1.0
        print("using audited one-row-per-synapse input; every retained row has weight 1")
    else:
        source["w"] = pd.to_numeric(e[w], errors="raise").to_numpy()
    if not np.isfinite(source["w"]).all() or (source["w"] <= 0).any():
        raise ValueError(f"{w} must contain positive finite multiplicities/weights")

    missing_pre = source["s"].isna()
    missing_post = source["d"].isna()
    missing = missing_pre | missing_post
    if missing.any():
        lost_rows = int(missing.sum())
        lost_weight = float(source.loc[missing, "w"].sum())
        print(
            "edge endpoint join losses: "
            f"rows={lost_rows} multiplicity={lost_weight:g} "
            f"missing_pre={int(missing_pre.sum())} missing_post={int(missing_post.sum())}"
        )
        raise ValueError("edge table contains endpoints absent from neurons.parquet")
    print(
        "edge endpoint join losses: rows=0 multiplicity=0 "
        f"source_rows={len(source)} source_multiplicity={float(source['w'].sum()):g}"
    )

    df = source[["s", "d", "w"]].astype({"s": "int32", "d": "int32", "w": "float32"})
    df = df.sort_values(["s", "d"], kind="mergesort").reset_index(drop=True)
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
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--one-row-per-synapse",
        action="store_true",
        help="explicitly audit a source where each row is one synapse",
    )
    main(one_row_per_synapse=parser.parse_args().one_row_per_synapse)
