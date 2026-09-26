/**
 * context-slice-chain — 0.21.2 (decisão 0006, opção A; lead 2026-09-26).
 *
 * As fatias que os activadores LARGOS (`exposure`, `data_sensitivity`) trazem derivam SÓ do dado
 * publicado, nunca de uma tabela escrita no código:
 *
 *   requisito → controlo      runtime/requirement_control_links.json
 *   controlo  → objectivo     semantic/ctrl_acore_alignment.jsonl (curado Archon, ratificado 2026-09-03;
 *                             só `exact` e `partial` — `related` não cobre, como na regra de cobertura publicada)
 *   objectivo → família       runtime/v1/control_objectives.json (`slice_family`)
 *
 * Asserção da travessia (regra da ontologia): verbo `aligned_with` (a fatia está alinhada com o contexto
 * pelos controlos dos requisitos que ele selecciona); fonte = alinhamento curado e ratificado; NÃO afirma
 * autoria nem que o activador «exija» a fatia; cobertura = os controlos com alinhamento publicado.
 *
 * Determinístico: requisitos, controlos e objectivos percorridos por ordem de id; cada família guarda a
 * PRIMEIRA cadeia que a alcança (a testemunha que vai para o activation_trace).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { getOntologyData } from "../tools/ontology-loader.js";
import { getG2Runtime } from "../tools/g2-runtime-loader.js";

const ALIGNMENT_PATH = "data/publish/semantic/ctrl_acore_alignment.jsonl";

export interface ChainWitness {
  requirement_id: string;
  control_id: string;
  control_objective_id: string;
  alignment_type: "exact" | "partial";
}

interface ChainIndex {
  requirementControls: Map<string, string[]>;
  controlObjectives: Map<string, Array<{ objective: string; type: "exact" | "partial" }>>;
  objectiveFamily: Map<string, string>;
  available: boolean;
}

let cached: ChainIndex | undefined;

function buildIndex(): ChainIndex {
  const requirementControls = new Map<string, string[]>();
  for (const link of getOntologyData().requirementControlLinks ?? []) {
    const list = requirementControls.get(link.source_id) ?? [];
    if (!list.includes(link.target_id)) list.push(link.target_id);
    requirementControls.set(link.source_id, list);
  }
  for (const list of requirementControls.values()) list.sort();

  const controlObjectives = new Map<string, Array<{ objective: string; type: "exact" | "partial" }>>();
  const path = resolveAppPath(ALIGNMENT_PATH);
  const alignmentPresent = existsSync(path);
  if (alignmentPresent) {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      const a = JSON.parse(line) as Record<string, unknown>;
      if (a["record_type"] !== "alignment" || a["source_type"] !== "Control") continue;
      const type = a["alignment_type"];
      if (type !== "exact" && type !== "partial") continue;
      const control = a["source_id"] as string;
      const list = controlObjectives.get(control) ?? [];
      list.push({ objective: a["target_id"] as string, type });
      controlObjectives.set(control, list);
    }
    for (const list of controlObjectives.values()) list.sort((x, y) => x.objective.localeCompare(y.objective));
  }

  const objectiveFamily = new Map<string, string>();
  try {
    for (const co of getG2Runtime().controlObjectives) objectiveFamily.set(co.entity_id, co.slice_family);
  } catch {
    // runtime v1 ausente: sem famílias (o prepare já responde unsupported_scope nesse caso)
  }
  return { requirementControls, controlObjectives, objectiveFamily, available: alignmentPresent && objectiveFamily.size > 0 };
}

function index(): ChainIndex {
  if (!cached) cached = buildIndex();
  return cached;
}

/** Famílias alcançadas pela cadeia do dado a partir destes requisitos, cada uma com a sua testemunha. */
export function sliceFamiliesByDataChain(requirementIds: readonly string[]): Map<string, ChainWitness> {
  const idx = index();
  const out = new Map<string, ChainWitness>();
  if (!idx.available) return out;
  for (const requirement_id of [...new Set(requirementIds)].sort()) {
    for (const control_id of idx.requirementControls.get(requirement_id) ?? []) {
      for (const { objective, type } of idx.controlObjectives.get(control_id) ?? []) {
        const family = idx.objectiveFamily.get(objective);
        if (family && !out.has(family)) out.set(family, { requirement_id, control_id, control_objective_id: objective, alignment_type: type });
      }
    }
  }
  return new Map([...out.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/** A cadeia existe no bundle servido (alinhamento + objectivos)? */
export function dataChainAvailable(): boolean {
  return index().available;
}

/** Só para testes: a testemunha existe mesmo no dado publicado? */
export function witnessHolds(w: ChainWitness): boolean {
  const idx = index();
  return (
    (idx.requirementControls.get(w.requirement_id) ?? []).includes(w.control_id) &&
    (idx.controlObjectives.get(w.control_id) ?? []).some((x) => x.objective === w.control_objective_id && x.type === w.alignment_type) &&
    idx.objectiveFamily.has(w.control_objective_id)
  );
}
