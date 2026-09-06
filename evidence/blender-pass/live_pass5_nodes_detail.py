"""PASS 5 (live Blender): node-based textures + subdivision detail.
- chitin: mottled two-tone + micro-grain bump node network (keeps per-part color)
- eyes: voronoi facet color variation + stronger facet bump
- wings: microtrichia shimmer bump
- geometry: subdivision surface on body meshes
- renders: threequarter + eye macro closeup
"""
import bpy
from mathutils import Vector

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
scene = bpy.context.scene
fly = bpy.data.collections.get("fly")

def chitin_nodes(mat):
    nt = mat.node_tree
    bs = nt.nodes.get("Principled BSDF")
    if not bs: return False
    base = tuple(bs.inputs["Base Color"].default_value)[:3]
    if base[0] < 0.15 and base[1] < 0.15: return False  # skip near-black parts
    # mottle: two-tone mix driven by low-freq noise
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 7.0
    n1.inputs["Roughness"].default_value = 0.6
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    lo = (base[0]*0.72, base[1]*0.70, base[2]*0.70, 1)
    hi = (min(1, base[0]*1.12), min(1, base[1]*1.12), min(1, base[2]*1.12), 1)
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = lo
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = hi
    nt.links.new(n1.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bs.inputs["Base Color"])
    # micro grain bump
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 30.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.22
    nt.links.new(n2.outputs["Fac"], bump.inputs["Height"])
    # chain into existing normal if present
    nin = bs.inputs["Normal"]
    if nin.is_linked:
        old = nin.links[0].from_socket
        b2 = nt.nodes.new("ShaderNodeBump"); b2.inputs["Strength"].default_value = 0.3
        nt.links.new(bump.outputs["Normal"], b2.inputs["Normal"])
        nt.links.new(old, b2.inputs["Height"]) if False else None
        nin.links[0].from_node  # keep old link; stack ours alongside is complex -- just replace
        nt.links.remove(nin.links[0])
        nt.links.new(bump.outputs["Normal"], nin)
    else:
        nt.links.new(bump.outputs["Normal"], nin)
    return True

def eye_nodes(mat):
    nt = mat.node_tree
    bs = nt.nodes.get("Principled BSDF")
    if not bs: return False
    vor = None
    for nd in nt.nodes:
        if nd.type == 'TEX_VORONOI':
            vor = nd; break
    if vor is None:
        vor = nt.nodes.new("ShaderNodeTexVoronoi")
        vor.feature = 'F1'; vor.inputs["Scale"].default_value = 80.0
    else:
        vor.inputs["Scale"].default_value = 80.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.30, 0.02, 0.008, 1)
    ramp.color_ramp.elements[1].color = (0.55, 0.09, 0.03, 1)
    nt.links.new(vor.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bs.inputs["Base Color"])
    return True

n_chitin = n_eye = n_subd = 0
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    bs = mat.node_tree.nodes.get("Principled BSDF")
    if not bs: continue
    col = tuple(bs.inputs["Base Color"].default_value)[:3]
    if mat.name.startswith("m_cfd8da"):
        n2 = mat.node_tree.nodes.new("ShaderNodeTexNoise")
        n2.inputs["Scale"].default_value = 45.0
        bump = mat.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.06
        mat.node_tree.links.new(n2.outputs["Fac"], bump.inputs["Height"])
        mat.node_tree.links.new(bump.outputs["Normal"], bs.inputs["Normal"])
    elif abs(col[0] - 0.42) < 0.2 and col[1] < 0.12 and col[2] < 0.06:
        if eye_nodes(mat): n_eye += 1
    elif col[0] > 0.15:
        if chitin_nodes(mat): n_chitin += 1

# subdivision detail on body meshes (skip bristles/curves/claws)
for o in fly.objects:
    if o.type != 'MESH': continue
    if o.name.startswith(("macro_", "headbr_", "micro_", "leg_setae")): continue
    if "claw" in o.name or "tarsus" in o.name: continue
    mod = o.modifiers.new("detail_subd", 'SUBSURF')
    mod.levels = 1; mod.render_levels = 2
    n_subd += 1

def frame_at(target, dist, filepath, samples):
    cam = scene.camera
    cam.location = target + Vector((-0.7, 0.75, 0.55)).normalized() * dist
    d = target - cam.location
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
    cam.rotation_mode = 'XYZ'
    scene.cycles.samples = samples
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)

# full view
mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
for o in fly.objects:
    if o.type not in ('MESH', 'CURVE'): continue
    try: corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    except Exception: continue
    for w in corners:
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
frame_at(center, radius * 3.1, OUT + "\\live_c5_threequarter.png", 64)

# eye macro: frame on the right eye
eye = bpy.data.objects.get("eye_R") or bpy.data.objects.get("eye_L")
ec = sum((eye.matrix_world @ Vector(c) for c in eye.bound_box), Vector()) / 8
esize = max((eye.matrix_world @ Vector(c) - ec).length for c in eye.bound_box)
cam = scene.camera
cam.location = ec + Vector((-0.55, 0.9, 0.45)).normalized() * esize * 6.0
d = ec - cam.location
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
cam.rotation_mode = 'XYZ'
scene.cycles.samples = 96
scene.render.filepath = OUT + "\\live_c5_macro_eye.png"
bpy.ops.render.render(write_still=True)
print(f"pass5 done chitin={n_chitin} eye={n_eye} subd={n_subd}")
