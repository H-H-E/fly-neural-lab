import hashlib
import json
import subprocess
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "brain-body" / "banc"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    neurons = pd.read_parquet(BASE / "neurons.parquet")
    neurons["id"] = neurons["banc_888_id"].astype(str)
    raw = pd.read_parquet(
        BASE / "raw" / "banc_888_meta_20260521.parquet",
        columns=["banc_888_id", "other_names", "notes"],
    )
    raw["id"] = raw["banc_888_id"].astype(str)
    morphology = {
        row.id: {
            "other_names": "" if pd.isna(row.other_names) else str(row.other_names),
            "notes": "" if pd.isna(row.notes) else str(row.notes),
        }
        for row in raw.itertuples()
    }
    edges = pd.read_parquet(
        BASE / "synapses_edge.parquet", columns=["pre", "post", "count"]
    )
    edges["pre"] = edges["pre"].astype(str)
    edges["post"] = edges["post"].astype(str)
    edges["count"] = edges["count"].astype(int)
    graph = json.loads((ROOT / "dist" / "reflex-tibia.json").read_text())
    graph_ids = set(graph["id"])
    edges = edges[edges["pre"].isin(graph_ids) & edges["post"].isin(graph_ids)]

    def rows(mask: pd.Series) -> pd.DataFrame:
        return neurons[mask & neurons["id"].isin(graph_ids)].copy()

    sensory_mask = (
        neurons["body_part_sensory"].eq("front_leg")
        & neurons["side"].eq("left")
        & neurons["peripheral_target_type"].eq("chordotonal_organ")
        & neurons["cell_function"].eq("proprioception")
    )
    sensory_groups = []
    for subtype in ("position", "direction", "vibro_tactile"):
        data = rows(sensory_mask & neurons["cell_function_detailed"].eq(subtype))
        ids = sorted(data["id"].tolist())
        morph_counts = (
            data["id"]
            .map(lambda value: morphology.get(value, {}).get("other_names", ""))
            .value_counts(dropna=False)
            .to_dict()
        )
        sensory_groups.append(
            {
                "name": f"left_front_feco_{subtype}",
                "functional_role": "proprioceptor_candidate",
                "ids": ids,
                "morphology_counts": morph_counts,
                "morphology": [
                    {"source_id": value, **morphology.get(value, {})}
                    for value in ids
                ],
                "evidence_status": "directly_measured",
                "evidence": (
                    "BANC metadata: front_leg, left, chordotonal_organ, "
                    f"proprioception, cell_function_detailed={subtype}; raw "
                    "other_names/notes give claw/hook/club morphology labels where "
                    "present. Neither label establishes extension sensitivity."
                ),
                "resolution": [
                    {"source_id": value, "index": graph["id"].index(value)}
                    for value in ids
                ],
            }
        )

    motor_groups = []
    for name, cell_type, target in (
        ("left_tibia_flexor", "tibia_flexor", "tibia_flexor_muscle"),
        ("left_tibia_extensor", "tibia_extensor", "tibia_extensor_muscle"),
    ):
        data = rows(
            neurons["side"].eq("left")
            & neurons["body_part_effector"].eq("front_leg")
            & neurons["super_class"].eq("motor")
            & neurons["cell_type"].str.contains(cell_type, case=False, na=False)
            & neurons["peripheral_target_type"].eq(target)
        )
        ids = sorted(data["id"].tolist())
        motor_groups.append(
            {
                "name": name,
                "functional_role": cell_type,
                "ids": ids,
                "muscle_target": target,
                "evidence_status": "directly_measured",
                "evidence": (
                    "BANC metadata assigns the cell to the left front leg and the "
                    "named tibia muscle target; force direction and moment arm "
                    "remain unvalidated."
                ),
                "resolution": [
                    {"source_id": value, "index": graph["id"].index(value)}
                    for value in ids
                ],
            }
        )

    def routes(source_ids: list[str], target_ids: list[str]) -> list[dict]:
        source = set(source_ids)
        target = set(target_ids)
        direct = edges[edges["pre"].isin(source) & edges["post"].isin(target)]
        outgoing = edges[edges["pre"].isin(source)]
        incoming = edges[edges["post"].isin(target)]
        relay = set(outgoing["post"]) & set(incoming["pre"]) - source - target
        one_out = outgoing[outgoing["post"].isin(relay)]
        one_in = incoming[incoming["pre"].isin(relay)]
        result = []
        if len(direct):
            result.append(
                {
                    "kind": "direct",
                    "pre_ids": sorted(set(direct["pre"])),
                    "post_ids": sorted(set(direct["post"])),
                    "relay_ids": [],
                    "edge_count": int(len(direct)),
                    "multiplicity_sum": int(direct["count"].sum()),
                    "pair_count": int(len(direct)),
                }
            )
        if relay:
            result.append(
                {
                    "kind": "one_hop",
                    "pre_ids": sorted(source),
                    "post_ids": sorted(target),
                    "relay_ids": sorted(relay),
                    "edge_count": int(len(one_out) + len(one_in)),
                    "multiplicity_sum": int(
                        one_out["count"].sum() + one_in["count"].sum()
                    ),
                    "pair_count": int(len(relay)),
                }
            )
        return result

    pathways = []
    for sensory in sensory_groups:
        for motor in motor_groups:
            found = routes(sensory["ids"], motor["ids"])
            if not found:
                raise ValueError(
                    f"no retained BANC path for {sensory['name']} -> {motor['name']}"
                )
            for path in found:
                path.update(
                    {
                        "name": f"{sensory['name']}_to_{motor['name']}",
                        "pre_group": sensory["name"],
                        "post_group": motor["name"],
                        "source": "BANC compact reflex graph",
                    }
                )
                pathways.append(path)

    spec = {
        "schema": "banc.front-left-tibia-resistance/v1",
        "status": "identity_gate_blocked",
        "purpose": "Freeze the first causal assay without assigning sensory identity from desired motor output.",
        "behavior": {
            "joint": "front-left femur-tibia",
            "side": "left",
            "leg": "prothoracic/front",
            "external_drive": "sensory_only",
            "extension_coordinate": {
                "symbol": "q",
                "units": "rad",
                "increases_with": "tibia_extension",
                "velocity_symbol": "q_dot",
            },
            "mechanical_target": "Muscle-generated torque must oppose externally imposed extension in Experiment B; no prescribed angle controller.",
        },
        "selection": {
            "extension_sensitive_status": "unknown",
            "extension_sensitive_reason": "The local BANC metadata contains front-left FeCO position/direction/vibro-tactile subtype labels but no independently supported claw/hook extension-sensitive identity. No neuron is promoted to extension-sensitive from simulated output.",
            "sensory_candidates": sensory_groups,
            "motor_units": motor_groups,
            "excluded_from_claims": [
                "campaniform_sensillum",
                "untyped chordotonal rows",
                "bilateral pools",
                "row-order abdomen mappings",
                "direct motor stimulation",
            ],
        },
        "pathways": pathways,
        "assay": {
            "experiment_a": {
                "baseline_ms": 250,
                "extension_deg": 10,
                "ramp_ms": 50,
                "hold_ms": 100,
                "mechanically_clamped": True,
            },
            "experiment_b": {
                "mechanics": "single_free_hinge",
                "external_perturbation": "logged_torque_pulse_or_release",
                "angle_source": "authoritative_mechanical_state",
            },
            "primary_endpoint": "Predeclare a left tibia flexor motor-unit response and compensatory torque; thresholds remain to be frozen after the identity gate.",
            "controls": [
                "sensory_transmission_cut",
                "motor_to_muscle_cut",
                "feedback_clamped",
                "justified_pathway_intervention",
                "direct_motor_calibration_separate",
            ],
        },
        "provenance": {
            "build_commit": subprocess.check_output(
                ["git", "rev-parse", "HEAD"], text=True
            ).strip(),
            "edge_table_sha256": sha256(BASE / "synapses_edge.parquet"),
            "graph_sha256": sha256(ROOT / "dist" / "reflex-tibia.json"),
            "metadata_file": "brain-body/banc/neurons.parquet",
            "morphology_file": "brain-body/banc/raw/banc_888_meta_20260521.parquet",
            "morphology_fields": "other_names, notes (claw/hook/club only; no extension/flexion split)",
            "edge_file": "brain-body/banc/synapses_edge.parquet",
            "resolved_graph": "dist/reflex-tibia.json",
            "graph_id_namespace": "banc_888_id decimal string",
            "edge_table_contract": "aggregated pre/post pairs with positive integer count",
            "neural_model": "BANC LIF v1; provenance only, not physiological validation",
        },
        "audit_notes": [
            "Exact source identifiers are retained as decimal strings and resolved to graph indices by identifier lookup.",
            "Pathways report actual BANC edges in the compact graph; they are not synthetic relay edges.",
            "The presence of a route does not establish sign, latency, or functional reflex direction.",
            "Regenerate this file if graph provenance changes.",
        ],
    }
    output = BASE / "circuits" / "fl_tibia_resistance.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(spec, indent=2) + "\n")
    print(
        json.dumps(
            {
                "output": str(output),
                "sensory_groups": len(sensory_groups),
                "motor_groups": len(motor_groups),
                "pathways": len(pathways),
                "bytes": output.stat().st_size,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
