"""Browser QA: model boundaries, controls, and representative lesson pages."""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8090/"
OUT = pathlib.Path(__file__).resolve().parent / "evidence" / "flylab"
OUT.mkdir(parents=True, exist_ok=True)
log = {"steps": []}


def main() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--disable-http-cache"])
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        errors = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console[{m.type}]: {m.text[:160]}") if m.type == "error" else None)

        page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("() => window.__qa", timeout=20000)
        log["pose"] = page.evaluate("() => window.__qa ? window.__qa() : null")

        webgl = page.evaluate(
            "() => { const c = document.querySelector('#scene');"
            " const gl = c.getContext('webgl2') || c.getContext('webgl');"
            " const d = gl && gl.getExtension('WEBGL_debug_renderer_info');"
            " return { hasGL: !!gl,"
            " renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a',"
            " w: c.width, h: c.height }; }"
        )
        log["webgl"] = webgl
        page.screenshot(path=str(OUT / "flylab_home.png"), timeout=15000)

        ready = False
        try:
            page.wait_for_function(
                "() => !document.getElementById('flex').disabled",
                timeout=120000,
            )
            ready = True
            identity = page.eval_on_selector("#banc-status", "e => e.textContent")
            before = page.evaluate("() => window.__qa()")
            page.click("#flex")
            page.wait_for_function("() => Number(window.__qa().bancTime) > 0", timeout=10000)
            page.wait_for_timeout(1000)
            after = page.evaluate("() => window.__qa()")
            page.click("#pause")
            paused = page.evaluate("() => window.__qa().bancTime")
            page.wait_for_timeout(500)
            paused_after = page.evaluate("() => window.__qa().bancTime")
            log["sim"] = {
                "ready": ready,
                "status": page.eval_on_selector("#status", "e => e.textContent"),
                "identity": identity,
                "flexDisabled": page.eval_on_selector("#flex", "e => e.disabled"),
                "simtime": page.eval_on_selector("#banc-simtime", "e => e.textContent"),
                "spikes": page.eval_on_selector("#banc-spikes", "e => e.textContent"),
                "source": page.eval_on_selector("#active-source", "e => e.textContent"),
                "advanced": after["bancTime"] > before["bancTime"],
                "outputObserved": page.eval_on_selector("#banc-spikes", "e => e.textContent") != "—",
                "pauseFreezesTime": abs(paused_after - paused) < 1e-12,
            }
            page.click("#reset")
            page.wait_for_function("() => window.__qa().bancTime === 0", timeout=10000)
            log["reset"] = page.evaluate("() => window.__qa()")
            page.click("#kick")
            page.wait_for_function("() => document.getElementById('active-source').textContent.includes('Direct joint demo')", timeout=5000)
            log["directDemo"] = page.evaluate("() => window.__qa()")
            page.screenshot(path=str(OUT / "flylab_flex.png"), timeout=15000)
        except Exception as e:  # noqa: BLE001
            log["sim"] = {"ready": ready, "error": str(e)[:200]}

        page.goto(BASE + "lesson.html", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("() => window.__lessonQA", timeout=10000)
        page.select_option("#pulse-pattern", "close")
        page.click("#neuron-run")
        lesson = page.evaluate("() => window.__lessonQA()")
        log["lesson"] = lesson
        page.screenshot(path=str(OUT / "flylab_lesson.png"), timeout=15000)

        page.goto(BASE + "reflex.html", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("() => window.__reflexQA", timeout=20000)
        page.evaluate(
            """() => { const e = document.getElementById('bend'); e.value = 110; e.dispatchEvent(new Event('input', {bubbles: true})); }"""
        )
        reflex = page.evaluate("() => window.__reflexQA()")
        page.click("#perturb")
        reflex["afterBendAndPerturb"] = page.evaluate("() => window.__reflexQA()")
        log["reflex"] = reflex
        page.screenshot(path=str(OUT / "flylab_reflex.png"), timeout=15000)

        log["errors"] = errors[:8]
        browser.close()

    (OUT / "qa.json").write_text(json.dumps(log, indent=2))
    print(json.dumps(log, indent=2))
    checks = [
        ready,
        log.get("sim", {}).get("advanced", False),
        log.get("sim", {}).get("outputObserved", False),
        "BANC v888" in log.get("sim", {}).get("identity", ""),
        log.get("sim", {}).get("pauseFreezesTime", False),
        log.get("reset", {}).get("bancTime") == 0,
        log.get("directDemo", {}).get("source") == "Direct joint demo",
        log.get("lesson", {}).get("neuronSpikes", 0) > 0,
        abs(log.get("reflex", {}).get("afterBendAndPerturb", {}).get("theta", 0) - 130) < 1e-6,
    ]
    return 0 if all(checks) else 1


if __name__ == "__main__":
    sys.exit(main())
