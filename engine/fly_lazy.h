#pragma once
#include "objects.h"
#include <vector>
#include <algorithm>
#include <stdexcept>
extern std::vector<int> fly_live;
extern unsigned char fly_touched[138639];
extern bool fly_dirty;
extern double fly_idle_v;
inline void fly_touch(int i) {
    if(!fly_touched[i]) {
        fly_touched[i]=1;
        brian::_array_default_neurons_v[i]=fly_idle_v;
        fly_live.push_back(i);
        fly_dirty=true;
    }
}
inline void fly_materialize() {
    for(int i=0;i<138639;++i)
        if(!fly_touched[i]) brian::_array_default_neurons_v[i]=fly_idle_v;
}
