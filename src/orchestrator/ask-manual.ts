import { loadBundleProvenance } from "../version-info.js";
import { getConfig } from "../config.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";
import { buildAnswerPrompt } from "../prompt/build-answer-prompt.js";
import { boundList, resolveBudget, truncateText } from "../serving/response-shaping.js";
import type {
  ManualToolResult,
  PromptBundle,
  RetrievalBundle,
  VectorRecallMode
} from "../types.js";

/**
 * Optional bounds for serialized retrieval debug. Used by inspection-style
 * tools to honour their `topK` (inspection depth) instead of dumping the full
 * candidate pool — see {@link inspectManualRetrieval}. Omitted by answer/search
 * callers, which keep the unbounded appendix.
 */
export interface DebugShaping {
  /** Maximum number of retrieved records to serialize. */
  limit?: number;
  /** Maximum visible characters per record excerpt. */
  excerptMaxChars?: number;
}

function formatRecordDebug(retrieval: RetrievalBundle, shaping?: DebugShaping): string {
  if (retrieval.retrieved.length === 0) {
    return "Nenhum record recuperado.";
  }

  const bounded =
    shaping?.limit !== undefined
      ? boundList(retrieval.retrieved, shaping.limit)
      : { items: retrieval.retrieved, total: retrieval.retrieved.length, omitted: 0, truncated: false };

  const body = bounded.items
    .map((record, index) => {
      const header = `${index + 1}. [${record.citationId}] source=${record.source} index=${record.indexName} objectID=${record.objectID} rank=${record.algoliaRank} localScore=${record.localScore}`;
      const details = [
        `Título: ${record.title}`,
        `Capítulo: ${record.chapter ?? "n/d"}`,
        `Secção: ${record.section ?? "n/d"}`,
        `Papel: ${record.role ?? "n/d"}`,
        `Fase: ${record.phase ?? "n/d"}`,
        `Ação: ${record.action ?? "n/d"}`,
        `Artefacto: ${record.artefact ?? "n/d"}`,
        `Documento: ${record.documentTitle ?? "n/d"}`,
        `Document path: ${record.documentPath ?? "n/d"}`,
        `Chapter path: ${record.chapterPath ?? "n/d"}`,
        `Traceability: ${
          record.traceability
            ? [
                record.traceability.sourcePath,
                record.traceability.lineStart !== undefined
                  ? `L${record.traceability.lineStart}${
                      record.traceability.lineEnd !== undefined &&
                      record.traceability.lineEnd !== record.traceability.lineStart
                        ? `-L${record.traceability.lineEnd}`
                        : ""
                    }`
                  : undefined,
                record.traceability.unitId
              ]
                .filter(Boolean)
                .join(" | ")
            : "n/d"
        }`,
        `Localização: ${[record.pageLabel, record.url].filter(Boolean).join(" | ") || "n/d"}`,
        `Excerto: ${
          shaping?.excerptMaxChars !== undefined
            ? truncateText(record.excerpt, shaping.excerptMaxChars).value
            : record.excerpt
        }`
      ].join("\n");

      return `${header}\n${details}`;
    })
    .join("\n\n");

  if (bounded.truncated) {
    return `${body}\n\n… ${bounded.omitted} de ${bounded.total} records omitidos (limite de inspeção topK=${bounded.items.length}).`;
  }
  return body;
}

function formatContextForChat(retrieval: RetrievalBundle): string {
  if (retrieval.selected.length === 0) {
    return [
      "Nenhum contexto relevante foi recuperado.",
      "",
      "O chat deve responder que a informação não está disponível no snapshot atual."
    ].join("\n");
  }

  return [
    "Contexto recuperado para resposta grounded:",
    "",
    retrieval.selected
      .map((record) =>
        [
          `[${record.citationId}] ${record.title}`,
          `Fonte: ${record.indexName}`,
          `Capítulo: ${record.chapter ?? "n/d"}`,
          `Secção: ${record.section ?? "n/d"}`,
          `URL: ${record.url ?? "n/d"}`,
          `Excerto: ${record.excerpt}`
        ].join("\n")
      )
      .join("\n\n")
  ].join("\n");
}

