

#include "objects.h"
#include "synapses_classes.h"
#include "brianlib/clocks.h"
#include "brianlib/dynamic_array.h"
#include "brianlib/stdint_compat.h"
#include "network.h"
#include<chrono>
#include<random>
#include<vector>
#include<iostream>
#include<fstream>
#include<map>
#include<tuple>
#include<cstdlib>
#include<string>

namespace brian {

std::string results_dir = "results/";  // can be overwritten by --results_dir command line arg

// For multhreading, we need one generator for each thread.
std::vector< RandomGenerator > _random_generators;

std::ostream& operator<<(std::ostream& out, const RandomGenerator& rng)
{
    return out << rng.gen;
}

std::istream& operator>>(std::istream& in, RandomGenerator& rng)
{
    return in >> rng.gen;
}

//////////////// networks /////////////////
Network network;

void set_variable_from_value(std::string varname, char* var_pointer, size_t size, char value) {
    #ifdef DEBUG
    std::cout << "Setting '" << varname << "' to " << (value == 1 ? "True" : "False") << std::endl;
    #endif
    std::fill(var_pointer, var_pointer+size, value);
}

template<class T> void set_variable_from_value(std::string varname, T* var_pointer, size_t size, T value) {
    #ifdef DEBUG
    std::cout << "Setting '" << varname << "' to " << value << std::endl;
    #endif
    std::fill(var_pointer, var_pointer+size, value);
}

template<class T> void set_variable_from_file(std::string varname, T* var_pointer, size_t data_size, std::string filename) {
    ifstream f;
    streampos size;
    #ifdef DEBUG
    std::cout << "Setting '" << varname << "' from file '" << filename << "'" << std::endl;
    #endif
    f.open(filename, ios::in | ios::binary | ios::ate);
    size = f.tellg();
    if (size != data_size) {
        std::cerr << "Error reading '" << filename << "': file size " << size << " does not match expected size " << data_size << std::endl;
        return;
    }
    f.seekg(0, ios::beg);
    if (f.is_open())
        f.read(reinterpret_cast<char *>(var_pointer), data_size);
    else
        std::cerr << "Could not read '" << filename << "'" << std::endl;
    if (f.fail())
        std::cerr << "Error reading '" << filename << "'" << std::endl;
}

//////////////// set arrays by name ///////
void set_variable_by_name(std::string name, std::string s_value) {
    size_t var_size;
    size_t data_size;
    // C-style or Python-style capitalization is allowed for boolean values
    if (s_value == "true" || s_value == "True")
        s_value = "1";
    else if (s_value == "false" || s_value == "False")
        s_value = "0";
    // non-dynamic arrays
    if (name == "default_neurons._spikespace") {
        var_size = 138640;
        data_size = 138640*sizeof(int32_t);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<int32_t>(name, _array_default_neurons__spikespace, var_size, (int32_t)atoi(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons__spikespace, data_size, s_value);
        }
        return;
    }
    if (name == "default_neurons.g") {
        var_size = 138639;
        data_size = 138639*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, _array_default_neurons_g, var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons_g, data_size, s_value);
        }
        return;
    }
    if (name == "default_neurons.lastspike") {
        var_size = 138639;
        data_size = 138639*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, _array_default_neurons_lastspike, var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons_lastspike, data_size, s_value);
        }
        return;
    }
    if (name == "default_neurons.not_refractory") {
        var_size = 138639;
        data_size = 138639*sizeof(char);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value(name, _array_default_neurons_not_refractory, var_size, (char)atoi(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons_not_refractory, data_size, s_value);
        }
        return;
    }
    if (name == "default_neurons.rfc") {
        var_size = 138639;
        data_size = 138639*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, _array_default_neurons_rfc, var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons_rfc, data_size, s_value);
        }
        return;
    }
    if (name == "default_neurons.v") {
        var_size = 138639;
        data_size = 138639*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, _array_default_neurons_v, var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, _array_default_neurons_v, data_size, s_value);
        }
        return;
    }
    // dynamic arrays (1d)
    if (name == "default_synapses.delay") {
        var_size = _dynamic_array_default_synapses_delay.size();
        data_size = var_size*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, &_dynamic_array_default_synapses_delay[0], var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, &_dynamic_array_default_synapses_delay[0], data_size, s_value);
        }
        return;
    }
    if (name == "default_synapses.w") {
        var_size = _dynamic_array_default_synapses_w.size();
        data_size = var_size*sizeof(double);
        if (s_value[0] == '-' || (s_value[0] >= '0' && s_value[0] <= '9')) {
            // set from single value
            set_variable_from_value<double>(name, &_dynamic_array_default_synapses_w[0], var_size, (double)atof(s_value.c_str()));

        } else {
            // set from file
            set_variable_from_file(name, &_dynamic_array_default_synapses_w[0], data_size, s_value);
        }
        return;
    }
    std::cerr << "Cannot set unknown variable '" << name << "'." << std::endl;
    exit(1);
}
//////////////// arrays ///////////////////
int32_t * _array_default_neurons__spikespace;
const int _num__array_default_neurons__spikespace = 138640;
double * _array_default_neurons_g;
const int _num__array_default_neurons_g = 138639;
int32_t * _array_default_neurons_i;
const int _num__array_default_neurons_i = 138639;
double * _array_default_neurons_lastspike;
const int _num__array_default_neurons_lastspike = 138639;
char * _array_default_neurons_not_refractory;
const int _num__array_default_neurons_not_refractory = 138639;
double * _array_default_neurons_rfc;
const int _num__array_default_neurons_rfc = 138639;
int32_t * _array_default_neurons_subgroup_10__sub_idx;
const int _num__array_default_neurons_subgroup_10__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_10__sub_idx_1;
const int _num__array_default_neurons_subgroup_10__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_11__sub_idx;
const int _num__array_default_neurons_subgroup_11__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_11__sub_idx_1;
const int _num__array_default_neurons_subgroup_11__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_12__sub_idx;
const int _num__array_default_neurons_subgroup_12__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_12__sub_idx_1;
const int _num__array_default_neurons_subgroup_12__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_13__sub_idx;
const int _num__array_default_neurons_subgroup_13__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_13__sub_idx_1;
const int _num__array_default_neurons_subgroup_13__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_14__sub_idx;
const int _num__array_default_neurons_subgroup_14__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_14__sub_idx_1;
const int _num__array_default_neurons_subgroup_14__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_15__sub_idx;
const int _num__array_default_neurons_subgroup_15__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_15__sub_idx_1;
const int _num__array_default_neurons_subgroup_15__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_16__sub_idx;
const int _num__array_default_neurons_subgroup_16__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_16__sub_idx_1;
const int _num__array_default_neurons_subgroup_16__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_17__sub_idx;
const int _num__array_default_neurons_subgroup_17__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_17__sub_idx_1;
const int _num__array_default_neurons_subgroup_17__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_18__sub_idx;
const int _num__array_default_neurons_subgroup_18__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_18__sub_idx_1;
const int _num__array_default_neurons_subgroup_18__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_19__sub_idx;
const int _num__array_default_neurons_subgroup_19__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_19__sub_idx_1;
const int _num__array_default_neurons_subgroup_19__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_1__sub_idx;
const int _num__array_default_neurons_subgroup_1__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_1__sub_idx_1;
const int _num__array_default_neurons_subgroup_1__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_20__sub_idx;
const int _num__array_default_neurons_subgroup_20__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_20__sub_idx_1;
const int _num__array_default_neurons_subgroup_20__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_21__sub_idx;
const int _num__array_default_neurons_subgroup_21__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_2__sub_idx;
const int _num__array_default_neurons_subgroup_2__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_2__sub_idx_1;
const int _num__array_default_neurons_subgroup_2__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_3__sub_idx;
const int _num__array_default_neurons_subgroup_3__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_3__sub_idx_1;
const int _num__array_default_neurons_subgroup_3__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_4__sub_idx;
const int _num__array_default_neurons_subgroup_4__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_4__sub_idx_1;
const int _num__array_default_neurons_subgroup_4__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_5__sub_idx;
const int _num__array_default_neurons_subgroup_5__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_5__sub_idx_1;
const int _num__array_default_neurons_subgroup_5__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_6__sub_idx;
const int _num__array_default_neurons_subgroup_6__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_6__sub_idx_1;
const int _num__array_default_neurons_subgroup_6__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_7__sub_idx;
const int _num__array_default_neurons_subgroup_7__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_7__sub_idx_1;
const int _num__array_default_neurons_subgroup_7__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_8__sub_idx;
const int _num__array_default_neurons_subgroup_8__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_8__sub_idx_1;
const int _num__array_default_neurons_subgroup_8__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup_9__sub_idx;
const int _num__array_default_neurons_subgroup_9__sub_idx = 1;
int32_t * _array_default_neurons_subgroup_9__sub_idx_1;
const int _num__array_default_neurons_subgroup_9__sub_idx_1 = 1;
int32_t * _array_default_neurons_subgroup__sub_idx;
const int _num__array_default_neurons_subgroup__sub_idx = 1;
double * _array_default_neurons_v;
const int _num__array_default_neurons_v = 138639;
int32_t * _array_default_synapses_N;
const int _num__array_default_synapses_N = 1;
int32_t * _array_default_synapses_sources;
const int _num__array_default_synapses_sources = 15091983;
int32_t * _array_default_synapses_targets;
const int _num__array_default_synapses_targets = 15091983;
double * _array_defaultclock_dt;
const int _num__array_defaultclock_dt = 1;
double * _array_defaultclock_t;
const int _num__array_defaultclock_t = 1;
int64_t * _array_defaultclock_timestep;
const int _num__array_defaultclock_timestep = 1;
int32_t * _array_spikemonitor__source_idx;
const int _num__array_spikemonitor__source_idx = 138639;
int32_t * _array_spikemonitor_count;
const int _num__array_spikemonitor_count = 138639;
int32_t * _array_spikemonitor_N;
const int _num__array_spikemonitor_N = 1;

