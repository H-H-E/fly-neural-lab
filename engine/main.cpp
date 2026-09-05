#include <emscripten/emscripten.h>
#include "fly_lazy.h"
#include <fstream>
#include <stdlib.h>
#include "objects.h"
#include <csignal>
#include <ctime>
#include <time.h>

#include "run.h"
#include "brianlib/common_math.h"

#include "code_objects/default_neurons_spike_resetter_codeobject.h"
#include "code_objects/default_neurons_spike_thresholder_codeobject.h"
#include "code_objects/after_run_default_neurons_spike_thresholder_codeobject.h"
#include "code_objects/default_neurons_stateupdater_codeobject.h"
#include "code_objects/default_synapses_pre_codeobject.h"
#include "code_objects/default_synapses_pre_push_spikes.h"
#include "code_objects/before_run_default_synapses_pre_push_spikes.h"
#include "code_objects/default_synapses_synapses_create_array_codeobject.h"
#include "code_objects/poissoninput_10_codeobject.h"
#include "code_objects/poissoninput_11_codeobject.h"
#include "code_objects/poissoninput_12_codeobject.h"
#include "code_objects/poissoninput_13_codeobject.h"
#include "code_objects/poissoninput_14_codeobject.h"
#include "code_objects/poissoninput_15_codeobject.h"
#include "code_objects/poissoninput_16_codeobject.h"
#include "code_objects/poissoninput_17_codeobject.h"
#include "code_objects/poissoninput_18_codeobject.h"
#include "code_objects/poissoninput_19_codeobject.h"
#include "code_objects/poissoninput_1_codeobject.h"
#include "code_objects/poissoninput_20_codeobject.h"
#include "code_objects/poissoninput_2_codeobject.h"
#include "code_objects/poissoninput_3_codeobject.h"
#include "code_objects/poissoninput_4_codeobject.h"
#include "code_objects/poissoninput_5_codeobject.h"
#include "code_objects/poissoninput_6_codeobject.h"
#include "code_objects/poissoninput_7_codeobject.h"
#include "code_objects/poissoninput_8_codeobject.h"
#include "code_objects/poissoninput_9_codeobject.h"
#include "code_objects/poissoninput_codeobject.h"
#include "code_objects/spikemonitor_codeobject.h"


#include <iostream>
#include <fstream>
#include <string>




void set_from_command_line(const std::vector<std::string> args)
{
    for (const auto& arg : args) {
		// Split into two parts
		size_t equal_sign = arg.find("=");
		auto name = arg.substr(0, equal_sign);
		auto value = arg.substr(equal_sign + 1, arg.length());
		brian::set_variable_by_name(name, value);
	}
}

void _int_handler(int signal_num) {
	if (Network::_globally_running && !Network::_globally_stopped) {
		Network::_globally_stopped = true;
	} else {
		std::signal(signal_num, SIG_DFL);
		std::raise(signal_num);
	}
}

