import base64, json
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
BASE = "http://127.0.0.1:8177/evidence/blender-pass/harness.html"

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    # perf per tier (site ships 'standard')
    for tier in ["low", "standard", "hero"]:
        pg = b.new_page(viewport={"width": 920, "height": 740})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{BASE}?detail={tier}")
        pg.wait_for_function("window.__ready === true", timeout=90000)
        print(tier, "perf:", pg.evaluate("window.__perf"),
              "bones:", len(pg.evaluate("window.__spec")["bones"]),
              "meshes:", len(pg.evaluate("window.__spec")["meshes"]),
              "errors:", errs if errs else "none")
        if tier == "standard":
            for name, url in pg.evaluate("window.__shots").items():
                raw = base64.b64decode(url.split(",", 1)[1])
                open(f"{OUT}/site_{name}.png", "wb").write(raw)
            json.dump(pg.evaluate("window.__spec"), open(f"{OUT}/fly_spec_site.json", "w"), indent=1)
            # rig interface check (kinematic consumer contract)
            print("rig:", pg.evaluate("""async () => {
              const m = await import('/dist/fly-model/flyRigged.mjs');
              const fly = m.createDrosophilaMale({detail:'standard'});
              m.resetPose(fly);
              const j = fly.group.userData.rig.jointNames;
              const need = ['fly_root','thorax','head','wing_L','wing_R','haltere_L',
                'leg_FL_coxa','leg_FL_femur','leg_FL_tibia','leg_FL_tarsus',
                'arista_L','abdomen_3','terminalia','proboscis'];
              return {bones: j.length, missing: need.filter(n=>!j.includes(n)),
                      clips: fly.clips.map(c=>c.name)};
            }"""))
        pg.close()
    b.close()
print("done")
