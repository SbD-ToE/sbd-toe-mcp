/**
 * get_sbd_toe_chapter_capability — a vista IMPL: a CAPACIDADE de um capítulo.
 *
 * 0.20.0-beta.34. A medição do Eixo I dava ao GR-01 — «a organização quer implementar o
 * cap. 07: o que precisa de ter, como sabe que está capaz, e como mede?» — o veredicto
 * **NÃO SERVIDO** sob o critério v1.1, porque a PEÇA CENTRAL da leitura (a medida de
 * capacidade) não tinha caminho: as 99 métricas estão publicadas em
 * `runtime/metrics.json` com thresholds por nível, e a única superfície que lhes tocava
 * (`assess_sbd_toe_implementation`) avalia KPIs que o CHAMADOR traz — não publica os que o
 * Manual define.
 *
 * Esta é a leitura **IMPL**, e é diferente da **GUIDE**. A mesma pergunta sobre o cap. 07
 * tem duas respostas legítimas:
 *   - GUIDE  → «que requisitos se aplicam a ESTA tarefa» (`select_sbd_toe_requirements`);
 *   - IMPL   → «que capacidade a ORGANIZAÇÃO precisa de ter, e como sabe que a tem» (aqui).
 * O consumidor tem de saber qual recebeu: a resposta di-lo no campo `reading`, e o
 * must-NOT do próprio caso é responder à IMPL com a lista de requisitos técnicos.
 */
import { loadMetrics, type MetricRecord } from "./assess-implementation.js";
import { getOntologyData, runtimeCountSemantics } from "./ontology-loader.js";
import { assertionFor } from "../serving/traversal-assertions.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { paginate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";

const LEVELS = ["L1", "L2", "L3"] as const;

export interface ChapterCapabilityResult {
  provenance: { kg: string; server: string; content_type: string; produced_by: string; source_data: string; note: string };
  reading: { id: "IMPL"; note: string };
  [key: string]: unknown;
  next?: Affordance[];
}

function measureOf(m: MetricRecord, level: string | undefined) {
  const byLevel = m.thresholds_by_level_parsed ?? {};
  const thresholds = Object.fromEntries(
    LEVELS.map((l) => {
      const t = byLevel[l];
      return [l, t == null ? null : { raw: t.raw, operator: t.operator, value: t.value, unit: t.unit }];
    })
  );
  const target = level !== undefined ? thresholds[level] : undefined;
  return {
    metric_id: m.metric_id,
    label: m.label,
    metric_type: m.metric_type,
    metric_scope: m.metric_scope,
    period: m.period,
    dimension_ids: m.dimension_ids ?? [],
    thresholds_by_level: thresholds,
    ...(level !== undefined ? { target_at_level: target ?? null } : {}),
    ...(m.related_documents ? { related_documents: m.related_documents } : {})
  };
}

