/**
 * plan_sbd_toe_rollout  (MVP)
 *
 * A phased rollout roadmap: the canonical lifecycle phases (phases.json, the
 * phase-order I-2), each mapped to its manual chapter and the work to land there.
 * MVP = phase-ordered; the real dependency DAG is deferred (S-2). Grounded in the
 * published runtime phases + chunk surface; nothing invented. Implementation-view
 * family; serves NOW via v1.4.
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { resolveChapterBundle } from "../serving/chunk-index.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";
import { chapterSet, chapterTitle, demandByLevel } from "../serving/applicability.js";

interface PhaseRecord {
  phase_id: string;
  label: string;
  order: number;
  manual_chapter?: number | string;
  /** 0.20.0-beta.40 (contrato v1.19 §1.26) — os capítulos que a fase atravessa, N:M. */
  bundle_ids?: string[];
}

export interface RolloutPhase {
  order: number;
  phase_id: string;
  label: string;
  chapter?: string;
  /** 0.20.0-beta.40 — todos os capítulos da fase, não o escalar editorial. */
  chapters?: string[];
}

export interface RolloutData {
  org_profile?: { value: string; role: string; affects_result: boolean; note: string };
  horizon?: number;
  phases: RolloutPhase[];
  totals: {
    phases: number;
    chapters_traversed?: number;
    chapters_in_manual?: number;
    chapters_covered_including_floor?: number;
  };
  /** 0.20.0-beta.40 — a travessia N:M e o capítulo de PISO (que não é ausência). */
  chapter_coverage?: Record<string, unknown>;
  /** 0.20.0-beta.40 — atribuições autoradas sem fase; declaradas, nunca absorvidas. */
  assignments_without_phase?: Record<string, unknown>;
  /** 0.20.0-beta.39 — o que o roteiro NÃO cobre, com a exigência por nível e como lá chegar. */
  chapters_not_in_roadmap?: {
    note: string;
    count: number;
    of_total: number;
    mandatory_at_some_level: number;
    chapters: Array<{ chapter: string; title: string; demand_by_level: Record<string, string>; reach_with: string }>;
  };
  model: "phase-ordered-mvp";
}

/** Metadados do envelope de `phases.json` que a v2.6 acrescentou. */
interface PhasesEnvelope {
  floor_bundle?: { bundle_id?: string; species?: string; note?: string } | undefined;
  phases_unassigned?:
    | { assignment_count?: number; chapter_count?: number; chapters?: string[]; note?: string }
    | undefined;
  /** 0.20.0-beta.45 (v2.8) — os RÓTULOS autorados que não mapeiam para uma fase. */
  unmapped_phase_labels?: Record<string, number> | undefined;
  bundle_ids_derivation?: string | undefined;
}
let envelopeCache: PhasesEnvelope = {};

function loadPhases(): PhaseRecord[] {
  let raw: string;
  try {
    raw = readFileSync(resolveAppPath("data/publish/runtime/phases.json"), "utf-8");
  } catch {
    return [];
  }
  const parsed = JSON.parse(raw) as { items?: unknown[] } | unknown[];
  if (!Array.isArray(parsed)) {
    const env = parsed as Record<string, unknown>;
    envelopeCache = {
      ...(env["floor_bundle"] ? { floor_bundle: env["floor_bundle"] as PhasesEnvelope["floor_bundle"] } : {}),
      ...(env["phases_unassigned"] ? { phases_unassigned: env["phases_unassigned"] as PhasesEnvelope["phases_unassigned"] } : {}),
      ...(typeof env["bundle_ids_derivation"] === "string" ? { bundle_ids_derivation: env["bundle_ids_derivation"] } : {}),
      ...(env["unmapped_phase_labels"] ? { unmapped_phase_labels: env["unmapped_phase_labels"] as Record<string, number> } : {})
    };
  }
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
  const phases: PhaseRecord[] = [];
  for (const it of items) {
    if (typeof it !== "object" || it === null) continue;
    const rec = it as Record<string, unknown>;
    const phase_id = typeof rec["phase_id"] === "string" ? rec["phase_id"] : "";
    if (!phase_id) continue;
    phases.push({
      phase_id,
      label: typeof rec["label"] === "string" ? rec["label"] : phase_id,
      order: typeof rec["order"] === "number" ? rec["order"] : Number.MAX_SAFE_INTEGER,
      ...(Array.isArray(rec["bundle_ids"])
        ? { bundle_ids: (rec["bundle_ids"] as unknown[]).filter((x): x is string => typeof x === "string") }
        : {}),
      ...(rec["manual_chapter"] !== undefined
        ? { manual_chapter: rec["manual_chapter"] as number | string }
        : {})
    });
  }
  return phases.sort((a, b) => a.order - b.order);
}