function formatDebugAppendix(
  query: string,
  retrieval: RetrievalBundle,
  prompt: string,
  answer?: string,
  samplingModel?: string,
  shaping?: DebugShaping
): string {
  const pin = loadBundleProvenance();
  const chapters =
    retrieval.promptChapters.length > 0 ? retrieval.promptChapters.join(", ") : "n/d";

  return [
    "## Debug",
    `- Query: ${query}`,
    `- Artefactos consultados: ${retrieval.consultedIndices.join(", ") || "n/d"}`,
    // 0.13.0: production identity comes from the verified consumed-bundle pin — the
    // upstream checkout (dev-only) may be absent; its fields fall back DECLARED, never "n/d".
    `- Pin servido (consumed-bundle.json): kg=${pin?.kg.release_tag ?? "?"} (${pin?.kg.source ?? "?"}, sha256 ${pin?.kg.sha256 ? pin.kg.sha256.slice(0, 12) + "…" : "?"}, contrato ${pin?.kg.consumer_contract_version ?? "?"}) · manual=${pin?.manual.tag ?? "?"} (${pin?.manual.commit ? pin.manual.commit.slice(0, 8) : "?"}) · ontologia=${pin?.ontology.tag ?? "?"}`,
    `- Snapshot upstream (checkout dev): run_id=${retrieval.backendSnapshot.runId ?? "ausente — identidade de produção no Pin servido acima"} commit_sha=${retrieval.backendSnapshot.commitSha ?? (pin?.manual.commit ? "ver pin: " + pin.manual.commit.slice(0, 8) : "ausente")}`,
    `- Clone upstream: ${retrieval.backendSnapshot.upstreamRepoPath ?? "n/d"}`,
    `- Publication manifest: ${retrieval.backendSnapshot.publicationManifestFile ?? "n/d"}`,
    `- Deterministic manifest: ${retrieval.backendSnapshot.deterministicManifestFile ?? "n/d"}`,
    `- Ontology: ${retrieval.backendSnapshot.ontologyFile ?? "n/d"}`,
    `- MCP chunks: ${retrieval.backendSnapshot.mcpChunksFile ?? "n/d"}`,
    `- Vector chunks: ${retrieval.backendSnapshot.vectorChunksFile ?? "n/d"}`,
    `- Canonical chunks: ${retrieval.backendSnapshot.canonicalChunksFile ?? "n/d"}`,
    `- Chunk entity mentions: ${retrieval.backendSnapshot.chunkEntityMentionsFile ?? "n/d"}`,
    `- Chunk relation hints: ${retrieval.backendSnapshot.chunkRelationHintsFile ?? "n/d"}`,
    `- Substrate version: ${retrieval.backendSnapshot.substrateVersion ?? "n/d"}`,
    `- Sampling model: ${samplingModel ?? "n/d"}`,
    `- Capítulos envolvidos: ${chapters}`,
    `- Contexto selecionado: ${retrieval.selected.map((record) => `[${record.citationId}]`).join(", ") || "nenhum"}`,
    "",
    "### Records recuperados",
    formatRecordDebug(retrieval, shaping),
    "",
    "### Prompt final",
    "```text",
    prompt,
    "```",
    ...(answer
      ? ["", "### Resposta final", "```markdown", answer, "```"]
      : [])
  ].join("\n");
}

export async function prepareManualAnsweringContext(
  question: string,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {},
  debugShaping?: DebugShaping
): Promise<{
  retrieval: RetrievalBundle;
  prompt: PromptBundle;
  retrievalText: string;
  debugText: string;
}> {
  const retrieval = await retrievePublishedContext(question, topK, options);
  const prompt = buildAnswerPrompt(question, retrieval.selected);
  const retrievalText = formatContextForChat(retrieval);
  const debugText = formatDebugAppendix(
    question,
    retrieval,
    prompt.fullPrompt,
    undefined,
    undefined,
    debugShaping
  );

  return {
    retrieval,
    prompt,
    retrievalText,
    debugText
  };
}

