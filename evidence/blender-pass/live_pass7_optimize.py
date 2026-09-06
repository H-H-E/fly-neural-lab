"""PASS 7 (live Blender): optimize + save .blend.
- join static decor (macro/head bristles, claws into tarsi, veins per wing)
- report object + triangle counts before/after (evaluated depsgraph)
- save fly_lookdev.blend
"""
import bpy
from mathutils import Vector

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
fly = bpy.data.collections.get("fly")

def tris_total():
    deps = bpy.context.evaluated_depsgraph_get()
    total = 0
    for o in fly.objects:
        if o.type != 'MESH': continue
        try:
            em = o.evaluated_get(deps)
            mesh = em.to_mesh()
            total += len(mesh.loop_triangles)
            em.to_mesh_clear()
        except Exception:
            pass
    return total

n0, t0 = len(fly.objects), tris_total()

def join_by_prefix(prefixes, new_name):
    bpy.ops.object.select_all(action='DESELECT')
    obs = [o for o in fly.objects if any(o.name.startswith(p) for p in prefixes)]
    if len(obs) < 2: return None
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    obs[0].name = new_name
    return obs[0]

join_by_prefix(["macro_"], "thoracic_macrochaetae")
join_by_prefix(["headbr_"], "head_bristles")
for side in ("L", "R"):
    join_by_prefix([f"vein_{side}_"], f"wing_venation_{side}")

# claws -> join with same-leg tarsus3 (keeps 2 material slots, fine)
for pos in ["F", "M", "H"]:
    for side in ["L", "R"]:
        tgt = bpy.data.objects.get(f"{pos}{side}_tarsus3")
        cl = [o for o in fly.objects if o.name.startswith(f"{pos}{side}_claw")]
        if tgt and cl:
            bpy.ops.object.select_all(action='DESELECT')
            tgt.select_set(True)
            for o in cl: o.select_set(True)
            bpy.context.view_layer.objects.active = tgt
            bpy.ops.object.join()

n1, t1 = len(fly.objects), tris_total()
bpy.ops.wm.save_as_mainfile(filepath=OUT + "\\fly_lookdev.blend")
print(f"optimize: objects {n0}->{n1}, tris {t0}->{t1}, saved fly_lookdev.blend")
for o in sorted(fly.objects, key=lambda o: o.name):
    print("  kept:", o.name, o.type)
