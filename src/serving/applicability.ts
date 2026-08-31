/**
 * applicability — graduated chapter applicability (ciclo 0.14.0, 2026-09-01).
 *
 * Author's decision (programme lead, 2026-09-01, verbatim): «Sim: capítulo nunca se
 * exclui por nível; a exigência escala L1→L3 conforme a matriz do cap. 01 e a
 * proporcionalidade das user stories. A noção binária desaparece do serving.»
 *
 * Derivation (no hardcoded level sets — precedent: the KG base-set rule):
 *   - chapter set  ← bundle_catalog.jsonl (bundle_type=chapter) ∪ the declared
 *     CHAPTER_00 fallback (foundational chapter served without a bundle entry);
 *   - demand       ← aggregation of the AUTHORED `proportionality` of the bundle's
 *     assignments per chapter × risk_level (obrigatório / recomendado / opcional;
 *     free-text proportionalities count as `specific` — never re-classified);
 *   - anchor       ← the canonical matrix of chapter 01
 *     (addon 05-matriz-controlos-por-risco: a column per level for EVERY chapter).
 */
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";

export type RiskLevel = "L1" | "L2" | "L3";
export const RISK_LEVELS: readonly RiskLevel[] = ["L1", "L2", "L3"];

/** Curated display titles (display names only — no level semantics lives here). */
export const CURATED_TITLES: Record<string, string> = {
  "00-fundamentos": "Fundamentos SbD-ToE",
  "01-classificacao-aplicacoes": "Classificação de Aplicações",
  "02-requisitos-seguranca": "Requisitos de Segurança",
  "03-threat-modeling": "Threat Modeling",
  "04-arquitetura-segura": "Arquitetura Segura",
  "05-dependencias-sbom-sca": "Dependências, SBOM e SCA",
  "06-desenvolvimento-seguro": "Desenvolvimento Seguro",
  "07-cicd-seguro": "CI/CD Seguro",
  "08-iac-infraestrutura": "IaC e Infraestrutura",
  "09-containers-imagens": "Containers e Imagens",
  "10-testes-seguranca": "Testes de Segurança",
  "11-deploy-seguro": "Deploy Seguro",
  "12-monitorizacao-operacoes": "Monitorização e Operações",
  "13-formacao-onboarding": "Formação e Onboarding",
  "14-governanca-contratacao": "Governança e Contratação"
};

/** Declared fallback: chapter 00 has no bundle_catalog entry and no assignments —
 * foundational reading, present at every level (declared, never invented demand). */
const CHAPTER_00 = "00-fundamentos";

export const CANONICAL_ANCHOR = {
  chapter_id: "01-classificacao-aplicacoes",
  document_id: "010-sbd-manual-01-classificacao-aplicacoes-addon-05-matriz-controlos-por-risco",
  note: "Matriz canónica de controlos por risco: coluna L1..L3 para TODOS os capítulos — a exigência escala, o capítulo nunca se exclui."
} as const;

export const GRADUATED_SEMANTICS =
  "graduated: todos os capítulos aplicam-se a todos os níveis; a exigência escala L1→L3 " +
  "conforme a matriz do cap. 01 e a proporcionalidade autorada das user stories (decisão do Author, 2026-09-01).";

export type DemandClass = "obrigatorio" | "recomendado" | "opcional" | "specific";
const CLASS_ORDER: readonly DemandClass[] = ["obrigatorio", "recomendado", "opcional", "specific"];

export interface ChapterDemand {
  obrigatorio: number;
  recomendado: number;
  opcional: number;
  /** Authored free-text proportionality without a class prefix — counted, never re-classified. */
  specific: number;
}

export interface GradedChapter {
  chapter_id: string;
  title: string;
  /** Presence is unconditional (graduated semantics). */
  applicable: true;
  demand: ChapterDemand;
  /** Strongest non-empty class by count (ties → the stronger class). */
  dominant: DemandClass | "foundational";
  roles: number;
  user_stories: number;
  source: string;
  role_view?: { role: string; user_stories: Array<{ user_story_id: string; class: DemandClass; proportionality: string }> };
}

interface AssignmentRow {
  chapter_id?: string;
  risk_level?: string;
  role?: string;
  user_story_id?: string;
  proportionality?: string;
}

let cachedRows: AssignmentRow[] | undefined;
let cachedChapters: string[] | undefined;

