"""Browser QA: home loads, BANC ready, Flex the shin is clickable."""
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
        time.sleep(3.5)

        webgl = page.evaluate(
            "() => { const c = document.querySelector('#scene');"
            " const gl = c.getContext('webgl2') || c.getContext('webgl');"
            " const d = gl.getExtension('WEBGL_debug_renderer_info');"
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
            page.click("#flex")
            page.wait_for_timeout(2500)
            log["sim"] = {
                "ready": ready,
                "status": page.eval_on_selector("#status", "e => e.textContent"),
                "flexDisabled": page.eval_on_selector("#flex", "e => e.disabled"),
            }
            page.screenshot(path=str(OUT / "flylab_flex.png"), timeout=15000)
        except Exception as e:  # noqa: BLE001
            log["sim"] = {"ready": ready, "error": str(e)[:200]}

        log["errors"] = errors[:8]
        browser.close()

    (OUT / "qa.json").write_text(json.dumps(log, indent=2))
    print(json.dumps(log, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    sys.exit(main())
