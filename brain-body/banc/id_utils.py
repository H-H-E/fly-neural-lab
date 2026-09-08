"""Exact identifier handling shared by BANC preprocessing scripts."""
from __future__ import annotations

import math
import numbers


def identifier_text(value, *, field: str = "identifier") -> str:
    """Return a decimal identifier without ever passing through float.

    BANC IDs are opaque decimal identifiers. Integer values are accepted because
    pandas/Arrow may expose an exact integer scalar; floating-point values are
    rejected rather than rounded, even when they look integral.
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        raise ValueError(f"{field} must be a decimal string or integer, not bool")
    if isinstance(value, numbers.Integral):
        text = str(int(value))
    elif isinstance(value, numbers.Real):
        if math.isnan(value):
            return ""
        raise ValueError(
            f"{field} received a floating-point value; preserve the original ID as a string"
        )
    elif isinstance(value, bytes):
        text = value.decode("utf-8").strip()
    else:
        text = str(value).strip()

    if text in ("", "<NA>"):
        return ""
    if not text.isascii() or not text.isdecimal():
        raise ValueError(f"{field} is not a decimal identifier: {text!r}")
    return text


def identifier_series(series, *, field: str, preserve_null: bool = False):
    """Normalize a scalar series while preserving exact decimal text."""
    def normalize(value):
        text = identifier_text(value, field=field)
        return text or (None if preserve_null else "")

    return series.map(normalize)
