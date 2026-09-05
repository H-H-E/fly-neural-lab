PROGRAM = main

SRCS = brianlib/spikequeue.cpp code_objects/after_run_default_neurons_spike_thresholder_codeobject.cpp code_objects/before_run_default_synapses_pre_push_spikes.cpp code_objects/default_neurons_spike_resetter_codeobject.cpp code_objects/default_neurons_spike_thresholder_codeobject.cpp code_objects/default_neurons_stateupdater_codeobject.cpp code_objects/default_synapses_pre_codeobject.cpp code_objects/default_synapses_pre_push_spikes.cpp code_objects/default_synapses_synapses_create_array_codeobject.cpp code_objects/poissoninput_10_codeobject.cpp code_objects/poissoninput_11_codeobject.cpp code_objects/poissoninput_12_codeobject.cpp code_objects/poissoninput_13_codeobject.cpp code_objects/poissoninput_14_codeobject.cpp code_objects/poissoninput_15_codeobject.cpp code_objects/poissoninput_16_codeobject.cpp code_objects/poissoninput_17_codeobject.cpp code_objects/poissoninput_18_codeobject.cpp code_objects/poissoninput_19_codeobject.cpp code_objects/poissoninput_1_codeobject.cpp code_objects/poissoninput_20_codeobject.cpp code_objects/poissoninput_2_codeobject.cpp code_objects/poissoninput_3_codeobject.cpp code_objects/poissoninput_4_codeobject.cpp code_objects/poissoninput_5_codeobject.cpp code_objects/poissoninput_6_codeobject.cpp code_objects/poissoninput_7_codeobject.cpp code_objects/poissoninput_8_codeobject.cpp code_objects/poissoninput_9_codeobject.cpp code_objects/poissoninput_codeobject.cpp code_objects/spikemonitor_codeobject.cpp main.cpp network.cpp objects.cpp run.cpp synapses_classes.cpp
H_SRCS = brianlib/clocks.h brianlib/common_math.h brianlib/dynamic_array.h brianlib/spikequeue.h code_objects/after_run_default_neurons_spike_thresholder_codeobject.h code_objects/before_run_default_synapses_pre_push_spikes.h code_objects/default_neurons_spike_resetter_codeobject.h code_objects/default_neurons_spike_thresholder_codeobject.h code_objects/default_neurons_stateupdater_codeobject.h code_objects/default_synapses_pre_codeobject.h code_objects/default_synapses_pre_push_spikes.h code_objects/default_synapses_synapses_create_array_codeobject.h code_objects/poissoninput_10_codeobject.h code_objects/poissoninput_11_codeobject.h code_objects/poissoninput_12_codeobject.h code_objects/poissoninput_13_codeobject.h code_objects/poissoninput_14_codeobject.h code_objects/poissoninput_15_codeobject.h code_objects/poissoninput_16_codeobject.h code_objects/poissoninput_17_codeobject.h code_objects/poissoninput_18_codeobject.h code_objects/poissoninput_19_codeobject.h code_objects/poissoninput_1_codeobject.h code_objects/poissoninput_20_codeobject.h code_objects/poissoninput_2_codeobject.h code_objects/poissoninput_3_codeobject.h code_objects/poissoninput_4_codeobject.h code_objects/poissoninput_5_codeobject.h code_objects/poissoninput_6_codeobject.h code_objects/poissoninput_7_codeobject.h code_objects/poissoninput_8_codeobject.h code_objects/poissoninput_9_codeobject.h code_objects/poissoninput_codeobject.h code_objects/spikemonitor_codeobject.h network.h objects.h run.h synapses_classes.h
OBJS = ${SRCS:.cpp=.o}
OBJS := ${OBJS:.c=.o}
OPTIMISATIONS = -I"/opt/codex/runtimes/codex-primary-runtime/dependencies/python/include" -O3 -march=native -fno-fast-math -ffp-contract=off
CXXFLAGS = -c -Wno-write-strings $(OPTIMISATIONS) -I.  
LFLAGS =  -L"/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib" -Wl,--enable-new-dtags -Wl,-rpath,"/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib" 
DEPS = make.deps

all: $(PROGRAM)

.PHONY: all clean

$(PROGRAM): $(OBJS) $(DEPS) makefile
	$(CXX) $(OBJS) -o $(PROGRAM) $(LFLAGS)

clean:
	rm $(OBJS) $(PROGRAM) $(DEPS)

make.deps: $(SRCS) $(H_SRCS)
	$(CXX) $(CXXFLAGS) -MM $(SRCS) > make.deps

ifneq ($(wildcard $(DEPS)), )
include $(DEPS)
endif

%.o : %.cpp makefile
	$(CXX) $(CXXFLAGS) $< -o $@