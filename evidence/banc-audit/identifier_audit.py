"""Verify deployed identifier corruption and exact-ID regeneration in temp paths."""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "brain-body" / "banc"
sys.path.insert(0, str(BASE))
import compact_csr  # noqa: E402
import mk_channel_lut  # noqa: E402
from id_utils import identifier_text  # noqa: E402


def main() -> None:
    metadata = pd.read_parquet(BASE / "neurons.parquet", columns=["banc_888_id"])
    exact_ids = set(metadata["banc_888_id"].map(identifier_text))
    old_pop = json.loads((ROOT / "dist" / "banc-population.json").read_text(encoding="utf-8"))["id"]
    old_channels = json.loads((ROOT / "dist" / "banc-channels.json").read_text(encoding="utf-8"))
    old_channel_ids = [entry["id"] for entry in old_channels["motor"] + old_channels["proprio"]]

    with tempfile.TemporaryDirectory(prefix="banc-id-audit-") as directory:
        temp = Path(directory)
        temp_dist = temp / "dist"
        temp_dist.mkdir()
        for name in ("neurons.parquet", "synapses.bin", "motor_channels.parquet", "sensory_channels.parquet"):
            shutil.copy2(BASE / name, temp / name)
        mk_channel_lut.BASE = temp
        mk_channel_lut.OUTS = (temp_dist / "banc-channels.json", temp / "banc-channels.json")
        mk_channel_lut.main()
        compact_csr.BASE = temp
        compact_csr.DIST = temp_dist
        compact_csr.CSR_IN = temp / "synapses.bin"
        compact_csr.main()
        new_pop = json.loads((temp_dist / "banc-population.json").read_text(encoding="utf-8"))["id"]
        new_channels = json.loads((temp_dist / "banc-channels.json").read_text(encoding="utf-8"))
        new_channel_ids = [entry["id"] for entry in new_channels["motor"] + new_channels["proprio"]]

    result = {
        "metadata_rows": len(exact_ids),
        "deployed_population_exact_id_matches": sum(str(value) in exact_ids for value in old_pop),
        "deployed_population_rows": len(old_pop),
        "deployed_channel_exact_id_matches": sum(value in exact_ids for value in old_channel_ids),
        "deployed_channel_rows": len(old_channel_ids),
        "temp_rebuilt_population_exact_id_matches": sum(value in exact_ids for value in new_pop),
        "temp_rebuilt_population_rows": len(new_pop),
        "temp_rebuilt_channel_exact_id_matches": sum(value in exact_ids for value in new_channel_ids),
        "temp_rebuilt_channel_rows": len(new_channel_ids),
        "deployed_population_examples": [str(value) for value in old_pop[:3]],
        "metadata_examples": metadata["banc_888_id"].head(3).tolist(),
        "temp_population_examples": new_pop[:3],
    }
    report = ROOT / "evidence" / "banc-audit" / "identifier-audit.json"
    if report.exists():
        raise SystemExit(f"refusing to overwrite existing audit report: {report}")
    report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    print(f"wrote immutable audit: {report}")


if __name__ == "__main__":
    main()
