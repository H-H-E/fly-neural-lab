"""Browser QA for Fly Lab with the rigged fly: render, errors, WebGL facts,
and (bounded) the neural Load/Start path."""
import json
import pathlib
import sys
import time

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
        time.sleep(3.5)  # top-level await import + model build + first frames

        webgl = page.evaluate(
            "() => { const c = document.querySelector('#scene');"
            " const gl = c.getContext('webgl2') || c.getContext('webgl');"
            " const d = gl.getExtension('WEBGL_debug_renderer_info');"
            " return { hasGL: !!gl,"
            " renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a',"
            " w: c.width, h: c.height }; }"
        )
        log["webgl"] = webgl

        # visual evidence, synchronous hooks are not available here (app.mjs
        # has no __capture) — use screenshot; canvas is transparent-bg over CSS
        page.screenshot(path=str(OUT / "flylab_home.png"), timeout=15000)

        # Load-path probe: click Load, wait for 'Brain ready' status (bounded)
        ready = False
        try:
            page.click("#load")
            page.wait_for_function(
                "() => /Brain ready/.test(document.getElementById('status').textContent)",
                timeout=120000,
            )
            ready = True
            page.click("#pause")  # Start
            page.wait_for_timeout(4000)
            log["sim"] = {
                "ready": ready,
                "status": page.eval_on_selector("#status", "e => e.textContent"),
                "simtime": page.eval_on_selector("#simtime", "e => e.textContent"),
                "spikes": page.eval_on_selector("#spikes", "e => e.textContent"),
                "speed": page.eval_on_selector("#speed", "e => e.textContent"),
            }
            page.screenshot(path=str(OUT / "flylab_running.png"), timeout=15000)
        except Exception as e:  # noqa: BLE001 - record, don't mask
            log["sim"] = {"ready": ready, "error": str(e)[:200]}

        log["errors"] = errors[:8]
        browser.close()

    (OUT / "qa.json").write_text(json.dumps(log, indent=2))
    print(json.dumps(log, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
