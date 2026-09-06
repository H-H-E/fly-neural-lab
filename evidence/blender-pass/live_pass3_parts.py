"""PASS 3 (live Blender): jointed tapered legs + tarsi/claws, wing veins,
thoracic macrochaetae, head bristles, antennae+aristae, proboscis. Then render."""
import bpy, json, os
from mathutils import Vector, Quaternion

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
SPEC = json.load(open(os.path.join(OUT, "fly_spec.json")))
B = SPEC["bones"]
scene = bpy.context.scene
fly = bpy.data.collections.get("fly")

def cv(v):
    return (v[0], v[2], v[1])

def W(bone_name, local):
    """bone-local three.js coords -> blender world"""
    b = B[bone_name]
    bp = Vector(b["pos"])
    q = b["quat"]
    bq = Quaternion([q[3], q[0], q[1], q[2]])
    return Vector(cv(bp + bq @ Vector(local)))

def get_mat(name, rgba, rough=0.55):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = rgba
    bs.inputs["Roughness"].default_value = rough
    return m

leg_mat = get_mat("live_leg", (0.45, 0.26, 0.10, 1), 0.5)
dark_mat = get_mat("live_dark_hair", (0.16, 0.11, 0.07, 1), 0.62)
vein_mat = get_mat("live_vein", (0.40, 0.30, 0.17, 1), 0.5)
vein_mat.blend_method = 'BLEND'
try: vein_mat.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.65
except KeyError: pass

def link(o):
    for coll in list(o.users_collection):
        coll.objects.unlink(o)
    fly.objects.link(o)
    return o

def add_tapered(name, a, b, r1, r2, mat):
    a, b = Vector(a), Vector(b)
    d = b - a
    if d.length < 1e-6: return None
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=r1, depth=d.length,
                                        location=(a + b) / 2)
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.rotation_mode = 'XYZ'
    # taper top ring toward r2
    mesh = o.data
    top = [v for v in mesh.vertices if v.co.z > 0]
    f = r2 / r1 if r1 > 0 else 1.0
    for v in top:
        v.co.x *= f; v.co.y *= f
    mesh.update()
    mesh.materials.append(mat)
    return link(o)

def add_ball(name, c, r, mat, squash=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=10, location=Vector(c))
    o = bpy.context.active_object
    o.name = name
    o.scale = squash or (r, r, r)
    o.data.materials.append(mat)
    return link(o)

def add_curve_tube(name, pts, radius, mat):
    cu = bpy.data.curves.new(name, type='CURVE')
    cu.dimensions = '3D'
    spl = cu.splines.new('POLY')
    spl.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        spl.points[i].co = (p[0], p[1], p[2], 1.0)
    cu.bevel_depth = radius
    cu.bevel_resolution = 1
    o = bpy.data.objects.new(name, cu)
    o.data.materials.append(mat)
    return link(o)

# ---- replace stick legs ----
for pos in ["F", "M", "H"]:
    for side, sgn in [("L", 1), ("R", -1)]:
        for seg in ["coxa", "femur", "tibia"]:
            o = bpy.data.objects.get(f"{pos}{side}_{seg}")
            if o: bpy.data.objects.remove(o, do_unlink=True)
        P = {}
        for seg in ["coxa", "femur", "tibia", "tarsus"]:
            b = B[f"leg_{pos}{side}_{seg}"]
            P[seg] = Vector(b["pos"])  # three space
        C, F, T, Ta = P["coxa"], P["femur"], P["tibia"], P["tarsus"]
        add_tapered(f"{pos}{side}_coxa", cv(C), cv(F), .038, .030, leg_mat)
        add_tapered(f"{pos}{side}_femur", cv(F), cv(T), .037, .027, leg_mat)
        mid = (Vector(cv(F)) + Vector(cv(T))) / 2
        add_ball(f"{pos}{side}_femur_swell", mid, 1.0, leg_mat, squash=(.048, .044, .046))
        add_ball(f"{pos}{side}_knee", cv(T), 1.0, leg_mat, squash=(.031, .028, .031))
        add_tapered(f"{pos}{side}_tibia", cv(T), cv(Ta), .027, .018, leg_mat)
        # tarsus: 3 segs with droop, then claws
        d = (Ta - T)
        d = d / d.length if d.length > 1e-9 else Vector((0, -1, 0))
        down = Vector((0, -1, 0))
        p0, p1 = Ta, Ta + d * .18
        p2, p3 = Ta + d * .33 + down * .03, Ta + d * .50 + down * .09
        add_tapered(f"{pos}{side}_tarsus1", cv(p0), cv(p1), .018, .014, leg_mat)
        add_tapered(f"{pos}{side}_tarsus2", cv(p1), cv(p2), .014, .010, leg_mat)
        add_tapered(f"{pos}{side}_tarsus3", cv(p2), cv(p3), .010, .006, leg_mat)
        lat = Vector((0, 0, float(sgn)))
        for k, s in enumerate([1, -1]):
            cd = (d * .45 + down * .85 + lat * .35 * s)
            cd = cd / cd.length
            tip = p3 + cd * .075
            add_tapered(f"{pos}{side}_claw{k}", cv(p3), cv(tip), .006, .001, dark_mat)

