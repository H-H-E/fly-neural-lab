extern int fly_sugar_enabled;
#include "fly_lazy.h"
#include "code_objects/poissoninput_1_codeobject.h"
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
        
    inline double _rand(const int _vectorisation_idx) {
        return brian::_random_generators[0].rand();
    }
    long poissoninput_binomial_1(const int vectorisation_idx)
    {
        long X = 0;
        double px = 0.980000000000000;
        double U = _rand(vectorisation_idx);
        while (U > px)
        {
            X++;
            if (X > 1.000000000000000)
            {
                X = 0;
                px = 0.980000000000000;
                U = _rand(vectorisation_idx);
            } else
            {
                U -= px;
                px = ((1-X+1) * 0.020000000000000 * px)/(X*0.980000000000000);
            }
        }
        return X;
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



void _run_poissoninput_1_codeobject()
{
    using namespace brian;
    if(!fly_sugar_enabled) return;

    const auto _start_time = std::chrono::high_resolution_clock::now();

    ///// CONSTANTS ///////////
    const int64_t N = 1;
const double mvolt = 0.001;
const size_t _numv = 138639;
const size_t _numnot_refractory = 138639;
const size_t _num_sub_idx = 1;
    ///// POINTERS ////////////
        
    double* __restrict  _ptr_array_default_neurons_v = _array_default_neurons_v;
    char* __restrict  _ptr_array_default_neurons_not_refractory = _array_default_neurons_not_refractory;
    int32_t*   _ptr_array_default_neurons_subgroup_1__sub_idx_1 = _array_default_neurons_subgroup_1__sub_idx_1;


    //// MAIN CODE ////////////
    // scalar code
    const size_t _vectorisation_idx = -1;
        
    const double _lio_1 = 68.75 * mvolt;


    const int _N = N;
    
    for(int _idx=0; _idx<_N; _idx++)
    {
        // vector code
        const size_t _vectorisation_idx = _idx;
                
        const int32_t _sub_idx = _ptr_array_default_neurons_subgroup_1__sub_idx_1[_idx];
        const char not_refractory = _ptr_array_default_neurons_not_refractory[_sub_idx];
        fly_touch(_sub_idx);
        double v = _ptr_array_default_neurons_v[_sub_idx];
        if(not_refractory)
            v += _lio_1 * poissoninput_binomial_1(_vectorisation_idx);
        _ptr_array_default_neurons_v[_sub_idx] = v;

    }

    const auto _end_time = std::chrono::high_resolution_clock::now();
    const auto _run_time = std::chrono::duration_cast<std::chrono::nanoseconds>(_end_time - _start_time);
    poissoninput_1_codeobject_profiling_info += _run_time;
}


