"""PASS 8 (live Blender): rig to a 43-bone armature (shipped joint names),
bone-parent every mesh, pose-flex test render, save fly_rigged.blend."""
import bpy, json, os
from mathutils import Vector, Quaternion

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
SPEC = json.load(open(os.path.join(OUT, "fly_spec.json")))
B = SPEC["bones"]
fly = bpy.data.collections.get("fly")
scene = bpy.context.scene

def cv(v): return Vector((v[0], v[2], v[1]))
POS = {k: cv(v["pos"]) for k, v in B.items()}

CHILDREN = {
    "fly_root": ["thorax"],
    "thorax": ["head", "wing_L", "wing_R", "haltere_L", "haltere_R",
               "abdomen_1", "leg_FL_coxa", "leg_FR_coxa", "leg_ML_coxa",
               "leg_MR_coxa", "leg_HL_coxa", "leg_HR_coxa"],
    "head": ["antenna_L", "antenna_R", "proboscis"],
    "antenna_L": ["arista_L"], "antenna_R": ["arista_R"],
    "abdomen_1": ["abdomen_2"], "abdomen_2": ["abdomen_3"],
    "abdomen_3": ["abdomen_4"], "abdomen_4": ["abdomen_5"],
    "abdomen_5": ["abdomen_6"], "abdomen_6": ["terminalia"],
}
for pos in ["F", "M", "H"]:
    for side in ["L", "R"]:
        p = f"leg_{pos}{side}"
        CHILDREN[f"{p}_coxa"] = [f"{p}_femur"]
        CHILDREN[f"{p}_femur"] = [f"{p}_tibia"]
        CHILDREN[f"{p}_tibia"] = [f"{p}_tarsus"]

PARENT = {}
for p, ch in CHILDREN.items():
    for c in ch: PARENT[c] = p

# ---------- armature ----------
bpy.ops.object.armature_add(enter_editmode=False, location=(0, 0, 0))
arm = bpy.context.active_object
arm.name = "fly_rig"
for coll in list(arm.users_collection): coll.objects.unlink(arm)
fly.objects.link(arm)
adt = arm.data
adt.name = "fly_armature"
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
ebs = adt.edit_bones
ebs.remove(ebs[0])
made = {}
for name, H in POS.items():
    eb = ebs.new(name)
    eb.head = H
    made[name] = eb
for name, eb in made.items():
    kids = CHILDREN.get(name, [])
    if kids:
        pts = [POS[k] for k in kids if k in POS]
        eb.tail = sum(pts, Vector()) / len(pts)
    else:
        ph = POS.get(PARENT.get(name, ""), None)
        d = (eb.head - ph) if ph is not None else Vector((0, 0, 0.1))
        if d.length < 1e-6: d = Vector((0, 0, 0.1))
        eb.tail = eb.head + d.normalized() * 0.12
    if (eb.tail - eb.head).length < 1e-5:
        eb.tail = eb.head + Vector((0, 0, 0.1))
bpy.ops.object.mode_set(mode='OBJECT')

MESH_BONE = {
    "thorax_cuticle": "thorax", "thoracic_macrochaetae": "thorax",
    "thoracic_microchaetae": "thorax",
    "head_capsule": "head", "head_bristles": "head",
    "eye_L": "head", "eye_R": "head",
    "interommatidial_L": "head", "interommatidial_R": "head",
    "pedicel_L": "antenna_L", "funiculus_L": "antenna_L",
    "pedicel_R": "antenna_R", "funiculus_R": "antenna_R",
    "haustellum": "proboscis", "labellum_1": "proboscis", "labellum_-1": "proboscis",
    "wing_L_membrane": "wing_L", "wing_venation_L": "wing_L", "wing_fringe_L": "wing_L",
    "wing_R_membrane": "wing_R", "wing_venation_R": "wing_R", "wing_fringe_R": "wing_R",
}
for i in range(1, 7):
    MESH_BONE[f"tergite_{i}"] = f"abdomen_{i}"
for pos in ["F", "M", "H"]:
    for side in ["L", "R"]:
        p = f"{pos}{side}"
        MESH_BONE[f"{p}_coxa"] = f"leg_{p}_coxa" if False else f"leg_{pos}{side}_coxa"
        MESH_BONE[f"{p}_femur"] = f"leg_{pos}{side}_femur"
        MESH_BONE[f"{p}_femur_swell"] = f"leg_{pos}{side}_femur"
        MESH_BONE[f"{p}_knee"] = f"leg_{pos}{side}_femur"
        MESH_BONE[f"{p}_tibia"] = f"leg_{pos}{side}_tibia"
        MESH_BONE[f"{p}_tarsus1"] = f"leg_{pos}{side}_tarsus"
        MESH_BONE[f"{p}_tarsus2"] = f"leg_{pos}{side}_tarsus"
        MESH_BONE[f"{p}_tarsus3"] = f"leg_{pos}{side}_tarsus"
for prefix, bone in [("arista_L", "arista_L"), ("arista_R", "arista_R")]:
    for o in fly.objects:
        if o.name == prefix or o.name.startswith(prefix + "_"):
            MESH_BONE[o.name] = bone

n_ok, missing = 0, []
for oname, bname in MESH_BONE.items():
    o = bpy.data.objects.get(oname)
    if not o or bname not in made:
        missing.append(oname); continue
    W = o.matrix_world.copy()
    o.parent = arm
    o.parent_bone = bname
    o.parent_type = 'BONE'
    o.matrix_world = W
    n_ok += 1

# ---------- pose-flex test ----------
pb = arm.pose.bones
pb["leg_FL_tibia"].rotation_mode = 'XYZ'
pb["leg_FL_tibia"].rotation_euler = (0.55, 0.0, 0.0)
pb["wing_L"].rotation_mode = 'XYZ'
pb["wing_L"].rotation_euler = (0.0, 0.0, 0.45)
bpy.context.view_layer.update()

mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
for o in fly.objects:
    if o.type not in ('MESH', 'CURVE') or o == arm: continue
    try: corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    except Exception: continue
    for w in corners:
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
cam = scene.camera
cam.location = center + Vector((-0.7, 0.75, 0.55)).normalized() * radius * 3.1
d = center - cam.location
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
cam.rotation_mode = 'XYZ'
scene.cycles.samples = 48
scene.render.filepath = OUT + "\\live_rig_pose.png"
bpy.ops.render.render(write_still=True)

for b in pb:
    b.rotation_euler = (0, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=OUT + "\\fly_rigged.blend")
print(f"rig done: bones={len(made)} parented={n_ok} missing={missing}")
