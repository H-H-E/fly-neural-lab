import base64, json, sys
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 920, "height": 740})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://127.0.0.1:8177/evidence/blender-pass/harness.html")
    pg.wait_for_function("window.__ready === true", timeout=90000)
    shots = pg.evaluate("window.__shots")
    for name, url in shots.items():
        raw = base64.b64decode(url.split(",", 1)[1])
        open(f"{OUT}/base_{name}.png", "wb").write(raw)
        print("saved", name, len(raw))
    spec = pg.evaluate("window.__spec")
    json.dump(spec, open(f"{OUT}/fly_spec.json", "w"), indent=1)
    print("bones:", len(spec["bones"]), "meshes:", len(spec["meshes"]))
    try:
        print("perf:", pg.evaluate("window.__perf"))
    except Exception as e:
        print("perf: n/a", e)
    print("bbox:", spec["bbox"])
    b.close()
print("ERRORS:", errs[:10] if errs else "none")
