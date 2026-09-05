"""Recompile the included live engine using an installed Emscripten SDK."""
from pathlib import Path
import os,subprocess
root=Path(__file__).parent;engine=root/'engine'
cmd=[os.environ.get('EMXX','em++'),*[str(p.relative_to(engine)) for p in engine.rglob('*.cpp')],'-I.','-O3','-fno-fast-math','-ffp-contract=off','-sALLOW_MEMORY_GROWTH=1','-sMAXIMUM_MEMORY=2147483648','-sFORCE_FILESYSTEM=1','-sMODULARIZE=1','-sEXPORT_ES6=1','-sINVOKE_RUN=0','-sNO_EXIT_RUNTIME=1','-sEXPORTED_RUNTIME_METHODS=["FS","callMain","HEAP32","HEAPF64"]','-sENVIRONMENT=web,worker,node','-o','../dist/brain-live.mjs']
subprocess.run(cmd,cwd=engine,check=True)