//////////////// dynamic arrays 1d /////////
std::vector<int32_t> _dynamic_array_default_synapses__synaptic_post;
std::vector<int32_t> _dynamic_array_default_synapses__synaptic_pre;
std::vector<double> _dynamic_array_default_synapses_delay;
std::vector<int32_t> _dynamic_array_default_synapses_N_incoming;
std::vector<int32_t> _dynamic_array_default_synapses_N_outgoing;
std::vector<double> _dynamic_array_default_synapses_w;
std::vector<int32_t> _dynamic_array_spikemonitor_i;
std::vector<double> _dynamic_array_spikemonitor_t;

//////////////// dynamic arrays 2d /////////

/////////////// static arrays /////////////
int32_t * _static_array__array_default_synapses_sources;
const int _num__static_array__array_default_synapses_sources = 15091983;
int32_t * _static_array__array_default_synapses_targets;
const int _num__static_array__array_default_synapses_targets = 15091983;
double * _static_array__dynamic_array_default_synapses_w;
const int _num__static_array__dynamic_array_default_synapses_w = 15091983;
int32_t * _static_array__index__array_default_neurons_rfc;
const int _num__static_array__index__array_default_neurons_rfc = 1;
int32_t * _static_array__index__array_default_neurons_rfc_1;
const int _num__static_array__index__array_default_neurons_rfc_1 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_10;
const int _num__static_array__index__array_default_neurons_rfc_10 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_11;
const int _num__static_array__index__array_default_neurons_rfc_11 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_12;
const int _num__static_array__index__array_default_neurons_rfc_12 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_13;
const int _num__static_array__index__array_default_neurons_rfc_13 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_14;
const int _num__static_array__index__array_default_neurons_rfc_14 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_15;
const int _num__static_array__index__array_default_neurons_rfc_15 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_16;
const int _num__static_array__index__array_default_neurons_rfc_16 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_17;
const int _num__static_array__index__array_default_neurons_rfc_17 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_18;
const int _num__static_array__index__array_default_neurons_rfc_18 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_19;
const int _num__static_array__index__array_default_neurons_rfc_19 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_2;
const int _num__static_array__index__array_default_neurons_rfc_2 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_20;
const int _num__static_array__index__array_default_neurons_rfc_20 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_3;
const int _num__static_array__index__array_default_neurons_rfc_3 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_4;
const int _num__static_array__index__array_default_neurons_rfc_4 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_5;
const int _num__static_array__index__array_default_neurons_rfc_5 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_6;
const int _num__static_array__index__array_default_neurons_rfc_6 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_7;
const int _num__static_array__index__array_default_neurons_rfc_7 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_8;
const int _num__static_array__index__array_default_neurons_rfc_8 = 1;
int32_t * _static_array__index__array_default_neurons_rfc_9;
const int _num__static_array__index__array_default_neurons_rfc_9 = 1;
double * _static_array__value__array_default_neurons_rfc;
const int _num__static_array__value__array_default_neurons_rfc = 1;
double * _static_array__value__array_default_neurons_rfc_1;
const int _num__static_array__value__array_default_neurons_rfc_1 = 1;
double * _static_array__value__array_default_neurons_rfc_10;
const int _num__static_array__value__array_default_neurons_rfc_10 = 1;
double * _static_array__value__array_default_neurons_rfc_11;
const int _num__static_array__value__array_default_neurons_rfc_11 = 1;
double * _static_array__value__array_default_neurons_rfc_12;
const int _num__static_array__value__array_default_neurons_rfc_12 = 1;
double * _static_array__value__array_default_neurons_rfc_13;
const int _num__static_array__value__array_default_neurons_rfc_13 = 1;
double * _static_array__value__array_default_neurons_rfc_14;
const int _num__static_array__value__array_default_neurons_rfc_14 = 1;
double * _static_array__value__array_default_neurons_rfc_15;
const int _num__static_array__value__array_default_neurons_rfc_15 = 1;
double * _static_array__value__array_default_neurons_rfc_16;
const int _num__static_array__value__array_default_neurons_rfc_16 = 1;
double * _static_array__value__array_default_neurons_rfc_17;
const int _num__static_array__value__array_default_neurons_rfc_17 = 1;
double * _static_array__value__array_default_neurons_rfc_18;
const int _num__static_array__value__array_default_neurons_rfc_18 = 1;
double * _static_array__value__array_default_neurons_rfc_19;
const int _num__static_array__value__array_default_neurons_rfc_19 = 1;
double * _static_array__value__array_default_neurons_rfc_2;
const int _num__static_array__value__array_default_neurons_rfc_2 = 1;
double * _static_array__value__array_default_neurons_rfc_20;
const int _num__static_array__value__array_default_neurons_rfc_20 = 1;
double * _static_array__value__array_default_neurons_rfc_3;
const int _num__static_array__value__array_default_neurons_rfc_3 = 1;
double * _static_array__value__array_default_neurons_rfc_4;
const int _num__static_array__value__array_default_neurons_rfc_4 = 1;
double * _static_array__value__array_default_neurons_rfc_5;
const int _num__static_array__value__array_default_neurons_rfc_5 = 1;
double * _static_array__value__array_default_neurons_rfc_6;
const int _num__static_array__value__array_default_neurons_rfc_6 = 1;
double * _static_array__value__array_default_neurons_rfc_7;
const int _num__static_array__value__array_default_neurons_rfc_7 = 1;
double * _static_array__value__array_default_neurons_rfc_8;
const int _num__static_array__value__array_default_neurons_rfc_8 = 1;
double * _static_array__value__array_default_neurons_rfc_9;
const int _num__static_array__value__array_default_neurons_rfc_9 = 1;

//////////////// synapses /////////////////
// default_synapses
SynapticPathway default_synapses_pre(
    _dynamic_array_default_synapses__synaptic_pre,
    0, 138639);

//////////////// clocks ///////////////////
// attributes will be set in run.cpp
Clock defaultclock;

// Profiling information for each code object
std::chrono::nanoseconds default_neurons_spike_resetter_codeobject_profiling_info(0);
std::chrono::nanoseconds default_neurons_spike_thresholder_codeobject_profiling_info(0);
std::chrono::nanoseconds default_neurons_stateupdater_codeobject_profiling_info(0);
std::chrono::nanoseconds default_synapses_pre_codeobject_profiling_info(0);
std::chrono::nanoseconds default_synapses_pre_push_spikes_profiling_info(0);
std::chrono::nanoseconds poissoninput_10_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_11_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_12_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_13_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_14_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_15_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_16_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_17_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_18_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_19_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_1_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_20_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_2_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_3_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_4_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_5_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_6_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_7_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_8_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_9_codeobject_profiling_info(0);
std::chrono::nanoseconds poissoninput_codeobject_profiling_info(0);
std::chrono::nanoseconds spikemonitor_codeobject_profiling_info(0);
}

