"""Probe BANC published artifacts (sizes/endpoints) without downloading the connectome.

Uses only stdlib. Queries Zenodo records cited in Bates et al. 2026 and the
BANC-project GitHub repo metadata. Read-only, no auth.
Usage: python tools/probe_banc.py
"""
import json
import urllib.request

ZENODO = [
    ("BANC-Project", 20350642),
    ("bancpipeline", 20350572),
    ("synister_banc (NT predictor)", 20350570),
]
GITHUB_API = "https://api.github.com/repos/htem/BANC-project"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "fly-neural-lab-probe"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    for name, rec in ZENODO:
        try:
            d = get(f"https://zenodo.org/api/records/{rec}")
            files = d.get("files", [])
            total = sum(f.get("size", 0) for f in files)
            print(f"== {name} (zenodo:{rec}): {d.get('metadata', {}).get('title', '')[:80]}")
            print(f"   {len(files)} files, {total / 1e9:.2f} GB total")
            for f in sorted(files, key=lambda f: -f.get("size", 0))[:8]:
                print(f"   - {f.get('key')}: {f.get('size', 0) / 1e6:.1f} MB")
        except Exception as e:  # noqa: BLE001
            print(f"== {name}: FAILED {e}")
    try:
        d = get(GITHUB_API)
        print(f"== GitHub htem/BANC-project: {d.get('description', '')[:100]}")
        print(f"   default_branch={d.get('default_branch')} size={d.get('size')}KB")
    except Exception as e:  # noqa: BLE001
        print(f"== GitHub: FAILED {e}")


if __name__ == "__main__":
    main()
