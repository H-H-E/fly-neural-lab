"""Extract the front-leg tibia reflex subgraph for the interactive probe.

Seeds: front_leg proprioceptors (chordotonal organ, hair plates, campaniform
sensilla) + front_leg motor neurons. Expands 2 hops forward from sensory and
1 hop back from MNs through the BANC v888 synapses_v2 edgelist.

Weight rule (Shiu et al. 2024, Methods): w = sign x count x 0.275 mV with
GABA/glutamate presynaptic = inhibitory (-1), all else (incl. unknown) = +1.

Usage: brain-body/.venv/Scripts/python.exe brain-body/banc/extract_tibia.py
Writes: brain-body/banc/tibia_front.json + dist/reflex-tibia.json
"""
import json
import sys
from collections import deque
from pathlib import Path

import pandas as pd

BASE = Path(__file__).parent
EDGE = BASE / "synapses_edge.parquet"
MAX_NODES = 12000
W_SYN_V = 0.275e-3  # V per synapse
INHIBITORY_NT = {"gaba", "glutamate"}


def main():
    if not EDGE.exists():
        sys.exit("missing synapses_edge.parquet — run build.py with full edgelist first")
    neurons = pd.read_parquet(BASE / "neurons.parquet")
    e = pd.read_parquet(EDGE)
    pre_c = next(c for c in e.columns if c.lower() in ("pre", "src", "source", "pre_root_id"))
    post_c = next(c for c in e.columns if c.lower() in ("post", "dst", "target", "post_root_id"))
    w_c = next((c for c in e.columns if c.lower() in ("weight", "syn_count", "n_syn", "synapses")), None)

    n = neurons.set_index("banc_888_id")
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
    seeds = set(neurons[is_feco | is_legmn]["banc_888_id"])
    print(f"seeds: FeCO={is_feco.sum()} legMN={is_legmn.sum()}")

    fwd = e.groupby(pre_c)[post_c].apply(set).to_dict()
    bwd = e.groupby(post_c)[pre_c].apply(set).to_dict()
    wmap = {}
    if w_c:
        for r in e[[pre_c, post_c, w_c]].itertuples(index=False):
            wmap[(r[0], r[1])] = float(r[2])

    keep = set(seeds)
    q = deque([(s, 0, "f") for s in neurons[is_feco]["banc_888_id"]])
    q += deque([(s, 0, "b") for s in neurons[is_legmn]["banc_888_id"]])
    while q and len(keep) < MAX_NODES:
        node, d, direction = q.popleft()
        if direction == "f" and d >= 2:
            continue
        if direction == "b" and d >= 1:
            continue
        nbrs = fwd.get(node, ()) if direction == "f" else bwd.get(node, ())
        for nb in nbrs:
            if nb not in keep:
                if len(keep) >= MAX_NODES:
                    break
                keep.add(nb)
                q.append((nb, d + 1, direction))

    sub = neurons[neurons["banc_888_id"].isin(keep)].copy().reset_index(drop=True)
    idx = {v: i for i, v in enumerate(sub["banc_888_id"])}
    se = e[e[pre_c].isin(keep) & e[post_c].isin(keep)]
    print(f"subgraph: nodes={len(sub)} edges={len(se)}")

    def sign_of(nt):
        return -1 if str(nt).lower() in INHIBITORY_NT else 1

    src, dst, cnt = [], [], []
    for r in se[[pre_c, post_c]].itertuples(index=False):
        s, d = idx[r[0]], idx[r[1]]
        c = int(wmap.get((r[0], r[1]), 1)) if w_c else 1
        src.append(s)
        dst.append(d)
        cnt.append(c)
    sgn = [sign_of(nt) for nt in sub["neurotransmitter_predicted_v2"]]

    roles = []
    for _, r in sub.iterrows():
        if r["banc_888_id"] in set(neurons[is_feco]["banc_888_id"]):
            roles.append("sensory")
        elif r["super_class"] == "motor":
            roles.append("motor")
        elif r["super_class"] == "descending":
            roles.append("descending")
        elif r["super_class"] == "ascending":
            roles.append("ascending")
        else:
            roles.append("vnc" if "ventral" in str(r["region"]).lower() or
                          r["super_class"] == "ventral_nerve_cord_intrinsic" else "central")

    out = {
        "meta": {
            "source": "BANC v888 synapses_v2",
            "w_syn_V": W_SYN_V,
            "nt_rule": "gaba/glutamate inhibitory, else excitatory",
            "n_nodes": len(sub), "n_edges": len(src),
        },
        "id": sub["banc_888_id"].tolist(),
        "cell_type": sub["cell_type"].fillna("").tolist(),
        "role": roles,
        "target": sub["peripheral_target_type"].fillna("").tolist(),
        "side": sub["side"].fillna("").tolist(),
        "pre_sign": sgn,
        "src": src, "dst": dst, "count": cnt,
    }
    for p in (BASE / "tibia_front.json", Path("dist/reflex-tibia.json")):
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w") as f:
            json.dump(out, f)
        print(f"wrote {p} ({p.stat().st_size / 1e6:.1f} MB)")
    flex = sub[(sub["super_class"] == "motor")
               & sub["peripheral_target_type"].str.contains("flexor", na=False)]
    print(f"tibia flexor MNs in subgraph: {len(flex)}")


if __name__ == "__main__":
    main()
