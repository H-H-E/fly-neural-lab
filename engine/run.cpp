#include<stdlib.h>
#include "objects.h"
#include<ctime>
#include<random>

#include "code_objects/default_neurons_spike_resetter_codeobject.h"
#include "code_objects/default_neurons_spike_thresholder_codeobject.h"
#include "code_objects/default_neurons_stateupdater_codeobject.h"
#include "code_objects/default_synapses_pre_codeobject.h"
#include "code_objects/default_synapses_pre_push_spikes.h"
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


void brian_start()
{
	_init_arrays();
	_load_arrays();
	// Initialize clocks (link timestep and dt to the respective arrays)
    brian::defaultclock.timestep = brian::_array_defaultclock_timestep;
    brian::defaultclock.t = brian::_array_defaultclock_t;
    brian::defaultclock.dt = brian::_array_defaultclock_dt;
}

void brian_end()
{
	_write_arrays();
	_dealloc_arrays();
}


