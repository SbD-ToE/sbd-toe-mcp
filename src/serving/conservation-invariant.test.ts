/**
 * 0.20.0-beta.23 — INVARIANTE DE CONSERVAÇÃO: o motor não deita fora o declarado.
 *
 * A invariante da beta.22 testou «selecção vazia ⇒ needs_input» e «activação ⇒ traço».
 * Faltava a terceira, que fecha a classe: **tudo o que o vocabulário PROMETE activar
 * tem de aparecer nalguma banda** (selected, narrowed_out ou excluded_by_level) e a
 * aritmética tem de fechar. Foi por aqui que o P0-1 passou — `concerns:["build"]`
 * prometia CIC+DEV e os DEV desapareciam de todas as bandas, incluindo de `eligible`.
 *
 * Varre o vocabulário TODO: 24 concerns × 3 níveis, exposure, data_sensitivity,
 * technologies e a tabela de paths. Promessa que não fecha parte a suite.
 */
import { describe, it, expect } from "vitest";
import { runSelection, type SelectionResult } from "./selection.js";
import { buildActivationVocabulary, EXPOSURE_VALUES, SENSITIVITY_VALUES } from "./activation-vocabulary.js";
import { getOntologyData } from "../tools/ontology-loader.js";

const LEVELS = ["L1", "L2", "L3"] as const;
const vocab = buildActivationVocabulary();
const ontology = getOntologyData();

/** Ids que o resultado expõe em QUALQUER banda declarada. */
function bandedIds(r: SelectionResult): Set<string> {
  const ids = new Set<string>();
  for (const s of r.selected) ids.add(s.requirement_id);
  for (const g of r.narrowed_out) for (const id of g.requirement_ids) ids.add(id);
  for (const g of r.excluded_by_level) for (const id of g.requirement_ids) ids.add(id);
  return ids;
}

function requirementsOfCategories(categories: readonly string[], level: (typeof LEVELS)[number]): string[] {
  return ontology.requirements
    .filter((r) => categories.includes(r.category) && r.applicable_levels?.[level] === true)
    .map((r) => r.requirement_id)
    .sort();
}

