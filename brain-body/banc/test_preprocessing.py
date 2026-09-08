"""Regression tests for exact BANC identifiers and synapse multiplicity."""
from __future__ import annotations

import struct
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

import build  # noqa: E402
from id_utils import identifier_text  # noqa: E402


EXACT_A = "720575941633499884"
EXACT_B = "720575941472733451"
EXACT_C = "720575941662395704"


def read_weights(path: Path) -> tuple[list[str], np.ndarray, np.ndarray]:
    with path.open("rb") as stream:
        if stream.read(9) != b"BANC CSR1":
            raise AssertionError("bad CSR magic")
        n, edge_count = struct.unpack("<qq", stream.read(16))
        offsets = np.fromfile(stream, dtype="<i8", count=n + 1)
        destinations = np.fromfile(stream, dtype="<i4", count=edge_count)
        weights = np.fromfile(stream, dtype="<f4", count=edge_count)
    return [str(n), str(edge_count)], offsets, np.column_stack((destinations, weights))


class PreprocessingTests(unittest.TestCase):
    def test_count_column_preserves_exact_synapse_multiplicity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            tmp_path = Path(directory)
            pd.DataFrame({"banc_888_id": [EXACT_A, EXACT_B, EXACT_C]}).to_parquet(
                tmp_path / "neurons.parquet", index=False
            )
            original_out = build.OUT
            build.OUT = tmp_path
            try:
                edges = pd.DataFrame(
                    {
                        "pre": [EXACT_A, EXACT_B],
                        "post": [EXACT_B, EXACT_C],
                        "count": [17, 29],
                    }
                )
                build.write_csr(edges, tmp_path / "synapses.bin")
            finally:
                build.OUT = original_out

            header, offsets, payload = read_weights(tmp_path / "synapses.bin")
            self.assertEqual(header, ["3", "2"])
            self.assertEqual(offsets.tolist(), [0, 1, 2, 2])
            self.assertEqual(payload[:, 0].tolist(), [1, 2])
            self.assertEqual(payload[:, 1].tolist(), [17.0, 29.0])

    def test_missing_multiplicity_column_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            tmp_path = Path(directory)
            pd.DataFrame({"banc_888_id": [EXACT_A, EXACT_B]}).to_parquet(
                tmp_path / "neurons.parquet", index=False
            )
            original_out = build.OUT
            build.OUT = tmp_path
            try:
                edges = pd.DataFrame({"pre": [EXACT_A], "post": [EXACT_B]})
                with self.assertRaisesRegex(ValueError, "multiplicity"):
                    build.write_csr(edges, tmp_path / "synapses.bin")
            finally:
                build.OUT = original_out

    def test_identifier_text_never_rounds_large_float_ids(self) -> None:
        self.assertEqual(identifier_text(EXACT_A), EXACT_A)
        self.assertEqual(identifier_text(720575941633499884), EXACT_A)
        with self.assertRaisesRegex(ValueError, "floating-point"):
            identifier_text(7.205759416334998e17)

    def test_channel_identifier_conversion_preserves_decimal_strings(self) -> None:
        from mk_channel_lut import sid

        self.assertEqual(sid(EXACT_A), EXACT_A)
        self.assertEqual(sid(720575941633499884), EXACT_A)
        with self.assertRaisesRegex(ValueError, "floating-point"):
            sid(7.205759416334998e17)


if __name__ == "__main__":
    unittest.main()