function loadAssignmentRows(): AssignmentRow[] {
  if (!cachedRows) {
    const raw = JSON.parse(readFileSync(resolveAppPath("data/publish/runtime/assignments.json"), "utf-8")) as unknown;
    const list = Array.isArray(raw)
      ? raw
      : (Object.values(raw as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined) ?? [];
    cachedRows = list as AssignmentRow[];
  }
  return cachedRows;
}

/** Chapter set derived from bundle_catalog (+ the declared CHAPTER_00 fallback). */
export function chapterSet(): string[] {
  if (!cachedChapters) {
    const ids = new Set<string>([CHAPTER_00]);
    const text = readFileSync(resolveAppPath("data/publish/indexes/bundle_catalog.jsonl"), "utf-8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { bundle_type?: string; bundle_id?: string };
        if (rec.bundle_type === "chapter" && typeof rec.bundle_id === "string") ids.add(rec.bundle_id);
      } catch {
        /* tolerant line scan; catalog is manifest-checked elsewhere */
      }
    }
    cachedChapters = [...ids].sort();
  }
  return cachedChapters;
}

export function chapterTitle(chapterId: string): string {
  return CURATED_TITLES[chapterId] ?? chapterId;
}

export function classifyProportionality(p: string | undefined): DemandClass {
  const s = (p ?? "").toLowerCase();
  if (s.startsWith("obrigat")) return "obrigatorio";
  if (s.startsWith("recomend")) return "recomendado";
  if (s.startsWith("opcion")) return "opcional";
  return "specific";
}

function dominantOf(d: ChapterDemand): DemandClass | "foundational" {
  let best: DemandClass | null = null;
  for (const c of CLASS_ORDER) {
    if (d[c] > 0 && (best === null || d[c] > d[best])) best = c;
  }
  return best ?? "foundational";
}

/** Graduated applicability for one level (optionally focused on one role). */
export function gradedChapters(riskLevel: RiskLevel, role?: string): GradedChapter[] {
  const rows = loadAssignmentRows().filter((r) => r.risk_level === riskLevel && typeof r.chapter_id === "string");
  const out: GradedChapter[] = [];
  for (const chapterId of chapterSet()) {
    const chRows = rows.filter((r) => r.chapter_id === chapterId);
    const demand: ChapterDemand = { obrigatorio: 0, recomendado: 0, opcional: 0, specific: 0 };
    const roles = new Set<string>();
    const stories = new Set<string>();
    for (const r of chRows) {
      demand[classifyProportionality(r.proportionality)] += 1;
      if (r.role) roles.add(r.role);
      if (r.user_story_id) stories.add(r.user_story_id);
    }
    const entry: GradedChapter = {
      chapter_id: chapterId,
      title: chapterTitle(chapterId),
      applicable: true,
      demand,
      dominant: chRows.length === 0 ? "foundational" : dominantOf(demand),
      roles: roles.size,
      user_stories: stories.size,
      source:
        chRows.length === 0
          ? "declared fallback: capítulo foundational sem assignments no bundle — presença por semântica graduada + matriz do cap. 01"
          : "assignments.proportionality (bundle runtime, autorado por nível)"
    };
    if (role !== undefined && role.length > 0) {
      const rr = chRows.filter((r) => r.role === role);
      entry.role_view = {
        role,
        user_stories: [...new Map(rr.map((r) => [r.user_story_id ?? "", r])).values()]
          .filter((r) => r.user_story_id)
          .slice(0, 50)
          .map((r) => ({
            user_story_id: r.user_story_id as string,
            class: classifyProportionality(r.proportionality),
            proportionality: r.proportionality ?? ""
          }))
      };
    }
    out.push(entry);
  }
  return out;
}

/** Demand-by-level summary for one chapter (list_chapters annotation). */
export function demandByLevel(chapterId: string): Record<RiskLevel, DemandClass | "foundational"> {
  const rows = loadAssignmentRows().filter((r) => r.chapter_id === chapterId);
  const result = {} as Record<RiskLevel, DemandClass | "foundational">;
  for (const level of RISK_LEVELS) {
    const demand: ChapterDemand = { obrigatorio: 0, recomendado: 0, opcional: 0, specific: 0 };
    let n = 0;
    for (const r of rows) {
      if (r.risk_level !== level) continue;
      demand[classifyProportionality(r.proportionality)] += 1;
      n += 1;
    }
    result[level] = n === 0 ? "foundational" : dominantOf(demand);
  }
  return result;
}

export function clearApplicabilityCacheForTests(): void {
  cachedRows = undefined;
  cachedChapters = undefined;
}
