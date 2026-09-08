# Blender refinement: passes 9–15

Latest local artifact: `fly_refined.blend`. Prior GUI state preserved in `fly_iteration_checkpoint.blend`; original tracked `fly_rigged.blend` left unchanged.

All seven passes executed through native Blender MCP against the user's running Blender scene. Scripts are `live_pass9_structure.py` through `live_pass15_abdomen.py`.

| Pass | Change | Render |
|---|---|---|
| 9 | Assigned 42 parent links across the existing 43 bones; removed subdivision-induced gaps from 18 limb segments | iteration09_connected_legs.png |
| 10 | Raycast-anchored, tapered/swept thoracic, head and eye hairs | iteration10_anchored_hair.png |
| 11 | Packed staggered corneal lattice; bounded eye bump | iteration11_corneal_lattice.png |
| 12 | Explicit cuticle materials, small-scale grain, dark posterior abdominal pigmentation | iteration12_cuticle.png |
| 13 | Preserved wing outlines, thinner veins, restrained membrane bump, smooth shell normals | iteration13_wings.png |
| 14 | Added fine limb/abdominal setae and three ocelli | iteration14_details.png |
| 15 | Continuous tapered abdominal envelope across six articulated shells; re-anchored abdominal hairs | iteration15_continuous_abdomen.png |

## Verification

- `iteration15_verification.json`: 43 bones, 42 hierarchy links, no orphan geometry; four ancestor/descendant movement tests passed; rest return matrix error 0.
- 185,862 evaluated **Blender render** triangles including curves at render subdivision levels; 113 geometry objects. These are NOT website renderer metrics.
- Inspected final three-quarter, side, top, eye macro and raised-wing/flexed-leg renders. The raised-wing proof intentionally extends above the framing; it clearly shows articulation, not a beauty composition.
- Reopened saved `fly_refined.blend` in an independent background Blender process: 43 bones, 42 links, packed corneal texture, neutral pose verified; exit 0.
- GUI left open on the refined file, neutral pose, material preview. MCP viewport capture inspected.

## Scope and limitations

This is a locally saved Blender revision, not a production deployment. No `dist/` model code was modified; no commit or push was performed. The model is improved but remains stylized: head/thorax proportions, foot segmentation and wing outline/venation need reference-driven anatomical work. Hair placement is a visual approximation, not measured biological topology. Scripts retain deterministic seeds and preserved bone names for subsequent work.

The original rig and subdivision builders were patched to prevent recurrence of disconnected bone hierarchy and inappropriate limb/membrane subdivision. The revised builders were syntax-checked; the corresponding repairs were separately executed and verified on the live scene.
