from pathlib import Path
import json,subprocess
root=Path(__file__).parent;engine=root/'engine'
main=engine/'main.cpp';s=main.read_text()
s=s.replace('network.run(10.0, NULL, 10.0);','/* initialized; worker advances the network through fly_step */')
s=s.replace('    fly_materialize();','    /* output is explicit through fly_finish */')
s=s.replace('std::ofstream("results/lazy_population.txt") << fly_live.size() << " " << 138639-fly_live.size() << "\\n";','')
s=s.replace('brian_end();','/* Keep state alive for worker calls. */')
s='#include <emscripten/emscripten.h>\n'+s
s+='''
int fly_sugar_enabled=1;
extern "C" {
EMSCRIPTEN_KEEPALIVE int fly_step(int ticks) {
    if(ticks<1 || ticks>10000) return -1;
    brian::_dynamic_array_spikemonitor_i.clear();
    brian::_dynamic_array_spikemonitor_t.clear();
    brian::_array_spikemonitor_N[0]=0;
    brian::network.run(ticks*0.0001,NULL,10.0);
    return brian::_dynamic_array_spikemonitor_i.size();
}
EMSCRIPTEN_KEEPALIVE void fly_sugar(int on) { fly_sugar_enabled=on!=0; }
EMSCRIPTEN_KEEPALIVE double fly_time() { return brian::network.t; }
EMSCRIPTEN_KEEPALIVE int fly_live_count() { return fly_live.size(); }
EMSCRIPTEN_KEEPALIVE int* fly_spike_ids() { return brian::_dynamic_array_spikemonitor_i.data(); }
EMSCRIPTEN_KEEPALIVE double* fly_spike_times() { return brian::_dynamic_array_spikemonitor_t.data(); }
EMSCRIPTEN_KEEPALIVE void fly_finish() { fly_materialize(); brian_end(); }
}
'''
main.write_text(s)
for p in (engine/'code_objects').glob('poissoninput*codeobject.cpp'):
 s=p.read_text();needle='    using namespace brian;';assert s.count(needle)==1
 s='extern int fly_sugar_enabled;\n'+s.replace(needle,needle+'\n    if(!fly_sugar_enabled) return;')
 p.write_text(s)
cmd=json.loads((root/'compile-command.json').read_text());cmd[-1]='../dist/brain-live.mjs'
cmd=[x.replace('["FS","callMain"]','["FS","callMain","HEAP32","HEAPF64"]') for x in cmd]
cmd.extend(['-sNO_EXIT_RUNTIME=1'])
subprocess.run(cmd,cwd=engine,check=True)
