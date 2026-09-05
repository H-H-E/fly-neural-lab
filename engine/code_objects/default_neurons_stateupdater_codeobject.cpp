#include "fly_lazy.h"
std::vector<int> fly_live;
unsigned char fly_touched[138639] = {};
bool fly_dirty = false;
double fly_idle_v = 0;
#include <cstdint>
int64_t fly_deadline[138639] = {};
int64_t fly_refractory_ticks[138639] = {};
#include "code_objects/default_neurons_stateupdater_codeobject.h"
#include "objects.h"
#include "brianlib/common_math.h"
#include "brianlib/stdint_compat.h"
#include<chrono>
#include<cmath>
#include<ctime>
#include<iostream>
#include<fstream>
#include<climits>

////// SUPPORT CODE ///////
namespace {
        
    static inline int64_t _timestep(double t, double dt)
    {
        return (int64_t)((t + 1e-3*dt)/dt);
    }
    template < typename T1, typename T2 > struct _higher_type;
    template < > struct _higher_type<int32_t,int32_t> { typedef int32_t type; };
    template < > struct _higher_type<int32_t,int64_t> { typedef int64_t type; };
    template < > struct _higher_type<int32_t,float> { typedef float type; };
    template < > struct _higher_type<int32_t,double> { typedef double type; };
    template < > struct _higher_type<int32_t,long double> { typedef long double type; };
    template < > struct _higher_type<int64_t,int32_t> { typedef int64_t type; };
    template < > struct _higher_type<int64_t,int64_t> { typedef int64_t type; };
    template < > struct _higher_type<int64_t,float> { typedef float type; };
    template < > struct _higher_type<int64_t,double> { typedef double type; };
    template < > struct _higher_type<int64_t,long double> { typedef long double type; };
    template < > struct _higher_type<float,int32_t> { typedef float type; };
    template < > struct _higher_type<float,int64_t> { typedef float type; };
    template < > struct _higher_type<float,float> { typedef float type; };
    template < > struct _higher_type<float,double> { typedef double type; };
    template < > struct _higher_type<float,long double> { typedef long double type; };
    template < > struct _higher_type<double,int32_t> { typedef double type; };
    template < > struct _higher_type<double,int64_t> { typedef double type; };
    template < > struct _higher_type<double,float> { typedef double type; };
    template < > struct _higher_type<double,double> { typedef double type; };
    template < > struct _higher_type<double,long double> { typedef long double type; };
    template < > struct _higher_type<long double,int32_t> { typedef long double type; };
    template < > struct _higher_type<long double,int64_t> { typedef long double type; };
    template < > struct _higher_type<long double,float> { typedef long double type; };
    template < > struct _higher_type<long double,double> { typedef long double type; };
    template < > struct _higher_type<long double,long double> { typedef long double type; };
    // General template, used for floating point types
    template < typename T1, typename T2 >
    static inline typename _higher_type<T1,T2>::type
    _brian_mod(T1 x, T2 y)
    {
        return x-y*floor(1.0*x/y);
    }
    // Specific implementations for integer types
    // (from Cython, see LICENSE file)
    template <>
    inline int32_t _brian_mod(int32_t x, int32_t y)
    {
        int32_t r = x % y;
        r += ((r != 0) & ((r ^ y) < 0)) * y;
        return r;
    }
    template <>
    inline int64_t _brian_mod(int32_t x, int64_t y)
    {
        int64_t r = x % y;
        r += ((r != 0) & ((r ^ y) < 0)) * y;
        return r;
    }
    template <>
    inline int64_t _brian_mod(int64_t x, int32_t y)
    {
        int64_t r = x % y;
        r += ((r != 0) & ((r ^ y) < 0)) * y;
        return r;
    }
    template <>
    inline int64_t _brian_mod(int64_t x, int64_t y)
    {
        int64_t r = x % y;
        r += ((r != 0) & ((r ^ y) < 0)) * y;
        return r;
    }
    // General implementation, used for floating point types
    template < typename T1, typename T2 >
    static inline typename _higher_type<T1,T2>::type
    _brian_floordiv(T1 x, T2 y)
    {{
        return floor(1.0*x/y);
    }}
    // Specific implementations for integer types
    // (from Cython, see LICENSE file)
    template <>
    inline int32_t _brian_floordiv<int32_t, int32_t>(int32_t a, int32_t b) {
        int32_t q = a / b;
        int32_t r = a - q*b;
        q -= ((r != 0) & ((r ^ b) < 0));
        return q;
    }
    template <>
    inline int64_t _brian_floordiv<int32_t, int64_t>(int32_t a, int64_t b) {
        int64_t q = a / b;
        int64_t r = a - q*b;
        q -= ((r != 0) & ((r ^ b) < 0));
        return q;
    }
    template <>
    inline int64_t _brian_floordiv<int64_t, int>(int64_t a, int32_t b) {
        int64_t q = a / b;
        int64_t r = a - q*b;
        q -= ((r != 0) & ((r ^ b) < 0));
        return q;
    }
    template <>
    inline int64_t _brian_floordiv<int64_t, int64_t>(int64_t a, int64_t b) {
        int64_t q = a / b;
        int64_t r = a - q*b;
        q -= ((r != 0) & ((r ^ b) < 0));
        return q;
    }
    #ifdef _MSC_VER
    #define _brian_pow(x, y) (pow((double)(x), (y)))
    #else
    #define _brian_pow(x, y) (pow((x), (y)))
    #endif

}

