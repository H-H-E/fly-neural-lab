"""PASS 4 (live Blender): thin+shorten bristles, deepen cuticle tone. Render 3/4."""
import bpy
from mathutils import Vector

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
scene = bpy.context.scene
fly = bpy.data.collections.get("fly")

n = 0
for o in fly.objects:
    if o.name.startswith("macro_") or o.name.startswith("headbr_"):
        # local Z runs along the bristle shaft: thinner + a touch shorter
        o.scale = (0.55, 0.55, 0.8)
        n += 1
    if o.type == 'CURVE' and "_b" in o.name and o.name.startswith("arista_"):
        o.data.bevel_depth = 0.002

for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    bs = mat.node_tree.nodes.get("Principled BSDF")
    if not bs: continue
    col = tuple(bs.inputs["Base Color"].default_value)[:3]
    # pale chitin stand-ins -> deeper honey brown
    if col[0] > 0.40 and col[1] > 0.20 and col[2] < 0.20 and col[0] - col[2] > 0.25:
        bs.inputs["Base Color"].default_value = (0.40, 0.205, 0.075, 1)
        bs.inputs["Roughness"].default_value = 0.50

mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in fly.objects:
    if o.type not in ('MESH', 'CURVE'): continue
    try: corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    except Exception: continue
    for w in corners:
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
cam = scene.camera
scene.cycles.samples = 48
cam.location = center + Vector((-0.7, 0.75, 0.55)).normalized() * radius * 3.1
d = center - cam.location
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
cam.rotation_mode = 'XYZ'
scene.render.filepath = OUT + "\\live_c4_threequarter.png"
bpy.ops.render.render(write_still=True)
print(f"pass4 done thinned={n}")