export function handlePlanRollout(args: Record<string, unknown>): ProtocolEnvelope<RolloutData> {
  const orgProfile = typeof args["orgProfile"] === "string" && args["orgProfile"].trim()
    ? args["orgProfile"].trim()
    : undefined;
  const horizon = typeof args["horizon"] === "number" && args["horizon"] > 0 ? args["horizon"] : undefined;

  const ordered: RolloutPhase[] = loadPhases().map((p) => {
    const chapter =
      p.manual_chapter !== undefined ? resolveChapterBundle(String(p.manual_chapter)) : undefined;
    return {
      order: p.order,
      phase_id: p.phase_id,
      label: p.label,
      ...(chapter ? { chapter } : {}),
      ...(p.bundle_ids && p.bundle_ids.length > 0 ? { chapters: [...p.bundle_ids].sort() } : {})
    };
  });

  // horizon caps how many phases the roadmap spans (coverage-preserving via the cursor).
  const offsetArg = args["offset"];
  const page = paginate(
    ordered,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: horizon ?? (typeof args["limit"] === "number" ? (args["limit"] as number) : undefined)
    },
    ordered.length || 1
  );

  const coverage: PageCoverage & { phases: number } = { ...page.coverage, phases: ordered.length };

  /**
   * 0.20.0-beta.40 — O ROTEIRO PASSA A COBRIR OS 15, e a banda muda de natureza.
   *
   * A b.39 fez o roteiro DECLARAR que deixava 7 capítulos de fora. Era honesto e continuava a
   * não servir: **um aviso bem escrito não é um roteiro.** A causa era o escalar
   * `manual_chapter` — uma âncora EDITORIAL que forçava escolhas falsas (o `design` não
   * apanhava o cap. 04, o `develop` não apanhava o 06). A v2.6 publica `bundle_ids`, a
   * travessia N:M derivada de 1 296 assignments autorados, e o roteiro passa a consumi-la.
   *
   * União das oito fases: 14 capítulos. O 15.º é o cap. 00, e **não é uma omissão**: é PISO
   * (`species: piso`), aplica-se a tudo independentemente do eixo, e fica fora da derivação
   * por não ser travessia — não por ausência. 14 + piso = 15. A banda deixa de dizer o que
   * falta e passa a dizer o que é piso; o `chapters_not_in_roadmap` fica a zero porque já não
   * há nada de fora, e mantém-se servido para que a passagem a zero seja VISÍVEL em vez de
   * silenciosa.
   */
  const covered = new Set(ordered.flatMap((p) => p.chapters ?? (p.chapter ? [p.chapter] : [])));
  const floor = envelopeCache.floor_bundle;
  const floorId = floor?.bundle_id;
  const allChapters = chapterSet();
  const omitted = allChapters
    .filter((c) => !covered.has(c) && c !== floorId)
    .map((chapter) => ({
      chapter,
      title: chapterTitle(chapter),
      demand_by_level: demandByLevel(chapter),
      reach_with: `get_sbd_toe_chapter_implementation_checklist(chapter="${chapter}")`
    }));
  const mandatoryOmitted = omitted.filter((o) => Object.values(o.demand_by_level).some((d) => d === "obrigatorio"));

  const chapter_coverage = {
    note:
      "O roteiro atravessa os capítulos que cada fase realmente toca (`bundle_ids`, N:M, derivado dos " +
      "assignments autorados) — não a âncora editorial `manual_chapter`, que forçava um capítulo por fase " +
      "e deixava 7 de fora. `manual_chapter` continua servido em cada fase, como âncora, não como âmbito.",
    traversed: covered.size,
    of_total: allChapters.length,
    ...(envelopeCache.bundle_ids_derivation !== undefined ? { derivation: envelopeCache.bundle_ids_derivation } : {}),
    ...(floorId !== undefined && !covered.has(floorId)
      ? {
          floor: {
            chapter: floorId,
            title: chapterTitle(floorId),
            species: floor?.species ?? "piso",
            ...(floor?.note !== undefined ? { source_declares: floor.note } : {}),
            is_absence: false,
            note:
              "**NÃO é uma omissão.** O capítulo de piso aplica-se a TODAS as fases, independentemente do " +
              "eixo, e por isso não aparece na travessia de nenhuma — fica fora da derivação por não ser " +
              "travessia, não por ausência. É a terceira espécie de relação entre segmentações (travessia · " +
              "dependência · piso). Somando-o, o roteiro cobre os " +
              `${covered.size + 1} de ${allChapters.length}.`,
            reach_with: `get_sbd_toe_chapter_implementation_checklist(chapter="${floorId}")`
          }
        }
      : {})
  };

  const unassigned = envelopeCache.phases_unassigned;
  /*
   * 0.20.0-beta.45 (Manual v1.9.0) — SUBIR AQUI É VISIBILIDADE, NÃO DÍVIDA.
   *
   * O número passou de 195 para 219 e a leitura fácil — «a dívida subiu» — é a errada. O
   * cap. 14 tinha ZERO sem fase porque não tinha tabelas nenhumas: uma política de recurso
   * absorvia o capítulo inteiro em `govern`. Com as linhas autoradas, 102 fases falsas por
   * política deram lugar a 144 verdadeiras e 30 honestamente sem fase. **O que aumentou foi
   * o que se vê, não o que falta.**
   *
   * E vê-se PORQUÊ: a fonte publica os RÓTULOS que o autor escreveu e que não assentam numa
   * fase — «Execução», «sempre que há desvio», «release relevante»… Forçá-los a uma fase
   * seria afirmar o que a fonte não diz. `unassigned` é o valor ratificado para resíduo
   * transversal genuíno, e o rótulo vem à vista para o consumidor julgar.
   */
  const assignments_without_phase =
    unassigned !== undefined && (unassigned.assignment_count ?? 0) > 0
      ? {
          assignment_count: unassigned.assignment_count ?? 0,
          chapter_count: unassigned.chapter_count ?? (unassigned.chapters ?? []).length,
          chapters: unassigned.chapters ?? [],
          ...(envelopeCache.unmapped_phase_labels !== undefined
            ? {
                unmapped_phase_labels: {
                  note:
                    "Os RÓTULOS que o autor escreveu e que não assentam numa fase do ciclo. Vêm verbatim: " +
                    "vários misturam momentos («release relevante, evento crítico, ciclo trimestral») e outros " +
                    "são transversais («sempre que há desvio»). **Forçá-los a uma fase seria afirmar o que a " +
                    "fonte não diz** — `unassigned` é o valor ratificado para este resíduo.",
                  values: envelopeCache.unmapped_phase_labels
                }
              }
            : {}),
          ...(unassigned.note !== undefined ? { source_declares: unassigned.note } : {}),
          reading:
            "**Um número ALTO aqui é VISIBILIDADE, não dívida.** Estas atribuições existem, estão nos " +
            "capítulos que o roteiro cobre, e não se ancoram a um momento do ciclo — porque a fonte não lhes " +
            "atribui um. Um capítulo com zero aqui pode significar que tem todas as fases autoradas, ou que " +
            "nenhuma linha sua foi tabelada e uma política de recurso o absorveu inteiro. **A segunda hipótese " +
            "é pior e não se vê.** Não leias a subida deste número como agravamento: lê-a como mais Manual à vista.",
          note:
            "Atribuições autoradas SEM fase na fonte. Não foram absorvidas numa fase real nem filtradas em " +
            "silêncio: o roteiro é por fase, e estas não têm uma."
        }
      : undefined;

  const chapters_not_in_roadmap = {
    note:
      omitted.length === 0
        ? "ZERO capítulos fora do roteiro. A banda mantém-se servida, e a zero, para que a cobertura completa " +
          "seja verificável em vez de assumida — o cap. 00 está em `chapter_coverage.floor`, como PISO e não " +
          "como falta."
        : "Capítulos que nenhuma fase atravessa. Não é o mesmo que ficarem fora do Manual: alguns são " +
          "`obrigatorio` ao teu nível.",
    count: omitted.length,
    of_total: allChapters.length,
    mandatory_at_some_level: mandatoryOmitted.length,
    chapters: omitted
  };

  return {
    data: {
      ...(orgProfile
        ? {
            org_profile: {
              value: orgProfile,
              role: "recorded_context",
              affects_result: false,
              note:
                "0.20.0-beta.39: o `orgProfile` é ECOADO, não usado — o roteiro é a ordem das fases " +
                "publicadas e não muda com o perfil da organização. A mesma disciplina do `select` " +
                "(`task_context`: contexto registado, `affects_selection: false`). Se o vires ecoado e " +
                "concluíres que o roteiro foi adaptado a ti, concluíste a mais."
            }
          }
        : {}),
      ...(horizon ? { horizon } : {}),
      phases: page.items,
      totals: {
        phases: ordered.length,
        chapters_traversed: covered.size,
        chapters_in_manual: allChapters.length,
        chapters_covered_including_floor: covered.size + (floorId !== undefined && !covered.has(floorId) ? 1 : 0)
      },
      chapter_coverage,
      ...(assignments_without_phase ? { assignments_without_phase } : {}),
      chapters_not_in_roadmap,
      model: "phase-ordered-mvp"
    },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "rollout_planner_mvp",
      source_data: "data/publish/runtime/phases.json (phase-order I-2) + chapter mapping",
      note:
        "Phase-ordered rollout MVP: canonical lifecycle phases mapped to manual chapters. " +
        "The dependency DAG is deferred (S-2) — this is a linear order, declared as such; nothing invented. " +
        "0.20.0-beta.40 (contrato v1.19 §1.26): a travessia fase→capítulos é N:M e vem da fonte " +
        "(`bundle_ids`, derivado dos assignments autorados). A cobertura e o capítulo de PISO estão em " +
        "`chapter_coverage`; o roteiro continua a não ser o âmbito do Manual, mas já não deixa nada de fora."
    },
    coverage,
    next: boundAffordances([
      {
        intent: "get the implementation checklist for a phase's chapter",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: "chapter (o capítulo da fase acima)",
        kind: "structural"
      },
      {
        intent: "get the governance/RACI model that drives the rollout",
        tool: "get_sbd_toe_operating_model",
        with: "orgScope",
        kind: "semantic"
      }
    ])
  };
}