////// HASH DEFINES ///////



void _run_default_neurons_stateupdater_codeobject()
{
    using namespace brian;

    const auto _start_time = std::chrono::high_resolution_clock::now();

    ///// CONSTANTS ///////////
    const int64_t N = 138639;
const size_t _numdt = 1;
const size_t _numg = 138639;
const size_t _numlastspike = 138639;
const size_t _numnot_refractory = 138639;
const size_t _numrfc = 138639;
const size_t _numt = 1;
const double t_mbr = 0.02;
const double tau = 0.005;
const size_t _numv = 138639;
const double v_0 = - 0.052000000000000005;
    ///// POINTERS ////////////
        
    double*   _ptr_array_defaultclock_dt = _array_defaultclock_dt;
    double* __restrict  _ptr_array_default_neurons_g = _array_default_neurons_g;
    double* __restrict  _ptr_array_default_neurons_lastspike = _array_default_neurons_lastspike;
    char* __restrict  _ptr_array_default_neurons_not_refractory = _array_default_neurons_not_refractory;
    double* __restrict  _ptr_array_default_neurons_rfc = _array_default_neurons_rfc;
    double*   _ptr_array_defaultclock_t = _array_defaultclock_t;
    double* __restrict  _ptr_array_default_neurons_v = _array_default_neurons_v;


    //// MAIN CODE ////////////
    // scalar code
    const size_t _vectorisation_idx = -1;
        
    const double dt = _ptr_array_defaultclock_dt[0];
    const double t = _ptr_array_defaultclock_t[0];
    const double _lio_1 = 1.0f*(- dt)/tau;
    const double _lio_2 = exp(_lio_1);
    const double _lio_3 = 1.0f*tau/(t_mbr - tau);
    const double _lio_4 = 1.0f*dt/t_mbr;
    const double _lio_5 = 1.0f*dt/tau;
    const double _lio_6 = 1.0f*(- dt)/t_mbr;
    const double _lio_7 = v_0 - v_0;
    const double _lio_8 = v_0 - (v_0 * exp(_lio_6));
    const double _lio_9 = ((_lio_3 * ((- exp(_lio_4)) + exp(_lio_5))) * exp(_lio_6)) * exp(_lio_1);
    const double _lio_10 = exp(_lio_6);


    if(_array_defaultclock_timestep[0] == 0) {
        fly_idle_v = _ptr_array_default_neurons_v[0];
        for(int i=0;i<N;++i) {
            if(_ptr_array_default_neurons_v[i] != fly_idle_v ||
               _ptr_array_default_neurons_g[i] != 0 ||
               !_ptr_array_default_neurons_not_refractory[i])
                throw std::runtime_error("Lazy kernel requires uniform resting initialization");
        }
    }
    // Same arithmetic recurrence as every untouched neuron, once per tick.
    fly_idle_v = _lio_8 + ((_lio_9 * 0.0) + (_lio_10 * fly_idle_v));
    if(!(fly_idle_v <= -0.045)) throw std::runtime_error("Dormant population could spike");
    if(fly_dirty) { std::sort(fly_live.begin(),fly_live.end()); fly_dirty=false; }
    const int _N = fly_live.size();
    int fused_count = 0;
    const int64_t fly_tick = _array_defaultclock_timestep[0];
    if(fly_tick == 0) {
        for(int i=0; i<N; ++i) {
            fly_refractory_ticks[i] = _timestep(_ptr_array_default_neurons_rfc[i],dt);
            fly_deadline[i] = 0;
        }
    }
    
    for(int pos=0; pos<_N; pos++)
    {
        const int _idx=fly_live[pos];
        // vector code
        const size_t _vectorisation_idx = _idx;
                
        double g = _ptr_array_default_neurons_g[_idx];
        const double lastspike = _ptr_array_default_neurons_lastspike[_idx];
        char not_refractory = _ptr_array_default_neurons_not_refractory[_idx];
        const double rfc = _ptr_array_default_neurons_rfc[_idx];
        double v = _ptr_array_default_neurons_v[_idx];
        not_refractory = fly_tick >= fly_deadline[_idx];
        double _g;
        if(!not_refractory)
            _g = g;
        else 
            _g = _lio_2 * g;
        double _v;
        if(!not_refractory)
            _v = _lio_7 + v;
        else 
            _v = _lio_8 + ((_lio_9 * g) + (_lio_10 * v));
        if(not_refractory)
            g = _g;
        if(not_refractory)
            v = _v;
        _ptr_array_default_neurons_g[_idx] = g;
        _ptr_array_default_neurons_not_refractory[_idx] = not_refractory;
        _ptr_array_default_neurons_v[_idx] = v;
        // Threshold immediately after this neuron's integration. No inter-neuron
        // effects occur until the later synapse stage; reset remains separate.
        if(not_refractory && v > -0.045) {
            _array_default_neurons__spikespace[fused_count++] = _idx;
            _ptr_array_default_neurons_not_refractory[_idx] = false;
            _ptr_array_default_neurons_lastspike[_idx] = t;
            fly_deadline[_idx] = fly_tick + fly_refractory_ticks[_idx];
        }


    }

    _array_default_neurons__spikespace[N] = fused_count;
    const auto _end_time = std::chrono::high_resolution_clock::now();
    const auto _run_time = std::chrono::duration_cast<std::chrono::nanoseconds>(_end_time - _start_time);
    default_neurons_stateupdater_codeobject_profiling_info += _run_time;
}