void _init_arrays()
{
    using namespace brian;

    // Arrays initialized to 0
    _array_default_neurons__spikespace = new int32_t[138640];
    
    for(int i=0; i<138640; i++) _array_default_neurons__spikespace[i] = 0;

    _array_default_neurons_g = new double[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_g[i] = 0;

    _array_default_neurons_i = new int32_t[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_i[i] = 0;

    _array_default_neurons_lastspike = new double[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_lastspike[i] = 0;

    _array_default_neurons_not_refractory = new char[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_not_refractory[i] = 0;

    _array_default_neurons_rfc = new double[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_rfc[i] = 0;

    _array_default_neurons_subgroup_10__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_10__sub_idx[i] = 0;

    _array_default_neurons_subgroup_10__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_10__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_11__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_11__sub_idx[i] = 0;

    _array_default_neurons_subgroup_11__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_11__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_12__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_12__sub_idx[i] = 0;

    _array_default_neurons_subgroup_12__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_12__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_13__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_13__sub_idx[i] = 0;

    _array_default_neurons_subgroup_13__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_13__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_14__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_14__sub_idx[i] = 0;

    _array_default_neurons_subgroup_14__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_14__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_15__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_15__sub_idx[i] = 0;

    _array_default_neurons_subgroup_15__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_15__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_16__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_16__sub_idx[i] = 0;

    _array_default_neurons_subgroup_16__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_16__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_17__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_17__sub_idx[i] = 0;

    _array_default_neurons_subgroup_17__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_17__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_18__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_18__sub_idx[i] = 0;

    _array_default_neurons_subgroup_18__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_18__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_19__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_19__sub_idx[i] = 0;

    _array_default_neurons_subgroup_19__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_19__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_1__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_1__sub_idx[i] = 0;

    _array_default_neurons_subgroup_1__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_1__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_20__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_20__sub_idx[i] = 0;

    _array_default_neurons_subgroup_20__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_20__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_21__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_21__sub_idx[i] = 0;

    _array_default_neurons_subgroup_2__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_2__sub_idx[i] = 0;

    _array_default_neurons_subgroup_2__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_2__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_3__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_3__sub_idx[i] = 0;

    _array_default_neurons_subgroup_3__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_3__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_4__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_4__sub_idx[i] = 0;

    _array_default_neurons_subgroup_4__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_4__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_5__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_5__sub_idx[i] = 0;

    _array_default_neurons_subgroup_5__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_5__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_6__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_6__sub_idx[i] = 0;

    _array_default_neurons_subgroup_6__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_6__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_7__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_7__sub_idx[i] = 0;

    _array_default_neurons_subgroup_7__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_7__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_8__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_8__sub_idx[i] = 0;

    _array_default_neurons_subgroup_8__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_8__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup_9__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_9__sub_idx[i] = 0;

    _array_default_neurons_subgroup_9__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_9__sub_idx_1[i] = 0;

    _array_default_neurons_subgroup__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup__sub_idx[i] = 0;

    _array_default_neurons_v = new double[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_v[i] = 0;

    _array_default_synapses_N = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_synapses_N[i] = 0;

    _array_default_synapses_sources = new int32_t[15091983];
    
    for(int i=0; i<15091983; i++) _array_default_synapses_sources[i] = 0;

    _array_default_synapses_targets = new int32_t[15091983];
    
    for(int i=0; i<15091983; i++) _array_default_synapses_targets[i] = 0;

    _array_defaultclock_dt = new double[1];
    
    for(int i=0; i<1; i++) _array_defaultclock_dt[i] = 0;

    _array_defaultclock_t = new double[1];
    
    for(int i=0; i<1; i++) _array_defaultclock_t[i] = 0;

    _array_defaultclock_timestep = new int64_t[1];
    
    for(int i=0; i<1; i++) _array_defaultclock_timestep[i] = 0;

    _array_spikemonitor__source_idx = new int32_t[138639];
    
    for(int i=0; i<138639; i++) _array_spikemonitor__source_idx[i] = 0;

    _array_spikemonitor_count = new int32_t[138639];
    
    for(int i=0; i<138639; i++) _array_spikemonitor_count[i] = 0;

    _array_spikemonitor_N = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_spikemonitor_N[i] = 0;

    _dynamic_array_default_synapses_delay.resize(1);
    
    for(int i=0; i<1; i++) _dynamic_array_default_synapses_delay[i] = 0;


    // Arrays initialized to an "arange"
    _array_default_neurons_i = new int32_t[138639];
    
    for(int i=0; i<138639; i++) _array_default_neurons_i[i] = 0 + i;

    _array_default_neurons_subgroup_10__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_10__sub_idx[i] = 129730 + i;

    _array_default_neurons_subgroup_10__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_10__sub_idx_1[i] = 126873 + i;

    _array_default_neurons_subgroup_11__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_11__sub_idx[i] = 126873 + i;

    _array_default_neurons_subgroup_11__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_11__sub_idx_1[i] = 28825 + i;

    _array_default_neurons_subgroup_12__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_12__sub_idx[i] = 28825 + i;

    _array_default_neurons_subgroup_12__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_12__sub_idx_1[i] = 126600 + i;

    _array_default_neurons_subgroup_13__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_13__sub_idx[i] = 126600 + i;

    _array_default_neurons_subgroup_13__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_13__sub_idx_1[i] = 126752 + i;

    _array_default_neurons_subgroup_14__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_14__sub_idx[i] = 126752 + i;

    _array_default_neurons_subgroup_14__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_14__sub_idx_1[i] = 32863 + i;

    _array_default_neurons_subgroup_15__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_15__sub_idx[i] = 32863 + i;

    _array_default_neurons_subgroup_15__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_15__sub_idx_1[i] = 108426 + i;

    _array_default_neurons_subgroup_16__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_16__sub_idx[i] = 108426 + i;

    _array_default_neurons_subgroup_16__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_16__sub_idx_1[i] = 111357 + i;

    _array_default_neurons_subgroup_17__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_17__sub_idx[i] = 111357 + i;

    _array_default_neurons_subgroup_17__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_17__sub_idx_1[i] = 14842 + i;

    _array_default_neurons_subgroup_18__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_18__sub_idx[i] = 14842 + i;

    _array_default_neurons_subgroup_18__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_18__sub_idx_1[i] = 90589 + i;

    _array_default_neurons_subgroup_19__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_19__sub_idx[i] = 90589 + i;

    _array_default_neurons_subgroup_19__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_19__sub_idx_1[i] = 92298 + i;

    _array_default_neurons_subgroup_1__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_1__sub_idx[i] = 69093 + i;

    _array_default_neurons_subgroup_1__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_1__sub_idx_1[i] = 97602 + i;

    _array_default_neurons_subgroup_20__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_20__sub_idx[i] = 92298 + i;

    _array_default_neurons_subgroup_20__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_20__sub_idx_1[i] = 12494 + i;

    _array_default_neurons_subgroup_21__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_21__sub_idx[i] = 12494 + i;

    _array_default_neurons_subgroup_2__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_2__sub_idx[i] = 97602 + i;

    _array_default_neurons_subgroup_2__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_2__sub_idx_1[i] = 122795 + i;

    _array_default_neurons_subgroup_3__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_3__sub_idx[i] = 122795 + i;

    _array_default_neurons_subgroup_3__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_3__sub_idx_1[i] = 124291 + i;

    _array_default_neurons_subgroup_4__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_4__sub_idx[i] = 124291 + i;

    _array_default_neurons_subgroup_4__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_4__sub_idx_1[i] = 29281 + i;

    _array_default_neurons_subgroup_5__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_5__sub_idx[i] = 29281 + i;

    _array_default_neurons_subgroup_5__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_5__sub_idx_1[i] = 100605 + i;

    _array_default_neurons_subgroup_6__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_6__sub_idx[i] = 100605 + i;

    _array_default_neurons_subgroup_6__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_6__sub_idx_1[i] = 110469 + i;

    _array_default_neurons_subgroup_7__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_7__sub_idx[i] = 110469 + i;

    _array_default_neurons_subgroup_7__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_7__sub_idx_1[i] = 51107 + i;

    _array_default_neurons_subgroup_8__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_8__sub_idx[i] = 51107 + i;

    _array_default_neurons_subgroup_8__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_8__sub_idx_1[i] = 49584 + i;

    _array_default_neurons_subgroup_9__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_9__sub_idx[i] = 49584 + i;

    _array_default_neurons_subgroup_9__sub_idx_1 = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup_9__sub_idx_1[i] = 129730 + i;

    _array_default_neurons_subgroup__sub_idx = new int32_t[1];
    
    for(int i=0; i<1; i++) _array_default_neurons_subgroup__sub_idx[i] = 69093 + i;

    _array_spikemonitor__source_idx = new int32_t[138639];
    
    for(int i=0; i<138639; i++) _array_spikemonitor__source_idx[i] = 0 + i;


    // static arrays
    _static_array__array_default_synapses_sources = new int32_t[15091983];
    _static_array__array_default_synapses_targets = new int32_t[15091983];
    _static_array__dynamic_array_default_synapses_w = new double[15091983];
    _static_array__index__array_default_neurons_rfc = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_1 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_10 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_11 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_12 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_13 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_14 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_15 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_16 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_17 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_18 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_19 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_2 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_20 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_3 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_4 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_5 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_6 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_7 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_8 = new int32_t[1];
    _static_array__index__array_default_neurons_rfc_9 = new int32_t[1];
    _static_array__value__array_default_neurons_rfc = new double[1];
    _static_array__value__array_default_neurons_rfc_1 = new double[1];
    _static_array__value__array_default_neurons_rfc_10 = new double[1];
    _static_array__value__array_default_neurons_rfc_11 = new double[1];
    _static_array__value__array_default_neurons_rfc_12 = new double[1];
    _static_array__value__array_default_neurons_rfc_13 = new double[1];
    _static_array__value__array_default_neurons_rfc_14 = new double[1];
    _static_array__value__array_default_neurons_rfc_15 = new double[1];
    _static_array__value__array_default_neurons_rfc_16 = new double[1];
    _static_array__value__array_default_neurons_rfc_17 = new double[1];
    _static_array__value__array_default_neurons_rfc_18 = new double[1];
    _static_array__value__array_default_neurons_rfc_19 = new double[1];
    _static_array__value__array_default_neurons_rfc_2 = new double[1];
    _static_array__value__array_default_neurons_rfc_20 = new double[1];
    _static_array__value__array_default_neurons_rfc_3 = new double[1];
    _static_array__value__array_default_neurons_rfc_4 = new double[1];
    _static_array__value__array_default_neurons_rfc_5 = new double[1];
    _static_array__value__array_default_neurons_rfc_6 = new double[1];
    _static_array__value__array_default_neurons_rfc_7 = new double[1];
    _static_array__value__array_default_neurons_rfc_8 = new double[1];
    _static_array__value__array_default_neurons_rfc_9 = new double[1];

    // Random number generator states
    std::random_device rd;
    for (int i=0; i<1; i++)
        _random_generators.push_back(RandomGenerator());
}

void _load_arrays()
{
    using namespace brian;

    ifstream f_static_array__array_default_synapses_sources;
    f_static_array__array_default_synapses_sources.open("static_arrays/_static_array__array_default_synapses_sources", ios::in | ios::binary);
    if(f_static_array__array_default_synapses_sources.is_open())
    {
        f_static_array__array_default_synapses_sources.read(reinterpret_cast<char*>(_static_array__array_default_synapses_sources), 15091983*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__array_default_synapses_sources." << endl;
    }
    ifstream f_static_array__array_default_synapses_targets;
    f_static_array__array_default_synapses_targets.open("static_arrays/_static_array__array_default_synapses_targets", ios::in | ios::binary);
    if(f_static_array__array_default_synapses_targets.is_open())
    {
        f_static_array__array_default_synapses_targets.read(reinterpret_cast<char*>(_static_array__array_default_synapses_targets), 15091983*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__array_default_synapses_targets." << endl;
    }
    ifstream f_static_array__dynamic_array_default_synapses_w;
    f_static_array__dynamic_array_default_synapses_w.open("static_arrays/_static_array__dynamic_array_default_synapses_w", ios::in | ios::binary);
    if(f_static_array__dynamic_array_default_synapses_w.is_open())
    {
        f_static_array__dynamic_array_default_synapses_w.read(reinterpret_cast<char*>(_static_array__dynamic_array_default_synapses_w), 15091983*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__dynamic_array_default_synapses_w." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc;
    f_static_array__index__array_default_neurons_rfc.open("static_arrays/_static_array__index__array_default_neurons_rfc", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc.is_open())
    {
        f_static_array__index__array_default_neurons_rfc.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_1;
    f_static_array__index__array_default_neurons_rfc_1.open("static_arrays/_static_array__index__array_default_neurons_rfc_1", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_1.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_1.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_1), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_1." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_10;
    f_static_array__index__array_default_neurons_rfc_10.open("static_arrays/_static_array__index__array_default_neurons_rfc_10", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_10.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_10.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_10), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_10." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_11;
    f_static_array__index__array_default_neurons_rfc_11.open("static_arrays/_static_array__index__array_default_neurons_rfc_11", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_11.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_11.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_11), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_11." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_12;
    f_static_array__index__array_default_neurons_rfc_12.open("static_arrays/_static_array__index__array_default_neurons_rfc_12", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_12.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_12.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_12), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_12." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_13;
    f_static_array__index__array_default_neurons_rfc_13.open("static_arrays/_static_array__index__array_default_neurons_rfc_13", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_13.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_13.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_13), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_13." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_14;
    f_static_array__index__array_default_neurons_rfc_14.open("static_arrays/_static_array__index__array_default_neurons_rfc_14", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_14.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_14.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_14), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_14." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_15;
    f_static_array__index__array_default_neurons_rfc_15.open("static_arrays/_static_array__index__array_default_neurons_rfc_15", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_15.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_15.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_15), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_15." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_16;
    f_static_array__index__array_default_neurons_rfc_16.open("static_arrays/_static_array__index__array_default_neurons_rfc_16", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_16.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_16.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_16), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_16." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_17;
    f_static_array__index__array_default_neurons_rfc_17.open("static_arrays/_static_array__index__array_default_neurons_rfc_17", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_17.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_17.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_17), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_17." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_18;
    f_static_array__index__array_default_neurons_rfc_18.open("static_arrays/_static_array__index__array_default_neurons_rfc_18", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_18.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_18.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_18), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_18." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_19;
    f_static_array__index__array_default_neurons_rfc_19.open("static_arrays/_static_array__index__array_default_neurons_rfc_19", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_19.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_19.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_19), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_19." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_2;
    f_static_array__index__array_default_neurons_rfc_2.open("static_arrays/_static_array__index__array_default_neurons_rfc_2", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_2.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_2.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_2), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_2." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_20;
    f_static_array__index__array_default_neurons_rfc_20.open("static_arrays/_static_array__index__array_default_neurons_rfc_20", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_20.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_20.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_20), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_20." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_3;
    f_static_array__index__array_default_neurons_rfc_3.open("static_arrays/_static_array__index__array_default_neurons_rfc_3", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_3.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_3.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_3), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_3." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_4;
    f_static_array__index__array_default_neurons_rfc_4.open("static_arrays/_static_array__index__array_default_neurons_rfc_4", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_4.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_4.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_4), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_4." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_5;
    f_static_array__index__array_default_neurons_rfc_5.open("static_arrays/_static_array__index__array_default_neurons_rfc_5", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_5.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_5.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_5), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_5." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_6;
    f_static_array__index__array_default_neurons_rfc_6.open("static_arrays/_static_array__index__array_default_neurons_rfc_6", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_6.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_6.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_6), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_6." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_7;
    f_static_array__index__array_default_neurons_rfc_7.open("static_arrays/_static_array__index__array_default_neurons_rfc_7", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_7.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_7.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_7), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_7." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_8;
    f_static_array__index__array_default_neurons_rfc_8.open("static_arrays/_static_array__index__array_default_neurons_rfc_8", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_8.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_8.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_8), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_8." << endl;
    }
    ifstream f_static_array__index__array_default_neurons_rfc_9;
    f_static_array__index__array_default_neurons_rfc_9.open("static_arrays/_static_array__index__array_default_neurons_rfc_9", ios::in | ios::binary);
    if(f_static_array__index__array_default_neurons_rfc_9.is_open())
    {
        f_static_array__index__array_default_neurons_rfc_9.read(reinterpret_cast<char*>(_static_array__index__array_default_neurons_rfc_9), 1*sizeof(int32_t));
    } else
    {
        std::cout << "Error opening static array _static_array__index__array_default_neurons_rfc_9." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc;
    f_static_array__value__array_default_neurons_rfc.open("static_arrays/_static_array__value__array_default_neurons_rfc", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc.is_open())
    {
        f_static_array__value__array_default_neurons_rfc.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_1;
    f_static_array__value__array_default_neurons_rfc_1.open("static_arrays/_static_array__value__array_default_neurons_rfc_1", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_1.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_1.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_1), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_1." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_10;
    f_static_array__value__array_default_neurons_rfc_10.open("static_arrays/_static_array__value__array_default_neurons_rfc_10", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_10.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_10.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_10), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_10." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_11;
    f_static_array__value__array_default_neurons_rfc_11.open("static_arrays/_static_array__value__array_default_neurons_rfc_11", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_11.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_11.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_11), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_11." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_12;
    f_static_array__value__array_default_neurons_rfc_12.open("static_arrays/_static_array__value__array_default_neurons_rfc_12", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_12.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_12.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_12), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_12." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_13;
    f_static_array__value__array_default_neurons_rfc_13.open("static_arrays/_static_array__value__array_default_neurons_rfc_13", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_13.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_13.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_13), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_13." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_14;
    f_static_array__value__array_default_neurons_rfc_14.open("static_arrays/_static_array__value__array_default_neurons_rfc_14", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_14.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_14.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_14), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_14." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_15;
    f_static_array__value__array_default_neurons_rfc_15.open("static_arrays/_static_array__value__array_default_neurons_rfc_15", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_15.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_15.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_15), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_15." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_16;
    f_static_array__value__array_default_neurons_rfc_16.open("static_arrays/_static_array__value__array_default_neurons_rfc_16", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_16.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_16.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_16), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_16." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_17;
    f_static_array__value__array_default_neurons_rfc_17.open("static_arrays/_static_array__value__array_default_neurons_rfc_17", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_17.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_17.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_17), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_17." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_18;
    f_static_array__value__array_default_neurons_rfc_18.open("static_arrays/_static_array__value__array_default_neurons_rfc_18", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_18.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_18.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_18), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_18." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_19;
    f_static_array__value__array_default_neurons_rfc_19.open("static_arrays/_static_array__value__array_default_neurons_rfc_19", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_19.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_19.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_19), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_19." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_2;
    f_static_array__value__array_default_neurons_rfc_2.open("static_arrays/_static_array__value__array_default_neurons_rfc_2", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_2.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_2.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_2), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_2." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_20;
    f_static_array__value__array_default_neurons_rfc_20.open("static_arrays/_static_array__value__array_default_neurons_rfc_20", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_20.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_20.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_20), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_20." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_3;
    f_static_array__value__array_default_neurons_rfc_3.open("static_arrays/_static_array__value__array_default_neurons_rfc_3", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_3.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_3.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_3), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_3." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_4;
    f_static_array__value__array_default_neurons_rfc_4.open("static_arrays/_static_array__value__array_default_neurons_rfc_4", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_4.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_4.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_4), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_4." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_5;
    f_static_array__value__array_default_neurons_rfc_5.open("static_arrays/_static_array__value__array_default_neurons_rfc_5", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_5.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_5.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_5), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_5." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_6;
    f_static_array__value__array_default_neurons_rfc_6.open("static_arrays/_static_array__value__array_default_neurons_rfc_6", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_6.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_6.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_6), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_6." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_7;
    f_static_array__value__array_default_neurons_rfc_7.open("static_arrays/_static_array__value__array_default_neurons_rfc_7", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_7.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_7.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_7), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_7." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_8;
    f_static_array__value__array_default_neurons_rfc_8.open("static_arrays/_static_array__value__array_default_neurons_rfc_8", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_8.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_8.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_8), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_8." << endl;
    }
    ifstream f_static_array__value__array_default_neurons_rfc_9;
    f_static_array__value__array_default_neurons_rfc_9.open("static_arrays/_static_array__value__array_default_neurons_rfc_9", ios::in | ios::binary);
    if(f_static_array__value__array_default_neurons_rfc_9.is_open())
    {
        f_static_array__value__array_default_neurons_rfc_9.read(reinterpret_cast<char*>(_static_array__value__array_default_neurons_rfc_9), 1*sizeof(double));
    } else
    {
        std::cout << "Error opening static array _static_array__value__array_default_neurons_rfc_9." << endl;
    }
}

void _write_arrays()
{
    using namespace brian;

    ofstream outfile__array_default_neurons__spikespace;
    outfile__array_default_neurons__spikespace.open(results_dir + "_array_default_neurons__spikespace_261038356", ios::binary | ios::out);
    if(outfile__array_default_neurons__spikespace.is_open())
    {
        outfile__array_default_neurons__spikespace.write(reinterpret_cast<char*>(_array_default_neurons__spikespace), 138640*sizeof(_array_default_neurons__spikespace[0]));
        outfile__array_default_neurons__spikespace.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons__spikespace." << endl;
    }
    ofstream outfile__array_default_neurons_g;
    outfile__array_default_neurons_g.open(results_dir + "_array_default_neurons_g_817030174", ios::binary | ios::out);
    if(outfile__array_default_neurons_g.is_open())
    {
        outfile__array_default_neurons_g.write(reinterpret_cast<char*>(_array_default_neurons_g), 138639*sizeof(_array_default_neurons_g[0]));
        outfile__array_default_neurons_g.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_g." << endl;
    }
    ofstream outfile__array_default_neurons_i;
    outfile__array_default_neurons_i.open(results_dir + "_array_default_neurons_i_3607808281", ios::binary | ios::out);
    if(outfile__array_default_neurons_i.is_open())
    {
        outfile__array_default_neurons_i.write(reinterpret_cast<char*>(_array_default_neurons_i), 138639*sizeof(_array_default_neurons_i[0]));
        outfile__array_default_neurons_i.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_i." << endl;
    }
    ofstream outfile__array_default_neurons_lastspike;
    outfile__array_default_neurons_lastspike.open(results_dir + "_array_default_neurons_lastspike_4150403714", ios::binary | ios::out);
    if(outfile__array_default_neurons_lastspike.is_open())
    {
        outfile__array_default_neurons_lastspike.write(reinterpret_cast<char*>(_array_default_neurons_lastspike), 138639*sizeof(_array_default_neurons_lastspike[0]));
        outfile__array_default_neurons_lastspike.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_lastspike." << endl;
    }
    ofstream outfile__array_default_neurons_not_refractory;
    outfile__array_default_neurons_not_refractory.open(results_dir + "_array_default_neurons_not_refractory_701150063", ios::binary | ios::out);
    if(outfile__array_default_neurons_not_refractory.is_open())
    {
        outfile__array_default_neurons_not_refractory.write(reinterpret_cast<char*>(_array_default_neurons_not_refractory), 138639*sizeof(_array_default_neurons_not_refractory[0]));
        outfile__array_default_neurons_not_refractory.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_not_refractory." << endl;
    }
    ofstream outfile__array_default_neurons_rfc;
    outfile__array_default_neurons_rfc.open(results_dir + "_array_default_neurons_rfc_3473843883", ios::binary | ios::out);
    if(outfile__array_default_neurons_rfc.is_open())
    {
        outfile__array_default_neurons_rfc.write(reinterpret_cast<char*>(_array_default_neurons_rfc), 138639*sizeof(_array_default_neurons_rfc[0]));
        outfile__array_default_neurons_rfc.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_rfc." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_10__sub_idx;
    outfile__array_default_neurons_subgroup_10__sub_idx.open(results_dir + "_array_default_neurons_subgroup_10__sub_idx_2055572458", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_10__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_10__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_10__sub_idx), 1*sizeof(_array_default_neurons_subgroup_10__sub_idx[0]));
        outfile__array_default_neurons_subgroup_10__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_10__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_10__sub_idx_1;
    outfile__array_default_neurons_subgroup_10__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_10__sub_idx_1_4091504661", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_10__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_10__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_10__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_10__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_10__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_10__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_11__sub_idx;
    outfile__array_default_neurons_subgroup_11__sub_idx.open(results_dir + "_array_default_neurons_subgroup_11__sub_idx_2504515796", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_11__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_11__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_11__sub_idx), 1*sizeof(_array_default_neurons_subgroup_11__sub_idx[0]));
        outfile__array_default_neurons_subgroup_11__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_11__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_11__sub_idx_1;
    outfile__array_default_neurons_subgroup_11__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_11__sub_idx_1_1752835194", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_11__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_11__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_11__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_11__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_11__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_11__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_12__sub_idx;
    outfile__array_default_neurons_subgroup_12__sub_idx.open(results_dir + "_array_default_neurons_subgroup_12__sub_idx_2121292759", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_12__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_12__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_12__sub_idx), 1*sizeof(_array_default_neurons_subgroup_12__sub_idx[0]));
        outfile__array_default_neurons_subgroup_12__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_12__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_12__sub_idx_1;
    outfile__array_default_neurons_subgroup_12__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_12__sub_idx_1_535099018", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_12__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_12__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_12__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_12__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_12__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_12__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_13__sub_idx;
    outfile__array_default_neurons_subgroup_13__sub_idx.open(results_dir + "_array_default_neurons_subgroup_13__sub_idx_2444374249", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_13__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_13__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_13__sub_idx), 1*sizeof(_array_default_neurons_subgroup_13__sub_idx[0]));
        outfile__array_default_neurons_subgroup_13__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_13__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_13__sub_idx_1;
    outfile__array_default_neurons_subgroup_13__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_13__sub_idx_1_2218900197", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_13__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_13__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_13__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_13__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_13__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_13__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_14__sub_idx;
    outfile__array_default_neurons_subgroup_14__sub_idx.open(results_dir + "_array_default_neurons_subgroup_14__sub_idx_1936599952", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_14__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_14__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_14__sub_idx), 1*sizeof(_array_default_neurons_subgroup_14__sub_idx[0]));
        outfile__array_default_neurons_subgroup_14__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_14__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_14__sub_idx_1;
    outfile__array_default_neurons_subgroup_14__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_14__sub_idx_1_4040774506", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_14__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_14__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_14__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_14__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_14__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_14__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_15__sub_idx;
    outfile__array_default_neurons_subgroup_15__sub_idx.open(results_dir + "_array_default_neurons_subgroup_15__sub_idx_2628534446", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_15__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_15__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_15__sub_idx), 1*sizeof(_array_default_neurons_subgroup_15__sub_idx[0]));
        outfile__array_default_neurons_subgroup_15__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_15__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_15__sub_idx_1;
    outfile__array_default_neurons_subgroup_15__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_15__sub_idx_1_1803296517", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_15__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_15__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_15__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_15__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_15__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_15__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_16__sub_idx;
    outfile__array_default_neurons_subgroup_16__sub_idx.open(results_dir + "_array_default_neurons_subgroup_16__sub_idx_2006711213", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_16__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_16__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_16__sub_idx), 1*sizeof(_array_default_neurons_subgroup_16__sub_idx[0]));
        outfile__array_default_neurons_subgroup_16__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_16__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_16__sub_idx_1;
    outfile__array_default_neurons_subgroup_16__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_16__sub_idx_1_484625909", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_16__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_16__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_16__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_16__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_16__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_16__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_17__sub_idx;
    outfile__array_default_neurons_subgroup_17__sub_idx.open(results_dir + "_array_default_neurons_subgroup_17__sub_idx_2556006547", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_17__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_17__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_17__sub_idx), 1*sizeof(_array_default_neurons_subgroup_17__sub_idx[0]));
        outfile__array_default_neurons_subgroup_17__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_17__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_17__sub_idx_1;
    outfile__array_default_neurons_subgroup_17__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_17__sub_idx_1_2269610394", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_17__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_17__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_17__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_17__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_17__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_17__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_18__sub_idx;
    outfile__array_default_neurons_subgroup_18__sub_idx.open(results_dir + "_array_default_neurons_subgroup_18__sub_idx_1767033630", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_18__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_18__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_18__sub_idx), 1*sizeof(_array_default_neurons_subgroup_18__sub_idx[0]));
        outfile__array_default_neurons_subgroup_18__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_18__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_18__sub_idx_1;
    outfile__array_default_neurons_subgroup_18__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_18__sub_idx_1_4124253931", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_18__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_18__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_18__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_18__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_18__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_18__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_19__sub_idx;
    outfile__array_default_neurons_subgroup_19__sub_idx.open(results_dir + "_array_default_neurons_subgroup_19__sub_idx_2257625120", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_19__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_19__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_19__sub_idx), 1*sizeof(_array_default_neurons_subgroup_19__sub_idx[0]));
        outfile__array_default_neurons_subgroup_19__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_19__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_19__sub_idx_1;
    outfile__array_default_neurons_subgroup_19__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_19__sub_idx_1_1853248132", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_19__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_19__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_19__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_19__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_19__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_19__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_1__sub_idx;
    outfile__array_default_neurons_subgroup_1__sub_idx.open(results_dir + "_array_default_neurons_subgroup_1__sub_idx_3974962331", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_1__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_1__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_1__sub_idx), 1*sizeof(_array_default_neurons_subgroup_1__sub_idx[0]));
        outfile__array_default_neurons_subgroup_1__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_1__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_1__sub_idx_1;
    outfile__array_default_neurons_subgroup_1__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_1__sub_idx_1_2878386221", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_1__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_1__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_1__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_1__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_1__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_1__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_20__sub_idx;
    outfile__array_default_neurons_subgroup_20__sub_idx.open(results_dir + "_array_default_neurons_subgroup_20__sub_idx_3815239147", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_20__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_20__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_20__sub_idx), 1*sizeof(_array_default_neurons_subgroup_20__sub_idx[0]));
        outfile__array_default_neurons_subgroup_20__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_20__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_20__sub_idx_1;
    outfile__array_default_neurons_subgroup_20__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_20__sub_idx_1_1310000347", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_20__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_20__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_20__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_20__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_20__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_20__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_21__sub_idx;
    outfile__array_default_neurons_subgroup_21__sub_idx.open(results_dir + "_array_default_neurons_subgroup_21__sub_idx_212174549", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_21__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_21__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_21__sub_idx), 1*sizeof(_array_default_neurons_subgroup_21__sub_idx[0]));
        outfile__array_default_neurons_subgroup_21__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_21__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_2__sub_idx;
    outfile__array_default_neurons_subgroup_2__sub_idx.open(results_dir + "_array_default_neurons_subgroup_2__sub_idx_131770264", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_2__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_2__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_2__sub_idx), 1*sizeof(_array_default_neurons_subgroup_2__sub_idx[0]));
        outfile__array_default_neurons_subgroup_2__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_2__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_2__sub_idx_1;
    outfile__array_default_neurons_subgroup_2__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_2__sub_idx_1_3691930333", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_2__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_2__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_2__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_2__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_2__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_2__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_3__sub_idx;
    outfile__array_default_neurons_subgroup_3__sub_idx.open(results_dir + "_array_default_neurons_subgroup_3__sub_idx_3893939366", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_3__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_3__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_3__sub_idx), 1*sizeof(_array_default_neurons_subgroup_3__sub_idx[0]));
        outfile__array_default_neurons_subgroup_3__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_3__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_3__sub_idx_1;
    outfile__array_default_neurons_subgroup_3__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_3__sub_idx_1_1202400946", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_3__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_3__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_3__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_3__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_3__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_3__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_4__sub_idx;
    outfile__array_default_neurons_subgroup_4__sub_idx.open(results_dir + "_array_default_neurons_subgroup_4__sub_idx_180672479", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_4__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_4__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_4__sub_idx), 1*sizeof(_array_default_neurons_subgroup_4__sub_idx[0]));
        outfile__array_default_neurons_subgroup_4__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_4__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_4__sub_idx_1;
    outfile__array_default_neurons_subgroup_4__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_4__sub_idx_1_859031357", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_4__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_4__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_4__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_4__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_4__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_4__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_5__sub_idx;
    outfile__array_default_neurons_subgroup_5__sub_idx.open(results_dir + "_array_default_neurons_subgroup_5__sub_idx_3842424033", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_5__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_5__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_5__sub_idx), 1*sizeof(_array_default_neurons_subgroup_5__sub_idx[0]));
        outfile__array_default_neurons_subgroup_5__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_5__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_5__sub_idx_1;
    outfile__array_default_neurons_subgroup_5__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_5__sub_idx_1_2828438354", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_5__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_5__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_5__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_5__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_5__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_5__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_6__sub_idx;
    outfile__array_default_neurons_subgroup_6__sub_idx.open(results_dir + "_array_default_neurons_subgroup_6__sub_idx_238094306", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_6__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_6__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_6__sub_idx), 1*sizeof(_array_default_neurons_subgroup_6__sub_idx[0]));
        outfile__array_default_neurons_subgroup_6__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_6__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_6__sub_idx_1;
    outfile__array_default_neurons_subgroup_6__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_6__sub_idx_1_3741866402", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_6__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_6__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_6__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_6__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_6__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_6__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_7__sub_idx;
    outfile__array_default_neurons_subgroup_7__sub_idx.open(results_dir + "_array_default_neurons_subgroup_7__sub_idx_3790826716", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_7__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_7__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_7__sub_idx), 1*sizeof(_array_default_neurons_subgroup_7__sub_idx[0]));
        outfile__array_default_neurons_subgroup_7__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_7__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_7__sub_idx_1;
    outfile__array_default_neurons_subgroup_7__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_7__sub_idx_1_1152193997", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_7__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_7__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_7__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_7__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_7__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_7__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_8__sub_idx;
    outfile__array_default_neurons_subgroup_8__sub_idx.open(results_dir + "_array_default_neurons_subgroup_8__sub_idx_284702545", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_8__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_8__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_8__sub_idx), 1*sizeof(_array_default_neurons_subgroup_8__sub_idx[0]));
        outfile__array_default_neurons_subgroup_8__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_8__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_8__sub_idx_1;
    outfile__array_default_neurons_subgroup_8__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_8__sub_idx_1_909740732", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_8__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_8__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_8__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_8__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_8__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_8__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_9__sub_idx;
    outfile__array_default_neurons_subgroup_9__sub_idx.open(results_dir + "_array_default_neurons_subgroup_9__sub_idx_4282014831", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_9__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup_9__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_9__sub_idx), 1*sizeof(_array_default_neurons_subgroup_9__sub_idx[0]));
        outfile__array_default_neurons_subgroup_9__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_9__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup_9__sub_idx_1;
    outfile__array_default_neurons_subgroup_9__sub_idx_1.open(results_dir + "_array_default_neurons_subgroup_9__sub_idx_1_2912732883", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup_9__sub_idx_1.is_open())
    {
        outfile__array_default_neurons_subgroup_9__sub_idx_1.write(reinterpret_cast<char*>(_array_default_neurons_subgroup_9__sub_idx_1), 1*sizeof(_array_default_neurons_subgroup_9__sub_idx_1[0]));
        outfile__array_default_neurons_subgroup_9__sub_idx_1.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup_9__sub_idx_1." << endl;
    }
    ofstream outfile__array_default_neurons_subgroup__sub_idx;
    outfile__array_default_neurons_subgroup__sub_idx.open(results_dir + "_array_default_neurons_subgroup__sub_idx_2527212772", ios::binary | ios::out);
    if(outfile__array_default_neurons_subgroup__sub_idx.is_open())
    {
        outfile__array_default_neurons_subgroup__sub_idx.write(reinterpret_cast<char*>(_array_default_neurons_subgroup__sub_idx), 1*sizeof(_array_default_neurons_subgroup__sub_idx[0]));
        outfile__array_default_neurons_subgroup__sub_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_subgroup__sub_idx." << endl;
    }
    ofstream outfile__array_default_neurons_v;
    outfile__array_default_neurons_v.open(results_dir + "_array_default_neurons_v_1510130924", ios::binary | ios::out);
    if(outfile__array_default_neurons_v.is_open())
    {
        outfile__array_default_neurons_v.write(reinterpret_cast<char*>(_array_default_neurons_v), 138639*sizeof(_array_default_neurons_v[0]));
        outfile__array_default_neurons_v.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_neurons_v." << endl;
    }
    ofstream outfile__array_default_synapses_N;
    outfile__array_default_synapses_N.open(results_dir + "_array_default_synapses_N_1867576527", ios::binary | ios::out);
    if(outfile__array_default_synapses_N.is_open())
    {
        outfile__array_default_synapses_N.write(reinterpret_cast<char*>(_array_default_synapses_N), 1*sizeof(_array_default_synapses_N[0]));
        outfile__array_default_synapses_N.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_synapses_N." << endl;
    }
    ofstream outfile__array_default_synapses_sources;
    outfile__array_default_synapses_sources.open(results_dir + "_array_default_synapses_sources_1061932104", ios::binary | ios::out);
    if(outfile__array_default_synapses_sources.is_open())
    {
        outfile__array_default_synapses_sources.write(reinterpret_cast<char*>(_array_default_synapses_sources), 15091983*sizeof(_array_default_synapses_sources[0]));
        outfile__array_default_synapses_sources.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_synapses_sources." << endl;
    }
    ofstream outfile__array_default_synapses_targets;
    outfile__array_default_synapses_targets.open(results_dir + "_array_default_synapses_targets_1112913833", ios::binary | ios::out);
    if(outfile__array_default_synapses_targets.is_open())
    {
        outfile__array_default_synapses_targets.write(reinterpret_cast<char*>(_array_default_synapses_targets), 15091983*sizeof(_array_default_synapses_targets[0]));
        outfile__array_default_synapses_targets.close();
    } else
    {
        std::cout << "Error writing output file for _array_default_synapses_targets." << endl;
    }
    ofstream outfile__array_defaultclock_dt;
    outfile__array_defaultclock_dt.open(results_dir + "_array_defaultclock_dt_1978099143", ios::binary | ios::out);
    if(outfile__array_defaultclock_dt.is_open())
    {
        outfile__array_defaultclock_dt.write(reinterpret_cast<char*>(_array_defaultclock_dt), 1*sizeof(_array_defaultclock_dt[0]));
        outfile__array_defaultclock_dt.close();
    } else
    {
        std::cout << "Error writing output file for _array_defaultclock_dt." << endl;
    }
    ofstream outfile__array_defaultclock_t;
    outfile__array_defaultclock_t.open(results_dir + "_array_defaultclock_t_2669362164", ios::binary | ios::out);
    if(outfile__array_defaultclock_t.is_open())
    {
        outfile__array_defaultclock_t.write(reinterpret_cast<char*>(_array_defaultclock_t), 1*sizeof(_array_defaultclock_t[0]));
        outfile__array_defaultclock_t.close();
    } else
    {
        std::cout << "Error writing output file for _array_defaultclock_t." << endl;
    }
    ofstream outfile__array_defaultclock_timestep;
    outfile__array_defaultclock_timestep.open(results_dir + "_array_defaultclock_timestep_144223508", ios::binary | ios::out);
    if(outfile__array_defaultclock_timestep.is_open())
    {
        outfile__array_defaultclock_timestep.write(reinterpret_cast<char*>(_array_defaultclock_timestep), 1*sizeof(_array_defaultclock_timestep[0]));
        outfile__array_defaultclock_timestep.close();
    } else
    {
        std::cout << "Error writing output file for _array_defaultclock_timestep." << endl;
    }
    ofstream outfile__array_spikemonitor__source_idx;
    outfile__array_spikemonitor__source_idx.open(results_dir + "_array_spikemonitor__source_idx_1477951789", ios::binary | ios::out);
    if(outfile__array_spikemonitor__source_idx.is_open())
    {
        outfile__array_spikemonitor__source_idx.write(reinterpret_cast<char*>(_array_spikemonitor__source_idx), 138639*sizeof(_array_spikemonitor__source_idx[0]));
        outfile__array_spikemonitor__source_idx.close();
    } else
    {
        std::cout << "Error writing output file for _array_spikemonitor__source_idx." << endl;
    }
    ofstream outfile__array_spikemonitor_count;
    outfile__array_spikemonitor_count.open(results_dir + "_array_spikemonitor_count_598337445", ios::binary | ios::out);
    if(outfile__array_spikemonitor_count.is_open())
    {
        outfile__array_spikemonitor_count.write(reinterpret_cast<char*>(_array_spikemonitor_count), 138639*sizeof(_array_spikemonitor_count[0]));
        outfile__array_spikemonitor_count.close();
    } else
    {
        std::cout << "Error writing output file for _array_spikemonitor_count." << endl;
    }
    ofstream outfile__array_spikemonitor_N;
    outfile__array_spikemonitor_N.open(results_dir + "_array_spikemonitor_N_225734567", ios::binary | ios::out);
    if(outfile__array_spikemonitor_N.is_open())
    {
        outfile__array_spikemonitor_N.write(reinterpret_cast<char*>(_array_spikemonitor_N), 1*sizeof(_array_spikemonitor_N[0]));
        outfile__array_spikemonitor_N.close();
    } else
    {
        std::cout << "Error writing output file for _array_spikemonitor_N." << endl;
    }

    ofstream outfile__dynamic_array_default_synapses__synaptic_post;
    outfile__dynamic_array_default_synapses__synaptic_post.open(results_dir + "_dynamic_array_default_synapses__synaptic_post_1892736623", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses__synaptic_post.is_open())
    {
        if (! _dynamic_array_default_synapses__synaptic_post.empty() )
        {
            outfile__dynamic_array_default_synapses__synaptic_post.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses__synaptic_post[0]), _dynamic_array_default_synapses__synaptic_post.size()*sizeof(_dynamic_array_default_synapses__synaptic_post[0]));
            outfile__dynamic_array_default_synapses__synaptic_post.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses__synaptic_post." << endl;
    }
    ofstream outfile__dynamic_array_default_synapses__synaptic_pre;
    outfile__dynamic_array_default_synapses__synaptic_pre.open(results_dir + "_dynamic_array_default_synapses__synaptic_pre_3203942682", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses__synaptic_pre.is_open())
    {
        if (! _dynamic_array_default_synapses__synaptic_pre.empty() )
        {
            outfile__dynamic_array_default_synapses__synaptic_pre.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses__synaptic_pre[0]), _dynamic_array_default_synapses__synaptic_pre.size()*sizeof(_dynamic_array_default_synapses__synaptic_pre[0]));
            outfile__dynamic_array_default_synapses__synaptic_pre.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses__synaptic_pre." << endl;
    }
    ofstream outfile__dynamic_array_default_synapses_delay;
    outfile__dynamic_array_default_synapses_delay.open(results_dir + "_dynamic_array_default_synapses_delay_178826599", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses_delay.is_open())
    {
        if (! _dynamic_array_default_synapses_delay.empty() )
        {
            outfile__dynamic_array_default_synapses_delay.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses_delay[0]), _dynamic_array_default_synapses_delay.size()*sizeof(_dynamic_array_default_synapses_delay[0]));
            outfile__dynamic_array_default_synapses_delay.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses_delay." << endl;
    }
    ofstream outfile__dynamic_array_default_synapses_N_incoming;
    outfile__dynamic_array_default_synapses_N_incoming.open(results_dir + "_dynamic_array_default_synapses_N_incoming_1034973904", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses_N_incoming.is_open())
    {
        if (! _dynamic_array_default_synapses_N_incoming.empty() )
        {
            outfile__dynamic_array_default_synapses_N_incoming.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses_N_incoming[0]), _dynamic_array_default_synapses_N_incoming.size()*sizeof(_dynamic_array_default_synapses_N_incoming[0]));
            outfile__dynamic_array_default_synapses_N_incoming.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses_N_incoming." << endl;
    }
    ofstream outfile__dynamic_array_default_synapses_N_outgoing;
    outfile__dynamic_array_default_synapses_N_outgoing.open(results_dir + "_dynamic_array_default_synapses_N_outgoing_447480330", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses_N_outgoing.is_open())
    {
        if (! _dynamic_array_default_synapses_N_outgoing.empty() )
        {
            outfile__dynamic_array_default_synapses_N_outgoing.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses_N_outgoing[0]), _dynamic_array_default_synapses_N_outgoing.size()*sizeof(_dynamic_array_default_synapses_N_outgoing[0]));
            outfile__dynamic_array_default_synapses_N_outgoing.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses_N_outgoing." << endl;
    }
    ofstream outfile__dynamic_array_default_synapses_w;
    outfile__dynamic_array_default_synapses_w.open(results_dir + "_dynamic_array_default_synapses_w_937324336", ios::binary | ios::out);
    if(outfile__dynamic_array_default_synapses_w.is_open())
    {
        if (! _dynamic_array_default_synapses_w.empty() )
        {
            outfile__dynamic_array_default_synapses_w.write(reinterpret_cast<char*>(&_dynamic_array_default_synapses_w[0]), _dynamic_array_default_synapses_w.size()*sizeof(_dynamic_array_default_synapses_w[0]));
            outfile__dynamic_array_default_synapses_w.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_default_synapses_w." << endl;
    }
    ofstream outfile__dynamic_array_spikemonitor_i;
    outfile__dynamic_array_spikemonitor_i.open(results_dir + "_dynamic_array_spikemonitor_i_1976709050", ios::binary | ios::out);
    if(outfile__dynamic_array_spikemonitor_i.is_open())
    {
        if (! _dynamic_array_spikemonitor_i.empty() )
        {
            outfile__dynamic_array_spikemonitor_i.write(reinterpret_cast<char*>(&_dynamic_array_spikemonitor_i[0]), _dynamic_array_spikemonitor_i.size()*sizeof(_dynamic_array_spikemonitor_i[0]));
            outfile__dynamic_array_spikemonitor_i.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_spikemonitor_i." << endl;
    }
    ofstream outfile__dynamic_array_spikemonitor_t;
    outfile__dynamic_array_spikemonitor_t.open(results_dir + "_dynamic_array_spikemonitor_t_383009635", ios::binary | ios::out);
    if(outfile__dynamic_array_spikemonitor_t.is_open())
    {
        if (! _dynamic_array_spikemonitor_t.empty() )
        {
            outfile__dynamic_array_spikemonitor_t.write(reinterpret_cast<char*>(&_dynamic_array_spikemonitor_t[0]), _dynamic_array_spikemonitor_t.size()*sizeof(_dynamic_array_spikemonitor_t[0]));
            outfile__dynamic_array_spikemonitor_t.close();
        }
    } else
    {
        std::cout << "Error writing output file for _dynamic_array_spikemonitor_t." << endl;
    }


    // Write spike queue states to disk
    ofstream outfile_default_synapses_pre;
    outfile_default_synapses_pre.open(results_dir + "default_synapses_pre_queue", ios::out);
    if (outfile_default_synapses_pre.is_open()) {
        for (int i=0; i<1; i++) {
            outfile_default_synapses_pre << *default_synapses_pre.queue[i] << "\n";
        }
    } else {
        std::cout << "Error writing spike queue state for 'default_synapses_pre' for file" << std::endl;
    }

    // Write random generator state to disk
    ofstream random_generator_state;
    random_generator_state.open(results_dir + "random_generator_state", ios::out);
    if (random_generator_state.is_open()) {
        for (int i=0; i<1; i++)
            random_generator_state << _random_generators[i] << "\n";
    } else {
        std::cout << "Error writing random generator state to file." << std::endl;
    }

    // Write profiling info to disk
    ofstream outfile_profiling_info;
    outfile_profiling_info.open(results_dir + "profiling_info.txt", ios::out);
    if(outfile_profiling_info.is_open())
    {
    outfile_profiling_info << "default_neurons_spike_resetter_codeobject\t" << std::chrono::duration<double>(default_neurons_spike_resetter_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "default_neurons_spike_thresholder_codeobject\t" << std::chrono::duration<double>(default_neurons_spike_thresholder_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "default_neurons_stateupdater_codeobject\t" << std::chrono::duration<double>(default_neurons_stateupdater_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "default_synapses_pre_codeobject\t" << std::chrono::duration<double>(default_synapses_pre_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "default_synapses_pre_push_spikes\t" << std::chrono::duration<double>(default_synapses_pre_push_spikes_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_10_codeobject\t" << std::chrono::duration<double>(poissoninput_10_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_11_codeobject\t" << std::chrono::duration<double>(poissoninput_11_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_12_codeobject\t" << std::chrono::duration<double>(poissoninput_12_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_13_codeobject\t" << std::chrono::duration<double>(poissoninput_13_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_14_codeobject\t" << std::chrono::duration<double>(poissoninput_14_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_15_codeobject\t" << std::chrono::duration<double>(poissoninput_15_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_16_codeobject\t" << std::chrono::duration<double>(poissoninput_16_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_17_codeobject\t" << std::chrono::duration<double>(poissoninput_17_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_18_codeobject\t" << std::chrono::duration<double>(poissoninput_18_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_19_codeobject\t" << std::chrono::duration<double>(poissoninput_19_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_1_codeobject\t" << std::chrono::duration<double>(poissoninput_1_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_20_codeobject\t" << std::chrono::duration<double>(poissoninput_20_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_2_codeobject\t" << std::chrono::duration<double>(poissoninput_2_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_3_codeobject\t" << std::chrono::duration<double>(poissoninput_3_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_4_codeobject\t" << std::chrono::duration<double>(poissoninput_4_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_5_codeobject\t" << std::chrono::duration<double>(poissoninput_5_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_6_codeobject\t" << std::chrono::duration<double>(poissoninput_6_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_7_codeobject\t" << std::chrono::duration<double>(poissoninput_7_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_8_codeobject\t" << std::chrono::duration<double>(poissoninput_8_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_9_codeobject\t" << std::chrono::duration<double>(poissoninput_9_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "poissoninput_codeobject\t" << std::chrono::duration<double>(poissoninput_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info << "spikemonitor_codeobject\t" << std::chrono::duration<double>(spikemonitor_codeobject_profiling_info).count() << std::endl;
    outfile_profiling_info.close();
    } else
    {
        std::cout << "Error writing profiling info to file." << std::endl;
    }
    // Write last run info to disk
    ofstream outfile_last_run_info;
    outfile_last_run_info.open(results_dir + "last_run_info.txt", ios::out);
    if(outfile_last_run_info.is_open())
    {
        outfile_last_run_info << (Network::_last_run_time) << " " << (Network::_last_run_completed_fraction) << std::endl;
        outfile_last_run_info.close();
    } else
    {
        std::cout << "Error writing last run info to file." << std::endl;
    }
}

void _dealloc_arrays()
{
    using namespace brian;


    // static arrays
    if(_static_array__array_default_synapses_sources!=0)
    {
        delete [] _static_array__array_default_synapses_sources;
        _static_array__array_default_synapses_sources = 0;
    }
    if(_static_array__array_default_synapses_targets!=0)
    {
        delete [] _static_array__array_default_synapses_targets;
        _static_array__array_default_synapses_targets = 0;
    }
    if(_static_array__dynamic_array_default_synapses_w!=0)
    {
        delete [] _static_array__dynamic_array_default_synapses_w;
        _static_array__dynamic_array_default_synapses_w = 0;
    }
    if(_static_array__index__array_default_neurons_rfc!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc;
        _static_array__index__array_default_neurons_rfc = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_1!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_1;
        _static_array__index__array_default_neurons_rfc_1 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_10!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_10;
        _static_array__index__array_default_neurons_rfc_10 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_11!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_11;
        _static_array__index__array_default_neurons_rfc_11 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_12!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_12;
        _static_array__index__array_default_neurons_rfc_12 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_13!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_13;
        _static_array__index__array_default_neurons_rfc_13 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_14!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_14;
        _static_array__index__array_default_neurons_rfc_14 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_15!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_15;
        _static_array__index__array_default_neurons_rfc_15 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_16!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_16;
        _static_array__index__array_default_neurons_rfc_16 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_17!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_17;
        _static_array__index__array_default_neurons_rfc_17 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_18!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_18;
        _static_array__index__array_default_neurons_rfc_18 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_19!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_19;
        _static_array__index__array_default_neurons_rfc_19 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_2!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_2;
        _static_array__index__array_default_neurons_rfc_2 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_20!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_20;
        _static_array__index__array_default_neurons_rfc_20 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_3!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_3;
        _static_array__index__array_default_neurons_rfc_3 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_4!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_4;
        _static_array__index__array_default_neurons_rfc_4 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_5!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_5;
        _static_array__index__array_default_neurons_rfc_5 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_6!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_6;
        _static_array__index__array_default_neurons_rfc_6 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_7!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_7;
        _static_array__index__array_default_neurons_rfc_7 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_8!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_8;
        _static_array__index__array_default_neurons_rfc_8 = 0;
    }
    if(_static_array__index__array_default_neurons_rfc_9!=0)
    {
        delete [] _static_array__index__array_default_neurons_rfc_9;
        _static_array__index__array_default_neurons_rfc_9 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc;
        _static_array__value__array_default_neurons_rfc = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_1!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_1;
        _static_array__value__array_default_neurons_rfc_1 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_10!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_10;
        _static_array__value__array_default_neurons_rfc_10 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_11!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_11;
        _static_array__value__array_default_neurons_rfc_11 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_12!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_12;
        _static_array__value__array_default_neurons_rfc_12 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_13!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_13;
        _static_array__value__array_default_neurons_rfc_13 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_14!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_14;
        _static_array__value__array_default_neurons_rfc_14 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_15!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_15;
        _static_array__value__array_default_neurons_rfc_15 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_16!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_16;
        _static_array__value__array_default_neurons_rfc_16 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_17!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_17;
        _static_array__value__array_default_neurons_rfc_17 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_18!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_18;
        _static_array__value__array_default_neurons_rfc_18 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_19!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_19;
        _static_array__value__array_default_neurons_rfc_19 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_2!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_2;
        _static_array__value__array_default_neurons_rfc_2 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_20!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_20;
        _static_array__value__array_default_neurons_rfc_20 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_3!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_3;
        _static_array__value__array_default_neurons_rfc_3 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_4!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_4;
        _static_array__value__array_default_neurons_rfc_4 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_5!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_5;
        _static_array__value__array_default_neurons_rfc_5 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_6!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_6;
        _static_array__value__array_default_neurons_rfc_6 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_7!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_7;
        _static_array__value__array_default_neurons_rfc_7 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_8!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_8;
        _static_array__value__array_default_neurons_rfc_8 = 0;
    }
    if(_static_array__value__array_default_neurons_rfc_9!=0)
    {
        delete [] _static_array__value__array_default_neurons_rfc_9;
        _static_array__value__array_default_neurons_rfc_9 = 0;
    }
}