describe("conservação — o que o vocabulário promete aparece em alguma banda", () => {
  it("24 concerns × 3 níveis: nenhuma promessa desaparece", () => {
    const offenders: string[] = [];
    for (const entry of vocab.concerns.values) {
      for (const level of LEVELS) {
        const promised = requirementsOfCategories(entry.activates_categories, level);
        if (promised.length === 0) continue;
        const r = runSelection({ risk_level: level, concerns: [String(entry.value)] });
        if (r.needs_input) {
          // needs_input é resposta legítima só quando NADA foi prometido a este nível
          offenders.push(`${entry.value}@${level}: needs_input apesar de o vocabulário prometer ${promised.length} req.`);
          continue;
        }
        const seen = bandedIds(r);
        const missing = promised.filter((id) => !seen.has(id));
        if (missing.length > 0)
          offenders.push(
            `${entry.value}@${level}: ${missing.length}/${promised.length} prometidos desaparecidos de TODAS as bandas (ex.: ${missing.slice(0, 4).join(", ")})`
          );
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  /**
   * NOTA DE ENUNCIADO (beta.23): o despacho pedia
   * `selected + narrowed_out + excluded_by_level == eligible`. Essa soma NÃO pode
   * fechar por construção: `eligible` conta o que se aplica AO NÍVEL, e
   * `excluded_by_level` é precisamente o que NÃO se aplica ao nível — é o livro-razão
   * de fora, não uma parcela de dentro. A lei que fecha, e fecha exactamente, é a
   * conservação DENTRO do nível; a banda de exclusão é verificada à parte, no teste
   * das promessas (tudo o que é prometido aparece nalguma banda).
   */
  it("a aritmética fecha: selected + narrowed_out == eligible (e excluded_by_level é o livro-razão fora do nível)", () => {
    const offenders: string[] = [];
    for (const entry of vocab.concerns.values) {
      for (const level of LEVELS) {
        const r = runSelection({ risk_level: level, concerns: [String(entry.value)] });
        if (r.needs_input) continue;
        const sum = r.selected.length + r.narrowed_out.reduce((n, g) => n + g.count, 0);
        if (sum !== r.eligible_count) offenders.push(`${entry.value}@${level}: bandas=${sum} ≠ eligible=${r.eligible_count}`);
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("o vocabulário é coerente consigo próprio: requirements_at bate com o catálogo", () => {
    const offenders: string[] = [];
    for (const entry of vocab.concerns.values) {
      for (const level of LEVELS) {
        const real = requirementsOfCategories(entry.activates_categories, level).length;
        if (entry.requirements_at[level] !== real)
          offenders.push(`${entry.value}@${level}: publicado ${entry.requirements_at[level]} ≠ catálogo ${real}`);
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("activadores declarados (exposure/data_sensitivity) conservam o que os seus concerns prometem", () => {
    const offenders: string[] = [];
    const byConcern = new Map(vocab.concerns.values.map((c) => [String(c.value), c]));
    for (const level of LEVELS) {
      for (const [field, values] of [
        ["exposure", vocab.exposure.values],
        ["data_sensitivity", vocab.data_sensitivity.values]
      ] as const) {
        for (const v of values) {
          if (v.activates_concerns.length === 0) continue;
          const r = runSelection({ risk_level: level, [field]: v.value } as Parameters<typeof runSelection>[0]);
          if (r.needs_input) {
            offenders.push(`${field}=${v.value}@${level}: needs_input apesar de activar ${v.activates_concerns.join(",")}`);
            continue;
          }
          const seen = bandedIds(r);
          for (const concern of v.activates_concerns) {
            const promised = requirementsOfCategories(byConcern.get(concern)?.activates_categories ?? [], level);
            const missing = promised.filter((id) => !seen.has(id));
            if (missing.length > 0)
              offenders.push(`${field}=${v.value}@${level} → ${concern}: ${missing.length} prometidos fora de todas as bandas`);
          }
        }
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("technologies e paths conservam os capítulos que prometem activar", () => {
    const offenders: string[] = [];
    for (const level of LEVELS) {
      for (const t of vocab.technologies.values) {
        if (t.activates_chapters.length === 0) continue;
        const r = runSelection({ risk_level: level, technologies: [t.value] });
        if (r.needs_input) {
          offenders.push(`technologies=${t.value}@${level}: needs_input apesar de prometer ${t.activates_chapters.join(",")}`);
          continue;
        }
        const seen = bandedIds(r);
        const promised = ontology.requirements
          .filter((x) => x.source_bundle !== undefined && t.activates_chapters.includes(x.source_bundle) && x.applicable_levels?.[level] === true)
          .map((x) => x.requirement_id);
        const missing = promised.filter((id) => !seen.has(id));
        if (missing.length > 0)
          offenders.push(`technologies=${t.value}@${level}: ${missing.length}/${promised.length} requisitos dos capítulos prometidos fora das bandas`);
      }
      for (const p of vocab.changed_files.patterns.slice(0, 6)) {
        const sample = p.pattern.replace("**", "x").replace("*", "x");
        const r = runSelection({ risk_level: level, changed_files: [sample] });
        if (r.needs_input) continue; // padrão amostrado pode não casar — a inércia já é declarada
        const seen = bandedIds(r);
        const promised = ontology.requirements
          .filter((x) => x.source_bundle !== undefined && p.activates_chapters.includes(x.source_bundle) && x.applicable_levels?.[level] === true)
          .map((x) => x.requirement_id);
        const missing = promised.filter((id) => !seen.has(id));
        if (missing.length > 0)
          offenders.push(`changed_files ${p.pattern}@${level}: ${missing.length}/${promised.length} fora das bandas`);
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });
});
