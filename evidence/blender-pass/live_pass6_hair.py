"""PASS 6 (live Blender): accurate hair systems + eye facet borders.
- eyes: Distance-to-Edge voronoi -> dark inter-facet borders + recessed bump
- inter-ommatidial bristles: ~150 socketed micro-bristles per eye, joined
- thoracic microchaetae: acrostichal rows + scutellars, joined
- wing margin fringe along costa, joined
Renders: threequarter + eye macro.
"""
import bpy, math
from mathutils import Vector

OUT = r"C:\Users\Windows\Documents\fly-neural-lab\evidence\blender-pass"
scene = bpy.context.scene
fly = bpy.data.collections.get("fly")
Z = Vector((0, 0, 1))

# ---------- eye facet borders ----------
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    bs = mat.node_tree.nodes.get("Principled BSDF")
    if not bs: continue
    col = tuple(bs.inputs["Base Color"].default_value)[:3]
    if not (abs(col[0] - 0.42) < 0.25 and col[1] < 0.15 and col[2] < 0.07):
        continue
    nt = mat.node_tree
    vor = next((nd for nd in nt.nodes if nd.type == 'TEX_VORONOI'), None)
    if vor is None: continue
    try: vor.feature = 'DISTANCE_TO_EDGE'
    except Exception: pass
    vor.inputs["Scale"].default_value = 34.0
    # dark thin borders: edge-dist 0 at border -> black, red by 0.35
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position = 0.0; e[0].color = (0.10, 0.008, 0.004, 1)
    e[1].position = 0.38; e[1].color = (0.52, 0.085, 0.028, 1)
    nt.links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    # replace old color link
    for lk in [l for l in nt.links if l.to_node == bs and l.to_socket.name == "Base Color"]:
        nt.links.remove(lk)
    nt.links.new(ramp.outputs["Color"], bs.inputs["Base Color"])
    # recessed borders bump
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.9
    nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
    for lk in [l for l in nt.links if l.to_node == bs and l.to_socket.name == "Normal"]:
        nt.links.remove(lk)
    nt.links.new(bump.outputs["Normal"], bs.inputs["Normal"])

def dark():
    m = bpy.data.materials.get("live_dark_hair")
    return m

def join_all(names, new_name):
    bpy.ops.object.select_all(action='DESELECT')
    obs = [bpy.data.objects.get(n) for n in names]
    obs = [o for o in obs if o]
    if not obs: return None
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    obs[0].name = new_name
    for coll in list(obs[0].users_collection): coll.objects.unlink(obs[0])
    fly.objects.link(obs[0])
    return obs[0]

def cone_on_point(name, center, normal, r, length, embed=0.15):
    n = normal.normalized()
    loc = center + n * (length / 2 - length * embed)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r, radius2=0.0,
                                    depth=length, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Z.rotation_difference(n)
    o.rotation_mode = 'XYZ'
    o.data.materials.append(dark())
    for coll in list(o.users_collection): coll.objects.unlink(o)
    fly.objects.link(o)
    return o

def fib_dirs(n):
    out = []
    ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (i / (n - 1)) * 2
        rad = math.sqrt(max(0, 1 - y * y))
        th = ga * i
        out.append(Vector((rad * math.cos(th), y, rad * math.sin(th))))
    return out

# ---------- inter-ommatidial bristles ----------
for side, eye_name in [(1, "eye_L"), (-1, "eye_R")]:
    eye = bpy.data.objects.get(eye_name)
    if not eye: continue
    mw = eye.matrix_world
    C = mw.translation.copy()
    sx, sy, sz = mw.to_scale()
    made = []
    for i, d in enumerate(fib_dirs(170)):
        if abs(d.y) < 0.18: continue  # keep outer shell only
        p = Vector((C.x + sx * d.x, C.y + sy * d.y, C.z + sz * d.z))
        n = Vector((d.x / sx, d.y / sy, d.z / sz)).normalized()
        made.append(cone_on_point(f"iomb_{side}_{i}", p, n, 0.0038, 0.05).name)
    j = join_all(made, f"interommatidial_{'L' if side > 0 else 'R'}")
    print("eye", side, "bristles:", len(made))

# ---------- thoracic microchaetae (acrostichal rows + scutellars) ----------
th = bpy.data.objects.get("thorax_cuticle")
made = []
if th:
    mw = th.matrix_world
    C = mw.translation.copy()
    rx, ry, rz = mw.to_scale()
    for row in (-0.06, 0.06):
        for k in range(14):
            x = C.x - 0.34 + k * (0.72 / 13)
            dx, dy = (x - C.x) / rx, row / ry
            q = 1 - dx * dx - dy * dy
            if q <= 0.05: continue
            z = C.z + rz * math.sqrt(q)
            p = Vector((x, C.y + row, z))
            n = Vector((dx / rx, dy / ry, math.sqrt(q) / rz)).normalized()
            made.append(cone_on_point(f"micro_{k}_{row}", p, n, 0.0032, 0.055).name)
    for s in (-1, 1):
        made.append(cone_on_point(f"scut_{s}",
            Vector((C.x + 0.47, C.y + s * 0.10, C.z + 0.18)),
            Vector((0.55, s * 0.25, 0.8)), 0.005, 0.13).name)
    join_all(made, "thoracic_microchaetae")
    print("thoracic micro:", len(made))

# ---------- wing margin fringe along costa ----------
for side in ("L", "R"):
    costa = bpy.data.objects.get(f"vein_{side}_0")
    made = []
    if costa and costa.type == 'CURVE':
        pts = [mw_pt for spl in costa.data.splines for mw_pt in
               [costa.matrix_world @ Vector((p.co[0], p.co[1], p.co[2])) for p in spl.points]]
        for i, p in enumerate(pts):
            if i % 1 == 0:
                out = Vector((0, 1 if side == "L" else -1, 0.9))
                made.append(cone_on_point(f"fringe_{side}_{i}", p, out, 0.0022, 0.032).name)
        join_all(made, f"wing_fringe_{side}")
        print("fringe", side, len(made))

# ---------- renders ----------
def shoot(filepath, target, dist, samples, viewdir):
    cam = scene.camera
    cam.location = target + viewdir.normalized() * dist
    d = target - cam.location
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = d.to_track_quat('-Z', 'Y')
    cam.rotation_mode = 'XYZ'
    scene.cycles.samples = samples
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)

mn = Vector((1e9,)*3); mx = Vector((-1e9,)*3)
for o in fly.objects:
    if o.type not in ('MESH', 'CURVE'): continue
    try: corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
    except Exception: continue
    for w in corners:
        mn = Vector(map(min, mn, w)); mx = Vector(map(max, mx, w))
center = (mn + mx) / 2; radius = max(mx - mn)
shoot(OUT + "\\live_c6_threequarter.png", center, radius * 3.1, 64, Vector((-0.7, 0.75, 0.55)))
eye = bpy.data.objects.get("eye_R") or bpy.data.objects.get("eye_L")
ec = sum((eye.matrix_world @ Vector(c) for c in eye.bound_box), Vector()) / 8
esize = max((eye.matrix_world @ Vector(c) - ec).length for c in eye.bound_box)
shoot(OUT + "\\live_c6_macro_eye.png", ec, esize * 6.0, 96, Vector((-0.55, 0.9, 0.45)))
print("pass6 done")
