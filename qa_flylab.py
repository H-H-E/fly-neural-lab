"""Optional browser regression suite for the unified story.

Run against a local HTTP server: python qa_flylab.py
Override FLYLAB_BASE to check a deployment; FLYLAB_FULL_MODELS=1 includes downloads.
The suite is useful on a workstation/CI with Playwright Chromium installed.
"""
import json
import os
import pathlib
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('FLYLAB_BASE', 'http://127.0.0.1:8090/').rstrip('/') + '/'
OUT = pathlib.Path(__file__).resolve().parent / 'evidence' / 'scrollytelling'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'base': BASE, 'checks': []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 960}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        page.wait_for_function('!!window.__storyQA')
        assert page.evaluate('!!window.__storyQA().scene'), '3D specimen or software projection must initialize'
        report['renderer'] = page.evaluate('window.__storyQA().scene')
        report['checks'].append('initial specimen, no model download required')
        page.screenshot(path=str(OUT / 'desktop.png'))

        page.locator('a.start-story').click()
        expect(page.locator('body')).to_have_attribute('data-chapter', 'neuron')
        page.locator('#neuron-run').click()
        expect(page.locator('#neuron-result')).to_contain_text('No spike.', timeout=12000)
        page.get_by_text('Close together', exact=True).click()
        page.locator('#neuron-run').click()
        expect(page.locator('#neuron-result')).to_contain_text('The input pushed', timeout=12000)
        assert int(page.locator('#neuron-count').inner_text()) > 0
        page.locator('#neuron-reset').click()
        assert page.locator('#neuron-count').inner_text() == '0'
        page.locator('#neuron-run').click()
        page.wait_for_function('window.__storyQA().labs.neuron.time > 20')
        page.locator('a.dock-chapter[href="#circuit"]').click()
        expect(page.locator('body')).to_have_attribute('data-chapter', 'circuit')
        assert not page.evaluate('window.__storyQA().labs.neuron.running')
        report['checks'].append('weak/close pulses, reset, and pause on chapter exit')

        page.locator('#circuit-run').click()
        expect(page.locator('#circuit-result')).to_contain_text('2 output spikes', timeout=12000)
        page.locator('#circuit-inhibition').uncheck()
        page.locator('#circuit-run').click()
        expect(page.locator('#circuit-result')).to_contain_text('3 output spikes', timeout=12000)
        page.locator('[data-node="inhibitory"]').click()
        expect(page.locator('#node-description')).to_contain_text('still fires')
        report['checks'].append('inhibition changes output from 2 to 3; node inspection works')
        page.screenshot(path=str(OUT / 'circuit.png'))

        page.locator('a.dock-chapter[href="#reflex"]').click()
        expect(page.locator('#bend')).to_be_enabled(timeout=20000)
        page.locator('#bend').focus()
        page.locator('#bend').press('Home')
        for _ in range(10):
            page.locator('#bend').press('ArrowRight')
        page.locator('#perturb').click()
        assert float(page.locator('#bend-value').inner_text().rstrip('°')) == 40
        page.locator('#reflex-run').click()
        page.wait_for_function('window.__storyQA().labs.reflex.time > .025')
        page.locator('#reflex-run').click()
        frozen = page.evaluate('window.__storyQA().labs.reflex.time')
        page.locator('#reflex-reset').click()
        assert float(page.locator('#reflex-time').inner_text().split()[0]) == 0
        page.get_by_text('Passive only', exact=True).click()
        page.locator('#perturb').click()
        page.locator('#reflex-run').click()
        page.wait_for_function('window.__storyQA().labs.reflex.time > .04')
        page.locator('#reflex-run').click()
        assert page.evaluate('window.__storyQA().labs.reflex.neuralTorque') == 0
        assert frozen > 0
        report['checks'].append('keyboard Bend, perturb, pause/reset, passive baseline')

        if os.environ.get('FLYLAB_FULL_MODELS') == '1':
            page.locator('#banc-panel summary').click()
            page.locator('#banc-load').click()
            expect(page.locator('#flex')).to_be_enabled(timeout=120000)
            page.locator('#flex').click()
            expect(page.locator('#banc-status')).to_contain_text('Stimulus complete', timeout=60000)
            assert page.evaluate('window.__storyQA().labs.banc.time') > 0
            page.locator('#kick').click()
            expect(page.locator('#scene-source')).to_contain_text('DIRECT JOINT DEMO')
            page.locator('a.dock-chapter[href="#brain"]').click()
            page.locator('#brain-load').click()
            expect(page.locator('#brain-run')).to_be_enabled(timeout=180000)
            page.locator('#sugar').check()
            page.locator('#brain-run').click()
            page.wait_for_function('window.__storyQA().labs.brain.time > .1')
            page.locator('#brain-run').click()
            page.locator('#brain-unload').click()
            expect(page.locator('#brain-status')).to_contain_text('Memory released')
            report['checks'].append('full BANC stimulus/direct demo and FlyWire sugar/run/unload')

        for path, chapter in [('lesson.html', 'neuron'), ('reflex.html', 'reflex'), ('taste.html', 'brain')]:
            page.goto(BASE + path)
            expect(page.locator('body')).to_have_attribute('data-chapter', chapter)
        report['checks'].append('legacy entry routes reach the right chapters')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(BASE)
        page.wait_for_function('!!window.__storyQA')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile must not overflow'
        assert not page.evaluate('window.__storyQA().motion'), 'system reduced motion is honored'
        page.screenshot(path=str(OUT / 'mobile.png'))
        page.locator('a.start-story').click()
        expect(page.locator('body')).to_have_attribute('data-chapter', 'neuron')
        page.get_by_text('Close together', exact=True).click()
        page.locator('#neuron-run').click()
        expect(page.locator('#neuron-result')).to_contain_text('The input pushed', timeout=12000)
        report['checks'].append('mobile overflow, reduced motion, story navigation, and working experiment')
        assert not errors, errors
        browser.close()
    (OUT / 'qa.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