int main(int argc, char **argv)
{
	std::signal(SIGINT, _int_handler);
	std::random_device _rd;
	std::vector<std::string> args(argv + 1, argv + argc);
	if (args.size() >=2 && args[0] == "--results_dir")
	{
		brian::results_dir = args[1];
		#ifdef DEBUG
		std::cout << "Setting results dir to '" << brian::results_dir << "'" << std::endl;
		#endif
		args.erase(args.begin(), args.begin()+2);
	}
        

	brian_start();
        

	{
		using namespace brian;

		
                
        _array_defaultclock_timestep[0] = 0;
        _array_defaultclock_dt[0] = 0.0001;
        _array_defaultclock_dt[0] = 0.0001;
        _array_defaultclock_dt[0] = 0.0001;
        for (int _i=0; _i<1; _i++)
            brian::_random_generators[_i].seed(42L + _i);
        _array_defaultclock_dt[0] = 0.0001;
        
                        
                        for(int i=0; i<_num__array_default_neurons_lastspike; i++)
                        {
                            _array_default_neurons_lastspike[i] = - 10000.0;
                        }
                        
        
                        
                        for(int i=0; i<_num__array_default_neurons_not_refractory; i++)
                        {
                            _array_default_neurons_not_refractory[i] = true;
                        }
                        
        
                        
                        for(int i=0; i<_num__array_default_neurons_v; i++)
                        {
                            _array_default_neurons_v[i] = - 0.052000000000000005;
                        }
                        
        
                        
                        for(int i=0; i<_num__array_default_neurons_g; i++)
                        {
                            _array_default_neurons_g[i] = 0;
                        }
                        
        
                        
                        for(int i=0; i<_num__array_default_neurons_rfc; i++)
                        {
                            _array_default_neurons_rfc[i] = 0.0022;
                        }
                        
        _dynamic_array_default_synapses_delay.resize(1);
        _dynamic_array_default_synapses_delay.resize(1);
        _dynamic_array_default_synapses_delay[0] = 0.0018000000000000002;
        
                        
                        for(int i=0; i<_num__array_default_synapses_sources; i++)
                        {
                            _array_default_synapses_sources[i] = _static_array__array_default_synapses_sources[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__array_default_synapses_targets; i++)
                        {
                            _array_default_synapses_targets[i] = _static_array__array_default_synapses_targets[i];
                        }
                        
        _run_default_synapses_synapses_create_array_codeobject();
        
                        
                        for(int i=0; i<_dynamic_array_default_synapses_w.size(); i++)
                        {
                            _dynamic_array_default_synapses_w[i] = _static_array__dynamic_array_default_synapses_w[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc[i]] = _static_array__value__array_default_neurons_rfc[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_1; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_1[i]] = _static_array__value__array_default_neurons_rfc_1[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_2; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_2[i]] = _static_array__value__array_default_neurons_rfc_2[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_3; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_3[i]] = _static_array__value__array_default_neurons_rfc_3[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_4; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_4[i]] = _static_array__value__array_default_neurons_rfc_4[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_5; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_5[i]] = _static_array__value__array_default_neurons_rfc_5[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_6; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_6[i]] = _static_array__value__array_default_neurons_rfc_6[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_7; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_7[i]] = _static_array__value__array_default_neurons_rfc_7[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_8; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_8[i]] = _static_array__value__array_default_neurons_rfc_8[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_9; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_9[i]] = _static_array__value__array_default_neurons_rfc_9[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_10; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_10[i]] = _static_array__value__array_default_neurons_rfc_10[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_11; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_11[i]] = _static_array__value__array_default_neurons_rfc_11[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_12; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_12[i]] = _static_array__value__array_default_neurons_rfc_12[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_13; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_13[i]] = _static_array__value__array_default_neurons_rfc_13[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_14; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_14[i]] = _static_array__value__array_default_neurons_rfc_14[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_15; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_15[i]] = _static_array__value__array_default_neurons_rfc_15[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_16; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_16[i]] = _static_array__value__array_default_neurons_rfc_16[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_17; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_17[i]] = _static_array__value__array_default_neurons_rfc_17[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_18; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_18[i]] = _static_array__value__array_default_neurons_rfc_18[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_19; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_19[i]] = _static_array__value__array_default_neurons_rfc_19[i];
                        }
                        
        
                        
                        for(int i=0; i<_num__static_array__index__array_default_neurons_rfc_20; i++)
                        {
                            _array_default_neurons_rfc[_static_array__index__array_default_neurons_rfc_20[i]] = _static_array__value__array_default_neurons_rfc_20[i];
                        }
                        
        _array_defaultclock_timestep[0] = 0;
        _array_defaultclock_t[0] = 0.0;
        _before_run_default_synapses_pre_push_spikes();
        network.clear();
        network.add(&defaultclock, _run_default_neurons_stateupdater_codeobject);
        network.add(&defaultclock, _run_spikemonitor_codeobject);
        network.add(&defaultclock, _run_default_synapses_pre_push_spikes);
        network.add(&defaultclock, _run_default_synapses_pre_codeobject);
        network.add(&defaultclock, _run_poissoninput_codeobject);
        network.add(&defaultclock, _run_poissoninput_1_codeobject);
        network.add(&defaultclock, _run_poissoninput_10_codeobject);
        network.add(&defaultclock, _run_poissoninput_11_codeobject);
        network.add(&defaultclock, _run_poissoninput_12_codeobject);
        network.add(&defaultclock, _run_poissoninput_13_codeobject);
        network.add(&defaultclock, _run_poissoninput_14_codeobject);
        network.add(&defaultclock, _run_poissoninput_15_codeobject);
        network.add(&defaultclock, _run_poissoninput_16_codeobject);
        network.add(&defaultclock, _run_poissoninput_17_codeobject);
        network.add(&defaultclock, _run_poissoninput_18_codeobject);
        network.add(&defaultclock, _run_poissoninput_19_codeobject);
        network.add(&defaultclock, _run_poissoninput_2_codeobject);
        network.add(&defaultclock, _run_poissoninput_20_codeobject);
        network.add(&defaultclock, _run_poissoninput_3_codeobject);
        network.add(&defaultclock, _run_poissoninput_4_codeobject);
        network.add(&defaultclock, _run_poissoninput_5_codeobject);
        network.add(&defaultclock, _run_poissoninput_6_codeobject);
        network.add(&defaultclock, _run_poissoninput_7_codeobject);
        network.add(&defaultclock, _run_poissoninput_8_codeobject);
        network.add(&defaultclock, _run_poissoninput_9_codeobject);
        network.add(&defaultclock, _run_default_neurons_spike_resetter_codeobject);
        set_from_command_line(args);
        /* initialized; worker advances the network through fly_step */
        _after_run_default_neurons_spike_thresholder_codeobject();
        #ifdef DEBUG
        _debugmsg_spikemonitor_codeobject();
        #endif
        
        #ifdef DEBUG
        _debugmsg_default_synapses_pre_codeobject();
        #endif

	}
        

    /* output is explicit through fly_finish */
    
	/* Keep state alive for worker calls. */
        

	return 0;
}
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
