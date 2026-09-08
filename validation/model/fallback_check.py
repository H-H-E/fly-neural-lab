"""Mobile, no-WebGL and failed-asset browser regression gates."""
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'evidence/rig-bridge'
OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
reports={}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for mode in ['mobile','software','missing-glb']:
            page=browser.new_page(viewport={'width':390 if mode=='mobile' else 1200,'height':844},reduced_motion='reduce')
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            if mode=='software':
                page.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args)}")
            if mode=='missing-glb':
                page.route('**/fly_refined.glb',lambda route:route.abort())
            page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='networkidle')
            page.wait_for_function('window.__storyQA')
            if mode=='missing-glb':
                assert page.locator('#render-fallback').is_visible()
                assert page.evaluate('window.__storyQA().scene === undefined')
            else:
                page.wait_for_function('window.__storyQA().scene')
                snap=page.evaluate('window.__storyQA()')
                assert snap['scene']['flyModel']['format']==('glb' if mode=='mobile' else 'procedural-fallback')
                assert not snap['scene']['motion']
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
                reports[mode]=snap['scene']['flyModel']
                page.screenshot(path=str(OUT/f'{mode}.png'),animations='disabled')
            page.click('.dock-chapter[href="#neuron"]')
            page.wait_for_function("window.__storyQA().chapter === 'neuron'")
            page.click('#neuron-run')
            page.wait_for_function('window.__storyQA().labs.neuron.time > 0')
            assert not errors, errors
            page.close()
        browser.close()
    (OUT/'fallback-report.json').write_text(json.dumps(reports,indent=2))
    print('PASS mobile GLB + reduced motion, no-WebGL procedural fallback, missing-GLB text fallback; neuron controls work in all three')
finally:
    server.shutdown()
