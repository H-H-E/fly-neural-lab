import assert from 'node:assert/strict';
import fs from 'node:fs';

const specPath = new URL('../../brain-body/banc/circuits/fl_tibia_resistance.json', import.meta.url);
const graphPath = new URL('../../dist/reflex-tibia.json', import.meta.url);
assert.ok(fs.existsSync(specPath), 'front-left circuit specification is missing');
assert.ok(fs.existsSync(graphPath), 'resolved reflex graph is missing');

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
assert.equal(spec.schema, 'banc.front-left-tibia-resistance/v1');
assert.equal(spec.behavior.joint, 'front-left femur-tibia');
assert.equal(spec.behavior.extension_coordinate.increases_with, 'tibia_extension');
assert.equal(spec.behavior.external_drive, 'sensory_only');
assert.equal(spec.selection.extension_sensitive_status, 'unknown');
assert.match(spec.selection.extension_sensitive_reason, /independent|metadata/i);
assert.ok(Array.isArray(spec.selection.sensory_candidates));
assert.ok(spec.selection.sensory_candidates.length > 0);
assert.ok(Array.isArray(spec.selection.motor_units));
assert.ok(spec.selection.motor_units.some((u) => u.functional_role === 'tibia_flexor'));
assert.ok(spec.selection.motor_units.some((u) => u.functional_role === 'tibia_extensor'));
assert.ok(Array.isArray(spec.pathways));
assert.ok(spec.pathways.length > 0, 'must retain actual BANC pathways, not only endpoint labels');
assert.ok(spec.provenance.edge_table_sha256);
assert.ok(spec.provenance.graph_sha256);
assert.ok(spec.provenance.build_commit);

const graphIds = new Set(graph.id);
const seen = new Set();
for (const group of [...spec.selection.sensory_candidates, ...spec.selection.motor_units]) {
  assert.ok(group.ids.length > 0, `${group.name} has no exact source IDs`);
  for (const id of group.ids) {
    assert.match(id, /^\d+$/, `non-exact identifier: ${id}`);
    assert.ok(graphIds.has(id), `source ID is absent from resolved graph: ${id}`);
    assert.ok(!seen.has(id), `endpoint assigned to multiple functional groups: ${id}`);
    seen.add(id);
  }
  assert.ok(group.resolution.every((r) => Number.isInteger(r.index) && r.index >= 0 && r.index < graph.id.length));
}
for (const group of spec.selection.sensory_candidates) {
  assert.ok(group.morphology.length === group.ids.length, `${group.name} morphology rows must match IDs`);
  assert.ok(group.morphology.every((m) => group.ids.includes(m.source_id) && typeof m.other_names === 'string'));
  const labels = new Set(group.morphology.map((m) => m.other_names).filter(Boolean));
  for (const label of labels) assert.ok(['claw', 'hook', 'club'].includes(label), `unexpected morphology label: ${label}`);
}
for (const path of spec.pathways) {
  assert.ok(path.pre_ids.length > 0 && path.post_ids.length > 0);
  assert.ok(path.edge_count > 0);
  assert.ok(path.multiplicity_sum > 0);
  assert.ok(['direct', 'one_hop', 'two_hop'].includes(path.kind));
}
assert.ok(!JSON.stringify(spec).match(/array position|desired output|because.*flexor/i));
console.log(JSON.stringify({
  ok: true,
  sensory_groups: spec.selection.sensory_candidates.length,
  motor_groups: spec.selection.motor_units.length,
  pathways: spec.pathways.length,
  graph_nodes: graph.id.length,
}, null, 2));
