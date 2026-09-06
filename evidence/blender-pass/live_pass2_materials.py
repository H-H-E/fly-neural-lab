"""PASS 2 (live Blender): lifelike materials. Operates on objects built by live_build_v1.py."""
import bpy, math
from mathutils import Vector

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"

fly = bpy.data.collections.get("fly")

def add_bump(mat, scale, strength, distortion=0.0):
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if not bsdf: return
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Roughness"].default_value = 0.7
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

EYE_HEX = 0x9e1c08
n_cut = n_eye = 0
for mat in list(bpy.data.materials):
    if not mat.use_nodes: continue
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if not bsdf: continue
    col = tuple(bsdf.inputs["Base Color"].default_value)[:3]
    is_wing = mat.name.startswith("m_cfd8da")
    is_eye = abs(col[0] - 0.62) < 0.08 and col[1] < 0.16 and col[2] < 0.08
    if is_wing:
        bsdf.inputs["Alpha"].default_value = 0.12
        bsdf.inputs["Roughness"].default_value = 0.30
    elif is_eye:
        # deep brick red, faceted, wet coat
        bsdf.inputs["Base Color"].default_value = (0.42, 0.045, 0.02, 1)
        bsdf.inputs["Roughness"].default_value = 0.28
        bsdf.inputs["Specular IOR Level"].default_value = 0.6
        try: bsdf.inputs["Coat Weight"].default_value = 0.55
        except KeyError: pass
        nt = mat.node_tree
        vor = nt.nodes.new("ShaderNodeTexVoronoi")
        vor.feature = 'F1'; vor.inputs["Scale"].default_value = 60.0
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.6
        nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        n_eye += 1
    else:
        # chitin: warm subsurface, satin roughness, micro grain
        try: bsdf.inputs["Subsurface Weight"].default_value = 0.28
        except KeyError:
            try: bsdf.inputs["Subsurface"].default_value = 0.28
            except KeyError: pass
        try:
            bsdf.inputs["Subsurface Color"].default_value = (0.5, 0.22, 0.08, 1)
            bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.4, 0.25)
        except KeyError: pass
        bsdf.inputs["Roughness"].default_value = 0.55
        try: bsdf.inputs["Specular IOR Level"].default_value = 0.35
        except KeyError: pass
        add_bump(mat, 25.0, 0.25)
        # pale default material (abdomen proxy white) -> amber base
        if col[0] > 0.85 and col[1] > 0.85 and col[2] > 0.85:
            bsdf.inputs["Base Color"].default_value = (0.5, 0.30, 0.12, 1)
        n_cut += 1

# male tergite gradient: amber front -> near-black terminal
amber = (0.55, 0.33, 0.13, 1); dark = (0.07, 0.045, 0.03, 1)
for i in range(1, 7):
    o = bpy.data.objects.get(f"tergite_{i}")
    if not o: continue
    t = (i - 1) / 5.0
    m = bpy.data.materials.new(f"tergite_mat_{i}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = tuple(amber[k] + (dark[k] - amber[k]) * t for k in range(4))
    b.inputs["Roughness"].default_value = 0.5
    try: b.inputs["Subsurface Weight"].default_value = 0.2
    except KeyError: pass
    o.data.materials.clear(); o.data.materials.append(m)

# frame + shoot threequarter only
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in fly.objects:
    if o.type != 'MESH': continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
cam = scene.camera
cam.location = center + Vector((-0.7, 0.75, 0.55)).normalized() * radius * 3.1
d = center - cam.location
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
cam.rotation_mode = 'XYZ'
scene.render.filepath = OUT + "\\live_c2_threequarter.png"
bpy.ops.render.render(write_still=True)
print(f"materials done cut={n_cut} eye={n_eye} rendered live_c2_threequarter")
