"""Extract the front-leg tibia reflex subgraph for the interactive probe.

Seeds: front_leg proprioceptors (chordotonal organ, hair plates, campaniform
sensilla) + front_leg motor neurons. Keeps 1-hop posts of sensory, 1-hop
pres of MNs, their intersection (likely reflex interneurons), and 2-hop
posts that still reach the MN neighborhood. Capped at MAX_NODES.

Weight rule (Shiu et al. 2024, Methods): w = sign x count x 0.275 mV with
GABA/glutamate presynaptic = inhibitory (-1), all else (incl. unknown) = +1.

Usage: brain-body/.venv/Scripts/python.exe brain-body/banc/extract_tibia.py
Writes: brain-body/banc/tibia_front.json + dist/reflex-tibia.json
"""
import json
import sys
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]  # repo root (brain-body/banc -> ../..)
EDGE = BASE / "synapses_edge.parquet"
MAX_NODES = 8000
W_SYN_V = 0.275e-3
INHIBITORY_NT = {"gaba", "glutamate"}


def main():
    if not EDGE.exists():
        sys.exit(f"missing {EDGE} — run build.py with full edgelist first")
    print("loading neurons + edgelist…", flush=True)
    neurons = pd.read_parquet(BASE / "neurons.parquet")
    e = pd.read_parquet(EDGE, columns=["pre", "post", "count"])
    e["pre"] = e["pre"].astype(str)
    e["post"] = e["post"].astype(str)
    neurons["banc_888_id"] = neurons["banc_888_id"].astype(str)

    is_feco = (
        (neurons["body_part_sensory"] == "front_leg")
        & (neurons["peripheral_target_type"].isin(
            ["chordotonal_organ", "hair_plate", "campaniform_sensillum",
             "campaniform_sensillum_neuron"]))
    )
    is_legmn = (
        (neurons["super_class"] == "motor")
        & (neurons["body_part_effector"] == "front_leg")
    )
    sens = set(neurons.loc[is_feco, "banc_888_id"])
    mns = set(neurons.loc[is_legmn, "banc_888_id"])
    print(f"seeds: FeCO={len(sens)} legMN={len(mns)} edges={len(e)}", flush=True)

    from_sens = e[e["pre"].isin(sens)]
    to_mn = e[e["post"].isin(mns)]
    posts_of_sens = set(from_sens["post"])
    pres_of_mn = set(to_mn["pre"])
    inter = posts_of_sens & pres_of_mn
    print(f"1-hop: posts_of_sens={len(posts_of_sens)} pres_of_mn={len(pres_of_mn)} inter={len(inter)}", flush=True)

    h1 = posts_of_sens | pres_of_mn
    from_h1 = e[e["pre"].isin(h1)]
    h2 = set(from_h1["post"]) & (pres_of_mn | mns | inter | posts_of_sens)
    print(f"2-hop intersecting neighborhood={len(h2)}", flush=True)

    priority = []
    seen = set()
    for group in (sens | mns, inter, h2, posts_of_sens, pres_of_mn):
        for x in group:
            if x not in seen:
                seen.add(x)
                priority.append(x)
    keep = set(priority[:MAX_NODES])
    print(f"keep={len(keep)} (cap {MAX_NODES})", flush=True)

    se = e[e["pre"].isin(keep) & e["post"].isin(keep)]
    sub = neurons[neurons["banc_888_id"].isin(keep)].copy().reset_index(drop=True)
    idx = {v: i for i, v in enumerate(sub["banc_888_id"])}
    print(f"subgraph: nodes={len(sub)} edges={len(se)}", flush=True)

    src = [idx[p] for p in se["pre"]]
    dst = [idx[p] for p in se["post"]]
    cnt = [int(c) for c in se["count"]]
    sgn = [-1 if str(nt).lower() in INHIBITORY_NT else 1
           for nt in sub["neurotransmitter_predicted_v2"]]

    feco_ids = sens
    roles = []
    for _, r in sub.iterrows():
        if r["banc_888_id"] in feco_ids:
            roles.append("sensory")
        elif r["super_class"] == "motor":
            roles.append("motor")
        elif r["super_class"] == "descending":
            roles.append("descending")
        elif r["super_class"] == "ascending":
            roles.append("ascending")
        elif r["super_class"] == "ventral_nerve_cord_intrinsic" or "ventral" in str(r["region"]).lower():
            roles.append("vnc")
        else:
            roles.append("central")

    out = {
        "meta": {
            "source": "BANC v888 synapses_v2",
            "w_syn_V": W_SYN_V,
            "nt_rule": "gaba/glutamate inhibitory, else excitatory",
            "n_nodes": len(sub),
            "n_edges": len(src),
        },
        "id": sub["banc_888_id"].tolist(),
        "cell_type": sub["cell_type"].fillna("").tolist(),
        "role": roles,
        "target": sub["peripheral_target_type"].fillna("").tolist(),
        "side": sub["side"].fillna("").tolist(),
        "pre_sign": sgn,
        "src": src, "dst": dst, "count": cnt,
    }
    for p in (BASE / "tibia_front.json", ROOT / "dist" / "reflex-tibia.json"):
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w") as f:
            json.dump(out, f)
        print(f"wrote {p} ({p.stat().st_size / 1e6:.1f} MB)", flush=True)
    flex = sub[(sub["super_class"] == "motor")
               & sub["peripheral_target_type"].str.contains("flexor", na=False)]
    print(f"flexor MNs in subgraph: {len(flex)}", flush=True)


if __name__ == "__main__":
    main()