export async function searchManualQuestion(
  question: string,
  debugOverride?: boolean,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {}
): Promise<ManualToolResult> {
  const config = getConfig();
  // Bound the debug appendix to the search depth (topK): with debug on, the
  // unbounded path serialized the full candidate pool (~4k records / ~5MB) into
  // both debugText and debug.retrieved — the same token-bomb class as inspect.
  const budget = resolveBudget("diagnostic", topK !== undefined ? { maxRecords: topK } : {});
  const prepared = await prepareManualAnsweringContext(question, topK, options, {
    limit: budget.maxRecords,
    excerptMaxChars: budget.maxExcerptChars,
  });
  const boundedRetrieved = boundList(prepared.retrieval.retrieved, budget.maxRecords);
  const text =
    debugOverride ?? config.debugMode
      ? `${prepared.retrievalText}\n\n---\n\n${prepared.debugText}`
      : prepared.retrievalText;

  return {
    text,
    debugText: prepared.debugText,
    debug: {
      query: question,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      meta: {
        retrievedTotal: boundedRetrieved.total,
        retrievedReturned: boundedRetrieved.returned,
        retrievedTruncated: boundedRetrieved.truncated,
        retrievedOmitted: boundedRetrieved.omitted,
        selectedCount: prepared.retrieval.selected.length,
        excerptMaxChars: budget.maxExcerptChars,
        note:
          "Debug retrieved bounded to topK to keep the response within budget; " +
          "retrievedTotal is the full candidate pool before bounding.",
      },
      retrieved: boundedRetrieved.items.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: truncateText(record.excerpt, budget.maxExcerptChars).value,
        traceability: record.traceability
      }))
    }
  };
}

export async function inspectManualRetrieval(
  question: string,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {}
): Promise<ManualToolResult> {
  // Inspection is a diagnostic surface: honour topK as the inspection depth and
  // bound the candidate pool + excerpts so the response stays within budget.
  // `retrieved` is the full deduped candidate pool (the whole corpus when
  // unfiltered); serializing it raw is the token-bomb this bound prevents.
  const budget = resolveBudget(
    "diagnostic",
    topK !== undefined ? { maxRecords: topK } : {}
  );
  const prepared = await prepareManualAnsweringContext(question, topK, options, {
    limit: budget.maxRecords,
    excerptMaxChars: budget.maxExcerptChars,
  });
  const boundedRetrieved = boundList(prepared.retrieval.retrieved, budget.maxRecords);

  return {
    text: prepared.debugText,
    debugText: prepared.debugText,
    debug: {
      query: question,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      meta: {
        retrievedTotal: boundedRetrieved.total,
        retrievedReturned: boundedRetrieved.returned,
        retrievedTruncated: boundedRetrieved.truncated,
        retrievedOmitted: boundedRetrieved.omitted,
        selectedCount: prepared.retrieval.selected.length,
        excerptMaxChars: budget.maxExcerptChars,
        note:
          "Inspection bounded to topK records to keep the response within consumer budget. " +
          "retrievedTotal reflects the full candidate pool before bounding; raise topK to inspect more.",
      },
      retrieved: boundedRetrieved.items.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: truncateText(record.excerpt, budget.maxExcerptChars).value,
        traceability: record.traceability
      }))
    }
  };
}

export function formatSampledAnswerResult(
  question: string,
  prepared: {
    retrieval: RetrievalBundle;
    prompt: PromptBundle;
  },
  answer: string,
  samplingModel?: string,
  debugOverride?: boolean
): ManualToolResult {
  const config = getConfig();
  const debugText = formatDebugAppendix(
    question,
    prepared.retrieval,
    prepared.prompt.fullPrompt,
    answer,
    samplingModel
  );

  return {
    text:
      debugOverride ?? config.debugMode ? `${answer}\n\n---\n\n${debugText}` : answer,
    debugText,
    debug: {
      query: question,
      samplingModel,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      retrieved: prepared.retrieval.retrieved.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: record.excerpt,
        traceability: record.traceability
      })),
      finalAnswer: answer
    }
  };
}