# ---- wing veins (local coords from flyRigged, y=0.008 plane) ----
VEINS = [
    [[0.02,0.01],[0.20,0.16],[0.74,0.37],[1.38,0.47],[1.74,0.39],[1.91,0.25]],
    [[0.04,0.00],[0.24,0.10],[0.63,0.25],[1.02,0.34]],
    [[0.03,0.00],[0.26,0.065],[0.64,0.16],[1.18,0.22],[1.66,0.235]],
    [[0.04,0.00],[0.28,0.02],[0.64,0.055],[1.09,0.06],[1.55,0.03]],
    [[0.04,0.00],[0.26,-0.01],[0.64,-0.03],[1.09,-0.075],[1.48,-0.12]],
    [[0.04,0.00],[0.23,-0.032],[0.53,-0.082],[0.92,-0.13],[1.23,-0.15]],
    [[0.03,-0.01],[0.17,-0.065],[0.35,-0.11],[0.65,-0.175]],
    [[0.03,-0.02],[0.10,-0.07],[0.23,-0.11],[0.39,-0.14]],
    [[0.63,0.16],[0.66,0.095],[0.64,0.055],[0.62,-0.02]],
    [[1.05,0.068],[1.06,0.01],[1.07,-0.07],[1.04,-0.12]],
]
for side, sgn in [("L", 1), ("R", -1)]:
    for vi, v in enumerate(VEINS):
        pts = [W(f"wing_{side}", (x, 0.008, sgn * z)) for x, z in v]
        add_curve_tube(f"vein_{side}_{vi}", pts, 0.006, vein_mat)

# ---- thoracic macrochaetae + head bristles (thorax/head local) ----
MACRO = [
    [[-0.24,0.34, 0.18],[-.30,.68,.20]], [[-0.24,0.34,-0.18],[-.30,.68,-.20]],
    [[-0.05,0.40, 0.14],[-.07,.74,.14]], [[-0.05,0.40,-0.14],[-.07,.74,-.14]],
    [[0.14,0.39, 0.15],[.19,.76,.17]], [[0.14,0.39,-0.15],[.19,.76,-.17]],
    [[0.37,0.26, 0.20],[.44,.62,.30]], [[0.37,0.26,-0.20],[.44,.62,-.30]],
    [[0.43,0.19, 0.23],[.68,.46,.44]], [[0.43,0.19,-0.23],[.68,.46,-.44]],
]
for i, (a, b) in enumerate(MACRO):
    add_tapered(f"macro_{i}", W("thorax", a), W("thorax", b), .011, .002, dark_mat)
HEAD_B = [
    [[-0.10,.28,.22],[-.25,.78,.32]], [[-0.10,.28,-.22],[-.25,.78,-.32]],
    [[-.27,.18,.23],[-.55,.55,.42]], [[-.27,.18,-.23],[-.55,.55,-.42]],
    [[-.31,-.02,.20],[-.62,.18,.38]], [[-.31,-.02,-.20],[-.62,.18,-.38]],
]
for i, (a, b) in enumerate(HEAD_B):
    add_tapered(f"headbr_{i}", W("head", a), W("head", b), .006, .001, dark_mat)

# ---- antennae: pedicel + funiculus + arista shaft/branches ----
for side, sgn in [("L", 1), ("R", -1)]:
    base = (-0.335, 0.06, sgn * 0.16)
    add_ball(f"pedicel_{side}", W("head", base), 1.0, leg_mat, squash=(.065, .052, .060))
    add_ball(f"funiculus_{side}", W("head", (base[0]-0.07, base[1]-0.01, base[2]+sgn*0.015)),
             1.0, leg_mat, squash=(.095, .055, .070))
    ar = (base[0]-0.12, base[1]+0.01, base[2]+sgn*0.025)
    shaft = [(0,0,0), (-0.06,0.015,sgn*0.01), (-0.12,0.035,sgn*0.018),
             (-0.18,0.06,sgn*0.026), (-0.24,0.09,sgn*0.032)]
    add_curve_tube(f"arista_{side}",
                   [W("head", (ar[0]+p[0], ar[1]+p[1], ar[2]+p[2])) for p in shaft],
                   0.0075, dark_mat)
    for i in range(1, 8):
        t = i / 8.0
        x, y, z = -0.24*t, 0.09*t, sgn*0.032*t
        l = 0.028 + 0.018 * __import__('math').sin(__import__('math').pi * t)
        p0 = (ar[0]+x, ar[1]+y, ar[2]+z)
        p1 = (ar[0]+x+0.008, ar[1]+y+l*0.45, ar[2]+z+sgn*l*0.15)
        p2 = (ar[0]+x+0.012, ar[1]+y+l, ar[2]+z+sgn*l*0.24)
        add_curve_tube(f"arista_{side}_b{i}a", [W("head", p) for p in (p0, p1, p2)], 0.003, dark_mat)

# ---- proboscis ----
pb = (-0.24, -0.22, 0)
add_ball("haustellum", W("head", (pb[0]-0.07, pb[1]-0.04, 0)), 1.0, leg_mat, squash=(.13, .075, .07))
for s in [1, -1]:
    add_ball(f"labellum_{s}", W("head", (pb[0]-0.16, pb[1]-0.075, s*0.035)),
             1.0, dark_mat, squash=(.07, .045, .045))

# ---- render ----
mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
for o in fly.objects:
    if o.type not in ('MESH', 'CURVE'): continue
    try: corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    except Exception: continue
    for w in corners:
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
cam = scene.camera
scene.cycles.samples = 40
for vname, dd in {"live_c3_threequarter": Vector((-0.7, 0.75, 0.55)),
                  "live_c3_side": Vector((0, 1, 0.25))}.items():
    cam.location = center + dd.normalized() * radius * 3.1
    d = center - cam.location
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
    cam.rotation_mode = 'XYZ'
    scene.render.filepath = OUT + "\\" + vname + ".png"
    bpy.ops.render.render(write_still=True)
print("pass3 done")
