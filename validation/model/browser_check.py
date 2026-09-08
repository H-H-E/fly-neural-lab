"""Real browser gate for the Blender asset and computational rig bridge."""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / os.environ.get('FLYLAB_EVIDENCE', 'evidence/rig-bridge')
OUT.mkdir(parents=True, exist_ok=True)
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(os.environ.get('FLYLAB_BASE', f'http://127.0.0.1:{server.server_port}/'), wait_until='domcontentloaded')
        # Exercise navigation while the GLB await is still in flight. The
        # eventual scene initialization must honor the user's chapter choice.
        page.click('.dock-chapter[href="#reflex"]')
        page.wait_for_function('window.__storyQA && window.__storyQA().scene', timeout=90000)
        assert page.evaluate('window.__storyQA().chapter') == 'reflex', 'Delayed GLB load lost an early chapter selection'
        snapshot = page.evaluate('window.__storyQA()')
        assert snapshot['scene']['flyModel'].get('format') == 'glb', 'Live scene still uses procedural geometry, not the Blender GLB'
        assert not errors, errors
        page.screenshot(path=str(OUT / 'home.png'), animations='disabled')
        assert snapshot['scene'].get('rigProbe', {}).get('FL_tibia'), 'Missing observation of actual Blender mesh vertices'
        snapshot['adapter'] = page.evaluate((ROOT / 'validation/model/rig_checks.js').read_text())
        page.click('#motion-toggle')
        page.click('.dock-chapter[href="#reflex"]')
        page.wait_for_function("window.__storyQA().chapter === 'reflex' && !document.getElementById('bend').disabled")
        page.click('#reflex-reset')
        rest = page.evaluate('window.__storyQA()')
        page.evaluate("document.getElementById('bend').value=120; document.getElementById('bend').dispatchEvent(new Event('input'))")
        bent = page.evaluate('window.__storyQA()')
        distance = lambda a,b: sum((x-y)**2 for x,y in zip(a,b))**.5
        assert distance(rest['scene']['rigProbe']['FL_tarsus'], bent['scene']['rigProbe']['FL_tarsus']) > .05
        assert distance(rest['scene']['rigProbe']['FR_tibia'], bent['scene']['rigProbe']['FR_tibia']) < 1e-6
        page.screenshot(path=str(OUT / 'reflex-bent.png'), animations='disabled')
        page.click('#reflex-reset')
        page.evaluate("document.getElementById('banc-panel').open=true")
        page.click('#banc-load')
        page.wait_for_function('window.__storyQA().labs.banc.ready', timeout=90000)
        page.evaluate("window.__rigSamples=[]; window.__rigTimer=setInterval(()=>window.__rigSamples.push(window.__storyQA()),20)")
        page.click('#flex')
        page.wait_for_function('window.__storyQA().labs.banc.time >= .1', timeout=90000)
        page.click('#banc-pause')
        page.evaluate('clearInterval(window.__rigTimer)')
        samples = page.evaluate('window.__rigSamples')
        assert any(s['labs']['banc'].get('sample', {}).get('spikes', 0) > 0 for s in samples), 'No observed real BANC motor spikes in QA'
        assert any(distance(s['scene']['rigProbe']['FL_tarsus'], rest['scene']['rigProbe']['FL_tarsus']) > .01 for s in samples), 'Real BANC output did not move Blender foot'
        assert all(not s['scene']['walking'] for s in samples), 'Walking preview contaminated neural proof'
        page.screenshot(path=str(OUT / 'banc-driven.png'), animations='disabled')
        snapshot['neuralProof'] = {'samples': samples, 'rest': rest, 'bent': bent}
        assert all(s['labs']['banc']['sample'].get('mode') != 'kick' for s in samples)
        assert any(s['labs']['banc']['sample'].get('source') == 'banc-direct-stimulus' for s in samples)
        page.click('#banc-reset')
        page.wait_for_function('window.__storyQA().labs.banc.time === 0')
        assert page.evaluate('window.__storyQA().labs.banc.sample') == {}, 'Reset retains stale neural sample'
        assert not errors, errors
        (OUT / 'browser-report.json').write_text(json.dumps(snapshot, indent=2))
        print(json.dumps({'model':snapshot['scene']['flyModel'], 'adapter':snapshot['adapter'], 'neuralSamples':len(samples), 'maxMotorSpikes':max(s['labs']['banc']['sample'].get('spikes',0) for s in samples), 'maxFootDisplacement':max(distance(s['scene']['rigProbe']['FL_tarsus'],rest['scene']['rigProbe']['FL_tarsus']) for s in samples), 'pageErrors':errors}))
        browser.close()
finally:
    server.shutdown()
