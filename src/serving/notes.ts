/**
 * 0.21 §6-c — NOTAS POR REFERÊNCIA.
 *
 * A prosa que explica um bloco é a mesma em todas as chamadas; pagá-la a cada volta é o
 * defeito que esta linha existe para corrigir (despacho 2026-09-11, §6 (c)). Nada se remove:
 * cada nota vive aqui, com id estável, e é servida em `sbd://toe/notes/{id}` (e no índice
 * `sbd://toe/notes`); o payload leva o `note_id` e um único cabeçalho `notes` a dizer como ler.
 * Os denominadores e os avisos POR RESPOSTA (contagens, v1_manifest_warnings) ficam inline —
 * não são estáticos e não têm id.
 */
export const NOTES = {
  "prepare.relations_ref":
    "Inline g2_context.relations elided; execute each listed trace_sbd_toe_graph {lens, anchor} call to recover them, or re-call with include_relations=true. Encoding details: MCP resource codegen-instructions, detail_encoding.relations_ref.",
  "prepare.grounding.entries_ref":
    "Per-group v1_entity_ids elided at detail=lista/standard (each group carries its exact `entries` count). The grounding id set is already in this payload — every grounding id is an entity-id key of the g2_context maps. Re-call with the same input at detail='full' for the verbatim flat entries (role, chapter, file, sha, v1_entity_id, name) — price declared in its size_estimate.",
  "prepare.relations_summary":
    "relations elided (0.21 §3): every edge links nodes already in this payload; include_relations=true inlines them, detail='full' carries the executable relations_ref (trace_sbd_toe_graph).",
  "prepare.adjacency.detail_ref":
    "Full list of undeclared signals that would change the set (the summary is its prefix) at detail='standard'; for the ids a signal would add: select_sbd_toe_requirements(<your declaration> + the signal).",
  "prepare.overlay.mappings_scope":
    "0.21.1 — regulatory_overlay.mappings is SCOPED to this call: only mappings whose target is in the activated scope are served (an activated requirement or control, the evidence pattern of an activated requirement, or the chapter of an activated requirement). Evidence-pattern mappings that mirror a served requirement mapping (same obligation, EP of that requirement) are elided as derivable. The obligations themselves are NOT scoped — they stay the complete, citable set. Every other mapping is counted in mappings_scope and reachable with rest_ref (resolve_entities, record_type=\"regulatory_mapping\"); for the framework-wide view use map_sbd_toe_regulatory_activation.",
  "prepare.size_estimate.envelope_exceeded":
    "Above this level's envelope. Since 0.21.2 the envelope is the rule for lista/standard (measured on the payload you receive): a ready payload leaves it only when it is an irreducible batch (see irreducible_note_id) or when it carries an opt-in you asked for on top of the level's form (include_relations, debug) — the decision measures the level's canonical form. Otherwise the call answers needs_decomposition with measured batches. detail='full' has no envelope (price declared).",
  "prepare.size_estimate.irreducible":
    "0.21.2 — irreducible batch: the selection has a single decomposable category, and that category alone does not fit the level's envelope. It is served ready, complete and declared (within_envelope: false) — never another decomposition, which is what prevents a loop. To stay within budget, narrow the declaration or accept the declared price; detail='full' carries more, not less.",
  "prepare.repeat_call_hint":
    "Identical input returns this exact payload (deterministic) — reuse the context already received; deepen via detail:'full' (grounding, relations and trace inline; price declared in size_estimate) or a targeted consult_security_requirements.",
  "prepare.provenance_legend":
    "Deduplicated encoding (detail=lista/standard): per-item `source` fields are elided (every list is source-homogeneous), requirement `category` = id category segment (AUT-003→AUT, REQ-AGN-001→AGN), g2_context entity lists are grouped as {slice_id: {entity_id: name|null}}, citations ids are referenced via ids_from payload paths, and each requirement carries its verbatim description + verify + evidence inline (0.21 §1). Full legend: read_sbd_toe_resource(sbd://toe/codegen-instructions/{mode}), section detail_encoding.",
  "prepare.activation_trace_ref":
    "activation_trace elided at detail=lista/standard — re-call with debug=true to include it (always inline at detail=full).",
  "prepare.verification.by_ref":
    "verify/evidence are inline per requirement (0.21 §1); the pattern's id, control and expected artifact types come from the verification matrix, one row per requirement (~190 tk/id measured).",
  "prepare.verification.related_by_control_outside_scope":
    "Patterns of requirements OUTSIDE the activated set that share an activated control — not inlined (they verify other requirements). The ref returns every pattern of those controls; the ones whose maps_to_requirement_id is in activated_scope are the inlined ones.",
  "prepare.selection.narrowed_out_ref":
    "Categorias elegíveis sem sinal na tarefa foram excluídas pelo narrowing MP1 — a lista completa (por categoria, com razão) vem de select_sbd_toe_requirements com o mesmo contexto.",
} as const;

export type NoteId = keyof typeof NOTES;

export const NOTES_INDEX_URI = "sbd://toe/notes";
export const NOTES_URI_TEMPLATE = "sbd://toe/notes/{id}";

/** Cabeçalho único por payload: como resolver qualquer `note_id` (URI + tool que o lê). */
export const NOTES_HEADER = {
  read_with: "read_sbd_toe_resource",
  uri: NOTES_URI_TEMPLATE,
  index: NOTES_INDEX_URI
} as const;

export function isNoteId(id: string): id is NoteId {
  return Object.prototype.hasOwnProperty.call(NOTES, id);
}

/** Conteúdo do recurso: índice (todas) ou uma nota. */
export function buildNotesResource(id?: string): { ids: NoteId[]; notes: Record<string, string> } | { id: NoteId; text: string } {
  if (id === undefined) return { ids: Object.keys(NOTES) as NoteId[], notes: { ...NOTES } };
  if (!isNoteId(id)) throw new Error(`Unknown note id: "${id}". Valid ids: ${Object.keys(NOTES).join(", ")}.`);
  return { id, text: NOTES[id] };
}
