"""Generate BANC → Three.js channel LUT.

Reads motor_channels.parquet + sensory_channels.parquet.
Writes dist/banc-channels.json (and a copy under brain-body/banc/).

Usage: brain-body/.venv/Scripts/python.exe brain-body/banc/mk_channel_lut.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from id_utils import identifier_text

BASE = Path(__file__).parent
ROOT = BASE.parent.parent
OUTS = (ROOT / "dist" / "banc-channels.json", BASE / "banc-channels.json")

LEG_CODE = {"front_leg": "F", "middle_leg": "M", "hind_leg": "H"}
SIDE_CODE = {"left": "L", "right": "R"}

# First matching substring wins. accessory_* must precede the generic names.
LEG_RULES = (
    ("accessory_tibia_flexor", "tibia", "x", 1.0, 0.4),
    ("tibia_flexor", "tibia", "x", 1.0, 1.0),
    ("tibia_extensor", "tibia", "x", -1.0, 1.0),
    ("femur_reductor", "femur", "z", 1.0, 1.0),
    ("accessory_trochanter_flexor", "coxa", "z", 1.0, 0.4),
    ("tergotrochanter_extensor", "coxa", "y", -1.0, 1.0),
    ("sternotrochanter", "coxa", "y", 1.0, 1.0),
    ("trochanter_flexor", "coxa", "z", 1.0, 1.0),
    ("trochanter_extensor", "coxa", "z", -1.0, 1.0),
    ("long_tendon", "tarsus", "x", 1.0, 1.0),
    ("tarsus_depressor", "tarsus", "x", 1.0, 1.0),
    ("tarsus_levator", "tarsus", "x", -1.0, 1.0),
    ("tergopleural_promotor", "coxa", "y", 1.0, 1.0),
    ("sternal_posterior_rotator", "coxa", "y", -1.0, 1.0),
    ("sternal_anterior_rotator", "coxa", "y", 1.0, 1.0),
    ("sternal_adductor", "coxa", "z", 1.0, 0.5),
    ("pleural_remotor", "coxa", "y", -1.0, 1.0),
)

WING_Y = ("i1", "i2", "iii1", "iii3", "iii4", "iv1", "iv2", "iv3", "iv4")
WING_X = ("b1", "b2", "b3", "tp1", "tp2", "tpn", "ps1", "ps2", "pleurosternal")


def clean(v) -> str:
    if v is None or (isinstance(v, float) and v != v):
        return ""
    try:
        if pd.isna(v):
            return ""
    except (TypeError, ValueError):
        pass
    return str(v)


def sid(v) -> str:
    return identifier_text(v, field="banc_888_id")


def bone_side(side: str) -> str | None:
    return SIDE_CODE.get(str(side).lower())


def map_motor(row) -> tuple[str | None, str, float, float, str]:
    """Return (bone, axis, sign, gain, reason). bone is None if unmapped."""
    bp = clean(row.get("body_part_effector"))
    tgt = clean(row.get("peripheral_target_type"))
    tl = tgt.lower()
    side = bone_side(row.get("side"))
    cell = clean(row.get("cell_function"))

    if bp in LEG_CODE:
        if not side:
            return None, "x", 1.0, 1.0, "leg MN missing side"
        prefix = f"leg_{LEG_CODE[bp]}{side}"
        for needle, seg, axis, sign, gain in LEG_RULES:
            if needle in tl:
                return f"{prefix}_{seg}", axis, sign, gain, ""
        return None, "x", 1.0, 1.0, f"unmapped leg target {tgt}"

    if bp == "wing":
        if not side:
            return None, "z", 1.0, 1.0, "wing MN missing side"
        bone = f"wing_{side}"
        if "dorsal_longitudinal" in tl:
            return bone, "z", 1.0, 1.0, "power DLM kinematic stub"
        if "dorsoventral" in tl:
            return bone, "z", -1.0, 1.0, "power DVM kinematic stub"
        if any(k in tl for k in WING_Y):
            return bone, "y", 1.0 if side == "L" else -1.0, 1.0, "steering"
        if any(k in tl for k in WING_X) or "wing" in tl:
            return bone, "x", 1.0 if side == "L" else -1.0, 1.0, "steering"
        return bone, "x", 1.0, 0.5, "untyped wing muscle"

    if bp == "haltere":
        if not side:
            return None, "z", 1.0, 1.0, "haltere MN missing side"
        if "leg_muscle" in tl:
            return None, "z", 1.0, 1.0, "haltere row labeled leg_muscle"
        return f"haltere_{side}", "z", 1.0, 1.0, ""

    if bp == "neck":
        sign = 1.0 if side != "R" else -1.0
        if "depressor" in tl:
            return "head", "x", 1.0, 1.0, ""
        if "levator" in tl:
            return "head", "x", -1.0, 1.0, ""
        return "head", "y", sign, 1.0, ""

    if bp in ("proboscis", "pharynx"):
        return "proboscis", "x", 1.0, 1.0 if bp == "proboscis" else 0.5, ""

    if bp == "antenna":
        if not side:
            return None, "z", 1.0, 1.0, "antenna MN missing side"
        return f"antenna_{side}", "z", 1.0, 1.0, ""

    if bp == "abdomen":
        return None, "x", 1.0, 1.0, "abdomen assigned below"
    return None, "x", 1.0, 1.0, f"viscera/other {bp or 'unknown'} {cell}"


def map_proprio(row) -> dict | None:
    bp = clean(row.get("body_part_sensory"))
    if bp not in LEG_CODE:
        return None
    tgt = clean(row.get("peripheral_target_type"))
    tl = tgt.lower()
    side = bone_side(row.get("side"))
    if not side:
        return None
    prefix = f"leg_{LEG_CODE[bp]}{side}"
    ctype = clean(row.get("cell_type"))
    cl = ctype.lower()
    if tgt not in (
        "chordotonal_organ",
        "hair_plate",
        "campaniform_sensillum",
        "campaniform_sensillum_neuron",
    ):
        return None
    if "claw" in cl:
        encode, bone, tuning = "angle", f"{prefix}_tibia", "claw"
    elif "hook" in cl:
        encode, bone, tuning = "velocity", f"{prefix}_tibia", "hook"
    elif tgt == "hair_plate":
        encode, bone, tuning = "limit", f"{prefix}_coxa", "hair_plate"
    elif "campaniform" in tl:
        encode, bone, tuning = "velocity", f"{prefix}_femur", "campaniform"
    else:
        encode, bone, tuning = "angle", f"{prefix}_tibia", "untyped_chordotonal"
    return {
        "id": sid(row.get("banc_888_id")),
        "idx": -1,
        "body_part": bp,
        "target": tgt,
        "cell_type": ctype,
        "side": clean(row.get("side")),
        "bones": [bone],
        "encode": encode,
        "tuning": tuning,
    }


def main() -> None:
    motor_df = pd.read_parquet(BASE / "motor_channels.parquet")
    sensory_df = pd.read_parquet(BASE / "sensory_channels.parquet")

    motor = []
    abdomen_rows = []
    for rec in motor_df.to_dict("records"):
        bone, axis, sign, gain, reason = map_motor(rec)
        entry = {
            "id": sid(rec.get("banc_888_id")),
            "idx": -1,
            "body_part": clean(rec.get("body_part_effector")),
            "target": clean(rec.get("peripheral_target_type")),
            "cell_type": clean(rec.get("cell_type")),
            "side": clean(rec.get("side")),
            "bone": bone,
            "axis": axis,
            "sign": sign,
            "gain": gain,
        }
        if reason:
            entry["reason"] = reason
        if clean(rec.get("body_part_effector")) == "abdomen":
            abdomen_rows.append(entry)
        else:
            if bone is None:
                entry["bone"] = None
            motor.append(entry)

    for i, entry in enumerate(abdomen_rows):
        entry["bone"] = f"abdomen_{(i % 6) + 1}"
        entry["axis"] = "x"
        entry["sign"] = 1.0
        entry["gain"] = 1.0
        entry.pop("reason", None)
        motor.append(entry)

    proprio = []
    for rec in sensory_df.to_dict("records"):
        p = map_proprio(rec)
        if p:
            proprio.append(p)

    mapped = sum(1 for m in motor if m.get("bone"))
    out = {
        "meta": {
            "source": "BANC v888 synapses_v2",
            "sexMismatch": "male-morphology/female-CNS",
            "n_motor": len(motor),
            "n_motor_mapped": mapped,
            "n_proprio": len(proprio),
        },
        "motor": motor,
        "proprio": proprio,
    }
    text = json.dumps(out, separators=(",", ":"), allow_nan=False)
    for p in OUTS:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
        print(f"wrote {p} motor={len(motor)} mapped={mapped} proprio={len(proprio)}")


if __name__ == "__main__":
    main()