export function handleGetChapterCapability(args: Record<string, unknown>): ChapterCapabilityResult {
  const chapterArg = typeof args["chapter"] === "string" ? (args["chapter"] as string) : undefined;
  const metricId = typeof args["metric_id"] === "string" ? (args["metric_id"] as string) : undefined;
  const dimension = typeof args["dimension"] === "string" ? (args["dimension"] as string) : undefined;
  const levelArg = typeof args["risk_level"] === "string" ? (args["risk_level"] as string) : undefined;
  const level = LEVELS.includes(levelArg as (typeof LEVELS)[number]) ? levelArg : undefined;

  const metrics = loadMetrics();
  const ontology = getOntologyData();
  const provenance = {
    kg: servedKgReleaseTag(),
    server: servingServerVersion(),
    content_type: "canonical",
    content_type_by_band: {
      measures: "canonical — os KPIs e os thresholds por nível como o bundle os publica",
      artifacts: "derived — junções sobre a relação e sobre os padrões de evidência; cada base declara-se na banda"
    },
    produced_by: "chapter_capability_projection",
    source_data: "data/publish/runtime/metrics.json + runtime/artifact_requirements + runtime/artifacts",
    note:
      "KPIs que o MANUAL define para a capacidade do capítulo, com os thresholds por nível como o bundle " +
      "os publica. A banda `artifacts` é DERIVADA e declara a base de cada conjunto — o carimbo `canonical` " +
      "vale para as medidas, não para junções. Nada é inventado e nada é avaliado aqui — avaliar é o " +
      "`assess_sbd_toe_implementation`, com os valores que TU medires."
  };
  const reading = {
    id: "IMPL" as const,
    note:
      "Leitura IMPL — «que capacidade a ORGANIZAÇÃO precisa de ter, e como sabe que a tem». NÃO é a " +
      "leitura GUIDE: se o que queres é «que requisitos se aplicam a ESTA tarefa», isso é " +
      "`select_sbd_toe_requirements` e a resposta é outra. Responder à IMPL com a lista de requisitos " +
      "técnicos é o erro que este caminho existe para evitar."
  };

  // um KPI concreto
  if (metricId !== undefined) {
    const found = metrics.find((m) => m.metric_id === metricId);
    if (found === undefined)
      return {
        provenance,
        reading,
        status: "unknown_metric",
        requested: metricId,
        note: `\`${metricId}\` não é um KPI publicado. Pede por capítulo (\`chapter="07-cicd-seguro"\`) para ver os que existem.`
      };
    return { provenance, reading, measure: measureOf(found, level), chapter: found.chapter_id };
  }

  const scoped = metrics.filter(
    (m) =>
      (chapterArg === undefined || m.chapter_id === chapterArg) &&
      (dimension === undefined || (m.dimension_ids ?? []).includes(dimension))
  );

  // capítulo pedido e sem KPIs publicados: declarado, nunca vazio mudo
  if (chapterArg !== undefined && scoped.length === 0) {
    const covered = [...new Set(metrics.map((m) => m.chapter_id))].sort();
    return {
      provenance,
      reading,
      status: "no_measures_published",
      requested: chapterArg,
      chapters_with_measures: covered,
      note:
        `O Manual não publica KPIs para \`${chapterArg}\`. Isto NÃO significa que a capacidade não se meça — ` +
        "significa que a medida não está publicada como dado nesta build. Os capítulos com KPIs vêm acima."
    };
  }

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 25;
  const page = paginate(scoped, { offset: offsetArg, limit: limitArg }, scoped.length || 1);

  /**
   * 0.20.0-beta.39 — ARTEFACTOS: DUAS BASES, cada uma declarada, e NENHUMA delas é «o que
   * este capítulo tem de produzir». Esse conjunto o Manual não publica, e afirmá-lo era a
   * única falha em que esta superfície AFIRMAVA em vez de omitir.
   *
   * O que estava mal: contávamos os registos `ArtifactRequirement` que nomeiam o capítulo
   * em `chapter_ids` (31, no cap. 01) e serviamo-los como `total` + `mandatory` sob a nota
   * «tem de PRODUZIR», carimbados `canonical`. A própria fonte proíbe a operação por
   * escrito — `count_semantics` diz «sum them for relation edges, NEVER FOR TOTALS» — e o
   * `mandatory` não discriminava nada (45 de 45 são `true`).
   *
   * O que passa a fazer: serve as duas leituras possíveis com a BASE de cada uma à vista,
   * a declaração da fonte VERBATIM, e nenhuma promoção de aresta a obrigação.
   */
  const artifactsById = new Map((ontology.artifacts ?? []).map((a) => [a.artifact_type_id, a]));
  const shapeArtifact = (id: string) => {
    const meta = artifactsById.get(id);
    return {
      artifact_type_id: id,
      name: meta?.name ?? id,
      ...(meta?.category !== undefined ? { category: meta.category } : {}),
      lifecycle_phases: meta?.lifecycle_phases ?? []
    };
  };

  // Base A — o que os PADRÕES DE EVIDÊNCIA do capítulo esperam. Âmbito por PERTENÇA
  // (EP → requisito → capítulo do requisito), nunca por prefixo do id.
  const chapterOfRequirement = new Map((ontology.requirements ?? []).map((r) => [r.requirement_id, r.source_bundle]));
  const chapterEvidencePatterns =
    chapterArg === undefined
      ? []
      : (ontology.evidencePatterns ?? []).filter((ep) => chapterOfRequirement.get(ep.maps_to_requirement_id) === chapterArg);
  const byEvidence = [
    ...new Set(chapterEvidencePatterns.flatMap((ep) => ep.expected_artifact_type_ids ?? []))
  ]
    .sort()
    .map(shapeArtifact);

  /*
   * 0.20.0-beta.40 (v2.6, decisão K) — DEFINIDORES vs CITADORES.
   *
   * A b.39 tinha razão a chamar-lhe RELAÇÃO em vez de total, mas a relação continuava a ser
   * uma só: o capítulo da classificação «tinha» SBOM, imagem de container, SAST e plano de
   * Terraform, porque esses registos o CITAM. A v2.6 parte a aresta em duas — `defining`
   * (proveniência: o capítulo define o artefacto) e `cited` (só o menciona) — e a superfície
   * passa a servi-las separadas. É o fim do achado central do auditor.
   */
  const definingRecords =
    chapterArg === undefined
      ? []
      : (ontology.artifactRequirements ?? []).filter((ar) => (ar.defining_chapter_ids ?? []).includes(chapterArg));
  const relatedRecords =
    chapterArg === undefined
      ? []
      : (ontology.artifactRequirements ?? []).filter((ar) => (ar.chapter_ids ?? []).includes(chapterArg));
  const definingIds = new Set(definingRecords.map((ar) => ar.artifact_type_id));
  /*
   * 0.20.0-beta.43 (v2.7) — a TERCEIRA base: `evidence_chapter_ids`. É a travessia
   * `required_as_evidence_by` (EP → requisito → capítulo), publicada agora como dado em vez
   * de recalculada aqui. Os 8 artefactos sem cobertura vêm DECLARADOS um a um, com a
   * ausência que a fonte lhes atribui — não se somam ao conjunto nem se calam.
   */
  const evidenceRecords =
    chapterArg === undefined
      ? []
      : (ontology.artifactRequirements ?? []).filter((ar) => (ar.evidence_chapter_ids ?? []).includes(chapterArg));
  const evidenceIds = new Set(evidenceRecords.map((ar) => ar.artifact_type_id));
  const evidenceOrphans = (ontology.artifactRequirements ?? [])
    .filter((ar) => (ar.evidence_chapter_ids ?? []).length === 0)
    .map((ar) => ({
      artifact_type_id: ar.artifact_type_id,
      ...(ar.evidence_chapters_absence !== undefined ? { declared_absence: ar.evidence_chapters_absence } : {})
    }));
  const relationEdges = relatedRecords
    .map((ar) => shapeArtifact(ar.artifact_type_id))
    .sort((a, b) => a.artifact_type_id.localeCompare(b.artifact_type_id));
  const countSemantics = runtimeCountSemantics("data/publish/runtime/artifact_requirements.json");
  const hasDefiningSurface = (ontology.artifactRequirements ?? []).some((ar) => ar.defining_chapter_ids !== undefined);
  /**
   * `required_for_levels` — servido, mas SEM lhe vestir significado que não tem: 43 dos 45
   * registos são `{L1,L2,L3: true}`. Substituiu um campo degenerado (`mandatory` 45/45) por
   * outro QUASE degenerado, e é assim que se declara.
   */
  const levelDiscriminating = (ontology.artifactRequirements ?? []).filter((ar) => {
    const lv = ar.required_for_levels;
    return lv !== undefined && Object.values(lv).some((v) => v !== true);
  }).length;

  const epIds = new Set(byEvidence.map((a) => a.artifact_type_id));
  const relIds = new Set(relationEdges.map((a) => a.artifact_type_id));
  const union = [...new Map([...byEvidence, ...relationEdges].map((a) => [a.artifact_type_id, a])).values()].sort((a, b) =>
    a.artifact_type_id.localeCompare(b.artifact_type_id)
  );

  const artifacts =
    chapterArg === undefined
      ? undefined
      : {
          content_type: "derived",
          note:
            "Bases distintas, e cada artefacto diz de QUAIS vem. Cada base traz o VERBO que afirma e — " +
            "obrigatoriamente — **o que NÃO afirma** (`asserts.does_not_assert`, verbatim da ontologia). " +
            "**Nenhuma delas é «os artefactos que este capítulo tem de produzir»** nem afirma posse: esse " +
            "conjunto o Manual não publica, e o servidor não o inventa.",
          bases: {
            evidence_pattern: {
              what:
                "artefactos nomeados em `expected_artifact_type_ids` dos padrões de evidência cujo REQUISITO " +
                "pertence a este capítulo (EP → requisito → capítulo). É o conjunto com suporte em requisitos.",
              evidence_patterns: chapterEvidencePatterns.length,
              distinct_artifacts: epIds.size
            },
            /*
             * 0.20.0-beta.43 — o `own` SAIU. O verbo publicado é `produced_or_operated_by`, e a
             * asserção da própria fonte diz que ele **não afirma posse**. A b.40 chamou-lhe
             * `own` porque não havia nada que o impedisse; agora a asserção negativa vem na
             * banda, e a palavra não volta.
             */
            produced_or_operated_by: {
              what:
                "capítulos que PRODUZEM OU OPERAM o artefacto (`defining_chapter_ids`, v2.6 decisão K), " +
                "derivado das `source_practice_ids` autoradas.",
              asserts: assertionFor("artifact_defining_chapters"),
              available: hasDefiningSurface,
              artifacts: definingIds.size
            },
            required_as_evidence_by: {
              what:
                "capítulos que EXIGEM o artefacto como prova (`evidence_chapter_ids`, v2.7), derivado de " +
                "EP → requisito → capítulo e publicado como dado.",
              asserts: assertionFor("artifact_evidence_chapters"),
              artifacts: evidenceIds.size,
              orphans: {
                count: evidenceOrphans.length,
                note:
                  "artefactos SEM capítulo que os exija como prova — declarados um a um, com a ausência " +
                  "que a fonte lhes atribui. Não entram no conjunto e não desaparecem.",
                values: evidenceOrphans
              }
            },
            chapter_relation: {
              asserts: assertionFor("artifact_defining_chapters"),
              what:
                "registos `ArtifactRequirement` que NOMEIAM este capítulo em `chapter_ids` — a citação. São " +
                "ARESTAS da relação capítulo↔artefacto: não um total, não uma obrigação de produção, e " +
                "**não posse**. Um capítulo citar um artefacto não o torna dele.",
              ...(countSemantics !== undefined ? { source_declares: countSemantics } : {}),
              relation_edges: relationEdges.length
            },
            required_for_levels: {
              what:
                "a fonte publica `required_for_levels` por artefacto. **NÃO discrimina quase nada**: " +
                `${levelDiscriminating} dos ${(ontology.artifactRequirements ?? []).length} registos têm algum ` +
                "nível a `false`; os restantes são `{L1,L2,L3: true}`. Substituiu o `mandatory` degenerado " +
                "(45/45) por um campo QUASE degenerado, e serve-se pelo que é — não como se seleccionasse."
            }
          },
          only_in_evidence_pattern: [...epIds].filter((id) => !relIds.has(id)).sort(),
          values: union.map((a) => ({
            ...a,
            bases: [
              ...(epIds.has(a.artifact_type_id) ? ["evidence_pattern"] : []),
              ...(definingIds.has(a.artifact_type_id) ? ["produced_or_operated_by"] : []),
              ...(evidenceIds.has(a.artifact_type_id) ? ["required_as_evidence_by"] : []),
              ...(relIds.has(a.artifact_type_id) ? ["chapter_relation"] : [])
            ]
          })),
          declared_limits: {
            ...(hasDefiningSurface
              ? {}
              : {
                  no_defining_surface:
                    "este pino não publica `defining_chapter_ids`: só há a relação de citação, e por isso " +
                    "nenhum artefacto se declara DESTE capítulo. Não é o mesmo que não haver nenhum."
                }),
            no_mandatory_count:
              "a fonte traz `mandatory: true` em 45 de 45 registos — o campo não discrimina nada, e por isso " +
              "NÃO se serve aqui uma contagem de obrigatoriedade. Achado de CONTEÚDO, reportado ao programa; " +
              "o servidor declara o que recebe e não compensa.",
            relation_broader_than_provenance:
              "há registos cujo `chapter_ids` é mais largo que a sua própria proveniência — o do SBOM nomeia os " +
              "15 capítulos enquanto os seus `source_practice_ids` cobrem 7. Por isso a relação vem como " +
              "relação: lê-la como obrigação herdaria a largura."
          }
        };

  return {
    provenance,
    reading,
    scope: chapterArg ?? (dimension !== undefined ? `dimension=${dimension}` : "todos os capítulos"),
    ...(level !== undefined ? { risk_level: level } : {}),
    measures: page.items.map((m) => measureOf(m, level)),
    coverage: { ...page.coverage, total: scoped.length },
    ...(artifacts !== undefined ? { artifacts } : {}),
    next: [
      {
        intent: "Avaliar-te contra ESTES KPIs (traz os teus valores medidos)",
        tool: "assess_sbd_toe_implementation",
        with: `risk_level="${level ?? "L2"}", kpi_values={"${page.items[0]?.metric_id ?? "ARC-K01"}": <valor medido>}`,
        kind: "structural" as const
      },
      {
        intent: "O checklist de implementação do capítulo",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: `chapter="${chapterArg ?? "07-cicd-seguro"}"`,
        kind: "structural" as const
      },
      {
        intent: "Os papéis e o momento no ciclo",
        tool: "get_guide_by_role",
        with: `risk_level="${level ?? "L2"}", phase="build"`,
        kind: "structural" as const
      }
    ]
  };
}
