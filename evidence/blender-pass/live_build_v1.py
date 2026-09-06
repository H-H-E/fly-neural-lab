"""Build 1:1 Blender proxy of the current Three.js fly from fly_spec.json, render 4 views.
Run: blender --background --python build_fly_v1.py
"""
import bpy, json, os, math
from mathutils import Vector, Quaternion

HERE = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
SPEC = json.load(open(os.path.join(HERE, "fly_spec.json")))
OUT = HERE

# ---- clean ----
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mat_for(hexcol, name):
    key = f"m_{hexcol:06x}" if hexcol else "m_none"
    m = bpy.data.materials.get(key)
    if m: return m
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    if hexcol:
        r = ((hexcol >> 16) & 255) / 255; g = ((hexcol >> 8) & 255) / 255; b = (hexcol & 255) / 255
        bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
    if "wing" in name:
        bsdf.inputs["Alpha"].default_value = 0.22
        m.blend_method = 'BLEND'
    else:
        bsdf.inputs["Roughness"].default_value = 0.42
    return m

fly = bpy.data.collections.new("fly")
bpy.context.scene.collection.children.link(fly)

def cv(v):
    """three.js (x=aft, y=up, z=lateral) -> blender (x=aft, y=lateral, z=up)"""
    return (v[0], v[2], v[1])

def add_ellipsoid(name, mn, mx, colorHex):
    mn, mx = cv(mn), cv(mx)
    cx = [(mn[i] + mx[i]) / 2 for i in range(3)]
    rx = [(mx[i] - mn[i]) / 2 for i in range(3)]
    if max(rx) < 1e-4: return
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=cx)
    o = bpy.context.active_object
    o.name = name
    o.scale = (rx[0], rx[1], rx[2])
    # three.js SphereGeometry scaled: radius 1 -> rx; blender sphere radius 1 -> same
    o.data.materials.append(mat_for(colorHex, name))
    for coll in list(o.users_collection): coll.objects.unlink(o)
    fly.objects.link(o)
    return o

def add_tube(name, a, b, r, colorHex):
    a, b = cv(a), cv(b)
    d = Vector(b) - Vector(a)
    if d.length < 1e-6: return
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length,
        location=(Vector(a) + Vector(b)) / 2)
    o = bpy.context.active_object
    o.name = name
    # orient Z along d
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.rotation_mode = 'XYZ'
    o.data.materials.append(mat_for(colorHex, name))
    for coll in list(o.users_collection): coll.objects.unlink(o)
    fly.objects.link(o)
    return o

B = SPEC["bones"]
RADII = {"coxa": .034, "femur": .032, "tibia": .026}

# ---- body meshes (skip instanced setae, veins, claws, combs for v1 proxy) ----
SKIP_SUB = ("micro_setae", "leg_setae", "venation", "claws", "sex_comb", "macrochaetae",
            "head_bristles", "ocelli", "_hinge", "pleura", "scutellum", "surstyli",
            "genital_arch", "labella", "haustellum", "funiculus", "pedicel", "arista",
            "stem_capitellum", "_mesh", "tarsomeres", "leg_joint")
for e in SPEC["meshes"]:
    n = e["name"] or ""
    if e.get("isInstanced"): continue
    if any(s in n for s in SKIP_SUB): continue
    if "membrane" in n:
        # rebuild below with bone transform
        continue
    add_ellipsoid(n, e["worldMin"], e["worldMax"], e.get("colorHex"))

# ---- legs from bone chains ----
for pos in ["F", "M", "H"]:
    for side in ["L", "R"]:
        chain = [f"leg_{pos}{side}_coxa", f"leg_{pos}{side}_femur",
                 f"leg_{pos}{side}_tibia", f"leg_{pos}{side}_tarsus"]
        pts = [Vector(B[c]["pos"]) for c in chain if c in B]
        # tarsus tip approx: extend last segment direction using mesh bbox
        for a, b, seg in zip(pts[:-1], pts[1:], ["coxa", "femur", "tibia"]):
            add_tube(f"{pos}{side}_{seg}", a, b, RADII[seg], 0x85501f)

# ---- wings from outline + bone transform ----
for e in SPEC["meshes"]:
    n = e["name"] or ""
    if "membrane" not in n: continue
    side = 1 if "_L_" in n else -1
    bone = B.get(f"wing_{'L' if side > 0 else 'R'}")
    bp, bq = Vector(bone["pos"]), Quaternion([bone["quat"][3], bone["quat"][0], bone["quat"][1], bone["quat"][2]])
    # three.js quat is (x,y,z,w); mathutils wants (w,x,y,z)
    # correct: rotate in three.js space, then convert the result to blender axes
    world = [Vector(cv(bp + bq @ Vector(p))) for p in e["outline"]]
    mesh = bpy.data.meshes.new(n)
    mesh.from_pydata(world, [], [list(range(len(world)))])
    mesh.update()
    o = bpy.data.objects.new(n, mesh)
    fly.objects.link(o)
    o.data.materials.append(mat_for(0xcfd8da, "wing_membrane"))

# ---- lights / world ----
world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.165, 0.18, 0.149, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.render.resolution_x, scene.render.resolution_y = 900, 700
scene.render.film_transparent = False

def area(name, loc, energy):
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.active_object; o.name = name
    o.data.energy = energy; o.data.size = 3

area("Key", (2, -3, 4), 900)
area("Rim", (-3, 2.5, 1.5), 400)
area("Fill", (0, 1, -3), 300)

mn = Vector(SPEC["bbox"]["min"]); mx = Vector(SPEC["bbox"]["max"])
# three (x=aft, y=up, z=lat) -> blender (x=aft, y=lat, z=up)
def C(v): return Vector((v[0], v[2], v[1]))
center, size = C((mn + mx) / 2), mx - mn
radius = max(size)
camdata = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", camdata)
scene.collection.objects.link(cam)
scene.camera = cam
camdata.lens = 55

print("DIAG n_fly_objects:", len(fly.objects))
import mathutils as _mm
_all = [o.matrix_world.translation for o in fly.objects]
if _all:
    xs = [p.x for p in _all]; ys = [p.y for p in _all]; zs = [p.z for p in _all]
    print("DIAG XR", round(min(xs), 3), round(max(xs), 3))
    print("DIAG YR", round(min(ys), 3), round(max(ys), 3))
    print("DIAG ZR", round(min(zs), 3), round(max(zs), 3))
print("DIAG CENTER", [round(v, 3) for v in center], "RADIUS", round(radius, 3))
VIEWS = {  # directions already in blender coords (x=aft, y=lateral, z=up)
    "b1_side": Vector((0, 1, 0.25)),
    "b1_top": Vector((0, 0.02, 1)),
    "b1_front": Vector((-1, 0, 0.15)),
    "b1_threequarter": Vector((-0.7, 0.75, 0.55)),
}
for vname, dd in VIEWS.items():
    d = radius * 3.1
    cam.location = center + dd.normalized() * d
    # look at center
    direction = center - cam.location
    cam.rotation_mode = 'QUATERNION'
    q = direction.to_track_quat('-Z', 'Y')
    cam.rotation_quaternion = q
    cam.rotation_mode = 'XYZ'
    scene.render.filepath = os.path.join(OUT, vname + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", vname)
