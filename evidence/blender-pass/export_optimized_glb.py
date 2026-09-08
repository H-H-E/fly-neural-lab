import bpy, os, json
from pathlib import Path
out=Path('C:/Users/Windows/Documents/fly-neural-lab/dist/fly-model/fly_refined.glb')
out.parent.mkdir(parents=True, exist_ok=True)
# Ensure neutral pose and export only the fly collection plus armature.
arm=bpy.data.objects.get('fly_rig')
if arm:
    for p in arm.pose.bones: p.matrix_basis.identity()
    bpy.context.view_layer.update()
for o in bpy.context.selected_objects: o.select_set(False)
objs=[]
for o in bpy.data.objects:
    if o.name=='fly_rig' or o.users_collection and any(c.name=='fly' for c in o.users_collection):
        o.select_set(True); objs.append(o)
bpy.context.view_layer.objects.active=arm or (objs[0] if objs else None)
# Embed textures, keep armature and current deformation, omit cameras/lights.
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_apply=False, export_animations=True, export_skins=True, export_morph=True, export_materials='EXPORT', export_image_format='AUTO', export_cameras=False, export_lights=False, export_texcoords=True, export_normals=True, export_tangents=False)
print(json.dumps({'exported':str(out),'bytes':out.stat().st_size,'objects':len(objs),'bones':len(arm.data.bones) if arm else 0,'exists':out.exists()}))
