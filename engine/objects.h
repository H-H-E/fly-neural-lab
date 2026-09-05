
#ifndef _BRIAN_OBJECTS_H
#define _BRIAN_OBJECTS_H

#include "synapses_classes.h"
#include "brianlib/clocks.h"
#include "brianlib/dynamic_array.h"
#include "brianlib/stdint_compat.h"
#include "network.h"
#include<chrono>
#include<random>
#include<vector>


namespace brian {

extern std::string results_dir;

class RandomGenerator {
    private:
        std::mt19937 gen;
        double stored_gauss;
        bool has_stored_gauss = false;
    public:
        RandomGenerator() {
            seed();
        }
        void seed() {
            std::random_device rd;
            gen.seed(rd());
            has_stored_gauss = false;
        }
        void seed(unsigned long seed) {
            gen.seed(seed);
            has_stored_gauss = false;
        }
        // Allow exporting/setting the internal state of the random generator
        friend std::ostream& operator<<(std::ostream& out, const RandomGenerator& rng);
        friend std::istream& operator>>(std::istream& in, RandomGenerator& rng);

        double rand() {
            /* shifts : 67108864 = 0x4000000, 9007199254740992 = 0x20000000000000 */
            const long a = gen() >> 5;
            const long b = gen() >> 6;
            return (a * 67108864.0 + b) / 9007199254740992.0;
        }

        double randn() {
            if (has_stored_gauss) {
                const double tmp = stored_gauss;
                has_stored_gauss = false;
                return tmp;
            }
            else {
                double f, x1, x2, r2;

                do {
                    x1 = 2.0*rand() - 1.0;
                    x2 = 2.0*rand() - 1.0;
                    r2 = x1*x1 + x2*x2;
                }
                while (r2 >= 1.0 || r2 == 0.0);

                /* Box-Muller transform */
                f = sqrt(-2.0*log(r2)/r2);
                /* Keep for next call */
                stored_gauss = f*x1;
                has_stored_gauss = true;
                return f*x2;
            }
        }
};

extern std::ostream& operator<<(std::ostream& out, const RandomGenerator& rng);
extern std::istream& operator>>(std::istream& in, RandomGenerator& rng);

// In OpenMP we need one state per thread
extern std::vector< RandomGenerator > _random_generators;

//////////////// clocks ///////////////////
extern Clock defaultclock;

//////////////// networks /////////////////
extern Network network;



void set_variable_by_name(std::string, std::string);

//////////////// dynamic arrays ///////////
extern std::vector<int32_t> _dynamic_array_default_synapses__synaptic_post;
extern std::vector<int32_t> _dynamic_array_default_synapses__synaptic_pre;
extern std::vector<double> _dynamic_array_default_synapses_delay;
extern std::vector<int32_t> _dynamic_array_default_synapses_N_incoming;
extern std::vector<int32_t> _dynamic_array_default_synapses_N_outgoing;
extern std::vector<double> _dynamic_array_default_synapses_w;
extern std::vector<int32_t> _dynamic_array_spikemonitor_i;
extern std::vector<double> _dynamic_array_spikemonitor_t;

//////////////// arrays ///////////////////
extern int32_t *_array_default_neurons__spikespace;
extern const int _num__array_default_neurons__spikespace;
extern double *_array_default_neurons_g;
extern const int _num__array_default_neurons_g;
extern int32_t *_array_default_neurons_i;
extern const int _num__array_default_neurons_i;
extern double *_array_default_neurons_lastspike;
extern const int _num__array_default_neurons_lastspike;
extern char *_array_default_neurons_not_refractory;
extern const int _num__array_default_neurons_not_refractory;
extern double *_array_default_neurons_rfc;
extern const int _num__array_default_neurons_rfc;
extern int32_t *_array_default_neurons_subgroup_10__sub_idx;
extern const int _num__array_default_neurons_subgroup_10__sub_idx;
extern int32_t *_array_default_neurons_subgroup_10__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_10__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_11__sub_idx;
extern const int _num__array_default_neurons_subgroup_11__sub_idx;
extern int32_t *_array_default_neurons_subgroup_11__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_11__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_12__sub_idx;
extern const int _num__array_default_neurons_subgroup_12__sub_idx;
extern int32_t *_array_default_neurons_subgroup_12__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_12__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_13__sub_idx;
extern const int _num__array_default_neurons_subgroup_13__sub_idx;
extern int32_t *_array_default_neurons_subgroup_13__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_13__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_14__sub_idx;
extern const int _num__array_default_neurons_subgroup_14__sub_idx;
extern int32_t *_array_default_neurons_subgroup_14__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_14__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_15__sub_idx;
extern const int _num__array_default_neurons_subgroup_15__sub_idx;
extern int32_t *_array_default_neurons_subgroup_15__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_15__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_16__sub_idx;
extern const int _num__array_default_neurons_subgroup_16__sub_idx;
extern int32_t *_array_default_neurons_subgroup_16__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_16__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_17__sub_idx;
extern const int _num__array_default_neurons_subgroup_17__sub_idx;
extern int32_t *_array_default_neurons_subgroup_17__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_17__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_18__sub_idx;
extern const int _num__array_default_neurons_subgroup_18__sub_idx;
extern int32_t *_array_default_neurons_subgroup_18__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_18__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_19__sub_idx;
extern const int _num__array_default_neurons_subgroup_19__sub_idx;
extern int32_t *_array_default_neurons_subgroup_19__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_19__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_1__sub_idx;
extern const int _num__array_default_neurons_subgroup_1__sub_idx;
extern int32_t *_array_default_neurons_subgroup_1__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_1__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_20__sub_idx;
extern const int _num__array_default_neurons_subgroup_20__sub_idx;
extern int32_t *_array_default_neurons_subgroup_20__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_20__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_21__sub_idx;
extern const int _num__array_default_neurons_subgroup_21__sub_idx;
extern int32_t *_array_default_neurons_subgroup_2__sub_idx;
extern const int _num__array_default_neurons_subgroup_2__sub_idx;
extern int32_t *_array_default_neurons_subgroup_2__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_2__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_3__sub_idx;
extern const int _num__array_default_neurons_subgroup_3__sub_idx;
extern int32_t *_array_default_neurons_subgroup_3__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_3__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_4__sub_idx;
extern const int _num__array_default_neurons_subgroup_4__sub_idx;
extern int32_t *_array_default_neurons_subgroup_4__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_4__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_5__sub_idx;
extern const int _num__array_default_neurons_subgroup_5__sub_idx;
extern int32_t *_array_default_neurons_subgroup_5__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_5__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_6__sub_idx;
extern const int _num__array_default_neurons_subgroup_6__sub_idx;
extern int32_t *_array_default_neurons_subgroup_6__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_6__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_7__sub_idx;
extern const int _num__array_default_neurons_subgroup_7__sub_idx;
extern int32_t *_array_default_neurons_subgroup_7__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_7__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_8__sub_idx;
extern const int _num__array_default_neurons_subgroup_8__sub_idx;
extern int32_t *_array_default_neurons_subgroup_8__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_8__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup_9__sub_idx;
extern const int _num__array_default_neurons_subgroup_9__sub_idx;
extern int32_t *_array_default_neurons_subgroup_9__sub_idx_1;
extern const int _num__array_default_neurons_subgroup_9__sub_idx_1;
extern int32_t *_array_default_neurons_subgroup__sub_idx;
extern const int _num__array_default_neurons_subgroup__sub_idx;
extern double *_array_default_neurons_v;
extern const int _num__array_default_neurons_v;
extern int32_t *_array_default_synapses_N;
extern const int _num__array_default_synapses_N;
extern int32_t *_array_default_synapses_sources;
extern const int _num__array_default_synapses_sources;
extern int32_t *_array_default_synapses_targets;
extern const int _num__array_default_synapses_targets;
extern double *_array_defaultclock_dt;
extern const int _num__array_defaultclock_dt;
extern double *_array_defaultclock_t;
extern const int _num__array_defaultclock_t;
extern int64_t *_array_defaultclock_timestep;
extern const int _num__array_defaultclock_timestep;
extern int32_t *_array_spikemonitor__source_idx;
extern const int _num__array_spikemonitor__source_idx;
extern int32_t *_array_spikemonitor_count;
extern const int _num__array_spikemonitor_count;
extern int32_t *_array_spikemonitor_N;
extern const int _num__array_spikemonitor_N;

//////////////// dynamic arrays 2d /////////

/////////////// static arrays /////////////
extern int32_t *_static_array__array_default_synapses_sources;
extern const int _num__static_array__array_default_synapses_sources;
extern int32_t *_static_array__array_default_synapses_targets;
extern const int _num__static_array__array_default_synapses_targets;
extern double *_static_array__dynamic_array_default_synapses_w;
extern const int _num__static_array__dynamic_array_default_synapses_w;
extern int32_t *_static_array__index__array_default_neurons_rfc;
extern const int _num__static_array__index__array_default_neurons_rfc;
extern int32_t *_static_array__index__array_default_neurons_rfc_1;
extern const int _num__static_array__index__array_default_neurons_rfc_1;
extern int32_t *_static_array__index__array_default_neurons_rfc_10;
extern const int _num__static_array__index__array_default_neurons_rfc_10;
extern int32_t *_static_array__index__array_default_neurons_rfc_11;
extern const int _num__static_array__index__array_default_neurons_rfc_11;
extern int32_t *_static_array__index__array_default_neurons_rfc_12;
extern const int _num__static_array__index__array_default_neurons_rfc_12;
extern int32_t *_static_array__index__array_default_neurons_rfc_13;
extern const int _num__static_array__index__array_default_neurons_rfc_13;
extern int32_t *_static_array__index__array_default_neurons_rfc_14;
extern const int _num__static_array__index__array_default_neurons_rfc_14;
extern int32_t *_static_array__index__array_default_neurons_rfc_15;
extern const int _num__static_array__index__array_default_neurons_rfc_15;
extern int32_t *_static_array__index__array_default_neurons_rfc_16;
extern const int _num__static_array__index__array_default_neurons_rfc_16;
extern int32_t *_static_array__index__array_default_neurons_rfc_17;
extern const int _num__static_array__index__array_default_neurons_rfc_17;
extern int32_t *_static_array__index__array_default_neurons_rfc_18;
extern const int _num__static_array__index__array_default_neurons_rfc_18;
extern int32_t *_static_array__index__array_default_neurons_rfc_19;
extern const int _num__static_array__index__array_default_neurons_rfc_19;
extern int32_t *_static_array__index__array_default_neurons_rfc_2;
extern const int _num__static_array__index__array_default_neurons_rfc_2;
extern int32_t *_static_array__index__array_default_neurons_rfc_20;
extern const int _num__static_array__index__array_default_neurons_rfc_20;
extern int32_t *_static_array__index__array_default_neurons_rfc_3;
extern const int _num__static_array__index__array_default_neurons_rfc_3;
extern int32_t *_static_array__index__array_default_neurons_rfc_4;
extern const int _num__static_array__index__array_default_neurons_rfc_4;
extern int32_t *_static_array__index__array_default_neurons_rfc_5;
extern const int _num__static_array__index__array_default_neurons_rfc_5;
extern int32_t *_static_array__index__array_default_neurons_rfc_6;
extern const int _num__static_array__index__array_default_neurons_rfc_6;
extern int32_t *_static_array__index__array_default_neurons_rfc_7;
extern const int _num__static_array__index__array_default_neurons_rfc_7;
extern int32_t *_static_array__index__array_default_neurons_rfc_8;
extern const int _num__static_array__index__array_default_neurons_rfc_8;
extern int32_t *_static_array__index__array_default_neurons_rfc_9;
extern const int _num__static_array__index__array_default_neurons_rfc_9;
extern double *_static_array__value__array_default_neurons_rfc;
extern const int _num__static_array__value__array_default_neurons_rfc;
extern double *_static_array__value__array_default_neurons_rfc_1;
extern const int _num__static_array__value__array_default_neurons_rfc_1;
extern double *_static_array__value__array_default_neurons_rfc_10;
extern const int _num__static_array__value__array_default_neurons_rfc_10;
extern double *_static_array__value__array_default_neurons_rfc_11;
extern const int _num__static_array__value__array_default_neurons_rfc_11;
extern double *_static_array__value__array_default_neurons_rfc_12;
extern const int _num__static_array__value__array_default_neurons_rfc_12;
extern double *_static_array__value__array_default_neurons_rfc_13;
extern const int _num__static_array__value__array_default_neurons_rfc_13;
extern double *_static_array__value__array_default_neurons_rfc_14;
extern const int _num__static_array__value__array_default_neurons_rfc_14;
extern double *_static_array__value__array_default_neurons_rfc_15;
extern const int _num__static_array__value__array_default_neurons_rfc_15;
extern double *_static_array__value__array_default_neurons_rfc_16;
extern const int _num__static_array__value__array_default_neurons_rfc_16;
extern double *_static_array__value__array_default_neurons_rfc_17;
extern const int _num__static_array__value__array_default_neurons_rfc_17;
extern double *_static_array__value__array_default_neurons_rfc_18;
extern const int _num__static_array__value__array_default_neurons_rfc_18;
extern double *_static_array__value__array_default_neurons_rfc_19;
extern const int _num__static_array__value__array_default_neurons_rfc_19;
extern double *_static_array__value__array_default_neurons_rfc_2;
extern const int _num__static_array__value__array_default_neurons_rfc_2;
extern double *_static_array__value__array_default_neurons_rfc_20;
extern const int _num__static_array__value__array_default_neurons_rfc_20;
extern double *_static_array__value__array_default_neurons_rfc_3;
extern const int _num__static_array__value__array_default_neurons_rfc_3;
extern double *_static_array__value__array_default_neurons_rfc_4;
extern const int _num__static_array__value__array_default_neurons_rfc_4;
extern double *_static_array__value__array_default_neurons_rfc_5;
extern const int _num__static_array__value__array_default_neurons_rfc_5;
extern double *_static_array__value__array_default_neurons_rfc_6;
extern const int _num__static_array__value__array_default_neurons_rfc_6;
extern double *_static_array__value__array_default_neurons_rfc_7;
extern const int _num__static_array__value__array_default_neurons_rfc_7;
extern double *_static_array__value__array_default_neurons_rfc_8;
extern const int _num__static_array__value__array_default_neurons_rfc_8;
extern double *_static_array__value__array_default_neurons_rfc_9;
extern const int _num__static_array__value__array_default_neurons_rfc_9;

//////////////// synapses /////////////////
// default_synapses
extern SynapticPathway default_synapses_pre;

// Profiling information for each code object
extern std::chrono::nanoseconds default_neurons_spike_resetter_codeobject_profiling_info;
extern std::chrono::nanoseconds default_neurons_spike_thresholder_codeobject_profiling_info;
extern std::chrono::nanoseconds default_neurons_stateupdater_codeobject_profiling_info;
extern std::chrono::nanoseconds default_synapses_pre_codeobject_profiling_info;
extern std::chrono::nanoseconds default_synapses_pre_push_spikes_profiling_info;
extern std::chrono::nanoseconds poissoninput_10_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_11_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_12_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_13_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_14_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_15_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_16_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_17_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_18_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_19_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_1_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_20_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_2_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_3_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_4_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_5_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_6_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_7_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_8_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_9_codeobject_profiling_info;
extern std::chrono::nanoseconds poissoninput_codeobject_profiling_info;
extern std::chrono::nanoseconds spikemonitor_codeobject_profiling_info;
}

void _init_arrays();
void _load_arrays();
void _write_arrays();
void _dealloc_arrays();

#endif


