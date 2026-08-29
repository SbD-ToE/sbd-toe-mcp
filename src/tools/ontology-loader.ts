/**
 * ontology-loader
 *
 * Loads and caches the published SbD-ToE deterministic runtime bundle.
 *
 * Runtime contract:
 *   data/publish/ontology/sbdtoe-ontology.yaml
 *   data/publish/runtime/deterministic_manifest.json
 *   data/publish/runtime/*.json
 *
 * Structured tools must resolve normative data from this bundle, not from
 * retrieval artefacts such as mcp_chunks or vector_chunks.
 */

import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { resolveAppPath } from "../config.js";
import { isRequirementId } from "../serving/requirement-id.js";

export interface Requirement {
  requirement_id: string;
  type: string;
  category: string;
  name: string;
  description?: string;
  applicable_levels: { L1: boolean; L2: boolean; L3: boolean };
  source_chapter: number;
  source_file?: string;
  source_bundle?: string;
  domain?: string | null;
  evidence_types?: string[];
}

export interface Control {
  control_id: string;
  name: string;
  domain: string;
  control_type: string;
  abstraction_level: string;
  applicable_lifecycle_phases: string[];
  chapter_ids?: string[];
  description?: string;
  source_practice_ids?: string[];
  artifact_types?: string[];
}

export interface CanonicalRole {
  role_id: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface CanonicalPhase {
  phase_id: string;
  label: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface Threat {
  id?: string;
  title?: string;
  essence?: string;
  chapter_id?: string;
  mitigation_summary?: string;
  how_it_arises?: string;
  methodology?: string;
  canonical_control_ids?: string[];
  mitigated_threat_id?: string;
  threat_label_raw?: string;
  associated_controls: string[];
  /** STRIDE | LINDDUN | PASTA | other — consumer contract v1.3 §1.8 (v1 tier). */
  threat_category?: string;
  /** forte | parcial | dependente_de_outros_capitulos — consumer contract v1.3 §1.8. */
  mitigation_strength?: string;
}

export interface Practice {
  id: string;
  chapter_id: string;
  label: string;
  normalized_label?: string;
}

export interface PracticeAssignment {
  id: string;
  chapter_id: string;
  practice_id: string;
  role: string;
  phase: string;
  risk_level: string;
  action: string;
  artifacts: string[];
  user_story_id?: string;
  /** Level-specific proportionality string (the assignment is risk-level-tagged). */
  proportionality?: string;
}

export interface UserStory {
  id?: string;
  us_id?: string;
  title: string;
  chapter_id?: string;
  practice_id?: string;
  roles_normalized?: string[];
  related_roles?: string[];
  risk_levels?: string[];
  acceptance_criteria?: string;
  bdd?: string[];
  checklist_items?: string[];
  goal?: string;
  summary?: string;
  document_path?: string;
  /** Joined from proportionality.json (by user_story_id) — L1/L2/L3 expectation. */
  proportionality?: { L1?: string; L2?: string; L3?: string };
  /** Joined from sdlc_integration.json (by user_story_id) — phase/trigger/responsible/SLA. */
  sdlc_integration?: Array<{
    phase?: string;
    trigger?: string;
    responsible?: string;
    sla?: string;
  }>;
}

export interface Artifact {
  artifact_type_id: string;
  name: string;
  canonical_aliases?: string[];
  category?: string;
  lifecycle_phases: string[];
  produced_by_controls: string[];
  validated_by_controls: string[];
}

export interface ArtifactRequirement {
  artifact_type_id: string;
  requirement_id: string;
  source_control_ids: string[];
  source_practice_ids: string[];
  mandatory: boolean;
  chapter_ids?: string[];
  description?: string;
}

export interface EvidencePattern {
  id: string;
  maps_to_control_id: string;
  maps_to_requirement_id: string;
  evidence_expectation?: string;
  verification_logic?: string;
  expected_artifact_type_ids: string[];
}

export interface RequirementControlLink {
  source_id: string;
  target_id: string;
  link_type: string;
  confidence?: number;
}

export interface Signal {
  signal_id: string;
  label: string;
  bundle_ids: string[];
}

export interface SignalEvidenceLink {
  source_id: string;
  target_id: string;
  target_source_basis?: string;
}

export interface AntiPattern {
  antipattern_id: string;
  label: string;
  bundle_ids: string[];
  risk?: string;
}

export interface AntiPatternRequirementLink {
  source_id: string;
  target_id: string;
}

export interface AntiPatternThreatLink {
  source_id: string;
  target_id: string;
  target_chapter_id?: string;
}

export interface OntologyData {
  domainMapping: Record<string, string[]>;
  concernsMap: Record<string, string[]>;
  requirements: Requirement[];
  controls: Control[];
  roles: CanonicalRole[];
  threats: Threat[];
  assignments: PracticeAssignment[];
  userStories: UserStory[];
  practices?: Practice[];
  phases?: CanonicalPhase[];
  artifacts?: Artifact[];
  artifactRequirements?: ArtifactRequirement[];
  evidencePatterns?: EvidencePattern[];
  requirementControlLinks?: RequirementControlLink[];
  signals?: Signal[];
  signalEvidenceLinks?: SignalEvidenceLink[];
  antipatterns?: AntiPattern[];
  antipatternRequirementLinks?: AntiPatternRequirementLink[];
  antipatternThreatLinks?: AntiPatternThreatLink[];
}

interface RuntimeArtifactEnvelope {
  items?: unknown[];
}

let _cache: OntologyData | undefined;

function loadOntologyYaml(): { domain_mapping?: Record<string, unknown> } {
  const path = resolveAppPath("data/publish/ontology/sbdtoe-ontology.yaml");
  return parseYaml(readFileSync(path, "utf-8")) as { domain_mapping?: Record<string, unknown> };
}

function loadRuntimeItems(relativePath: string): unknown[] {
  const path = resolveAppPath(relativePath);
  const envelope = JSON.parse(readFileSync(path, "utf-8")) as RuntimeArtifactEnvelope;
  return Array.isArray(envelope.items) ? envelope.items : [];
}

/** Like loadRuntimeItems but returns [] when the file is absent (optional side-files). */
function loadRuntimeItemsOptional(relativePath: string): unknown[] {
  return existsSync(resolveAppPath(relativePath)) ? loadRuntimeItems(relativePath) : [];
}

/**
 * Load a line-delimited JSON (.jsonl) runtime artefact. The v1 tripartition tier
 * (consumer contract v1.3 §1.8) ships .jsonl, e.g. manual_threat_mitigation.jsonl.
 * Returns [] if the file is absent (graceful for partial/older bundles).
 */
function loadRuntimeJsonl(relativePath: string): Record<string, unknown>[] {
  const path = resolveAppPath(relativePath);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as Record<string, unknown>)
    .filter(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strOf(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function numOf(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" ? value : NaN;
}

function boolOf(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function arrStr(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
}

export function chapterNumber(chapterId: string): number {
  const match = /^(\d+)/.exec(chapterId);
  return match?.[1] !== undefined ? Number.parseInt(match[1], 10) : NaN;
}

export function resolveRoleId(input: string, roles: CanonicalRole[]): string | undefined {
  const normalized = normalizeKey(input);
  return roles.find(
    (role) =>
      normalizeKey(role.role_id) === normalized ||
      role.aliases.some((alias) => normalizeKey(alias) === normalized)
  )?.role_id;
}

export function resolvePhaseId(input: string, phases: CanonicalPhase[]): string | undefined {
  const normalized = normalizeKey(input);
  return phases.find(
    (phase) =>
      normalizeKey(phase.phase_id) === normalized ||
      normalizeKey(phase.label) === normalized ||
      phase.aliases.some((alias) => normalizeKey(alias) === normalized)
  )?.phase_id;
}

export function getOntologyData(): OntologyData {
  if (_cache) return _cache;

  const ontology = loadOntologyYaml();
  const domainMapping: Record<string, string[]> = {};
  for (const [category, domains] of Object.entries(ontology.domain_mapping ?? {})) {
    if (Array.isArray(domains)) {
      domainMapping[category] = domains.filter((item): item is string => typeof item === "string");
    }
  }

  const concernsMap: Record<string, string[]> = {
    auth: ["AUT", "ACC", "SES"],
    logging: ["LOG"],
    validation: ["VAL", "ERR"],
    api: ["API"],
    config: ["CFG"],
    integrity: ["INT"],
    distribution: ["DST"],
    ide: ["IDE"],
    requirements: ["REQ"],
    architecture: ["ARC"],
    iac: ["IAC"],
    encryption: ["ENC"],
    // AI-agent / automation governance catalogue (REQ-AGN-001…004; Manual ch.02 addon 09;
    // consumer contract v1.10 §1.18). Consult-only concern — get_threat_landscape has no
    // domain chapter for it (ch.02 threats are requirements-process meta-threats).
    agents: ["AGN"],
  };

  const requirements: Requirement[] = loadRuntimeItems("data/publish/runtime/requirements.json")
    .filter(isRecord)
    .map((item) => {
      const levels = isRecord(item.applicable_levels) ? item.applicable_levels : {};
      return {
        requirement_id: strOf(item, "requirement_id"),
        type: strOf(item, "type"),
        category: strOf(item, "category"),
        name: strOf(item, "name"),
        ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
        applicable_levels: {
          L1: boolOf(levels, "L1"),
          L2: boolOf(levels, "L2"),
          L3: boolOf(levels, "L3"),
        },
        source_chapter: numOf(item, "source_chapter"),
        ...(strOf(item, "source_file") ? { source_file: strOf(item, "source_file") } : {}),
        ...(strOf(item, "source_bundle") ? { source_bundle: strOf(item, "source_bundle") } : {}),
        domain: typeof item.domain === "string" ? item.domain : null,
        evidence_types: arrStr(item, "evidence_types"),
      };
    })
    .filter((item) => item.requirement_id.length > 0);

  // Contract v1.10 §1.18 grammar (`REQ-<CAT>-NNN` | `<CAT>-NNN`) is the single source
  // (serving/requirement-id.ts). A published id outside it is SERVED AS PUBLISHED (never
  // dropped, never rewritten) and flagged on stderr for Codex — data fidelity over shape.
  for (const requirement of requirements) {
    if (!isRequirementId(requirement.requirement_id)) {
      console.error(
        `[ontology-loader] requirement_id "${requirement.requirement_id}" is outside the consumer-contract v1.10 §1.18 grammar — served as published; flag for Codex`
      );
    }
  }

  const controls: Control[] = loadRuntimeItems("data/publish/runtime/controls.json")
    .filter(isRecord)
    .map((item) => ({
      control_id: strOf(item, "control_id"),
      name: strOf(item, "name"),
      domain: strOf(item, "domain"),
      control_type: strOf(item, "control_type"),
      abstraction_level: strOf(item, "abstraction_level"),
      applicable_lifecycle_phases: arrStr(item, "applicable_lifecycle_phases"),
      chapter_ids: arrStr(item, "chapter_ids"),
      ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
      source_practice_ids: arrStr(item, "source_practice_ids"),
      artifact_types: arrStr(item, "artifact_types"),
    }))
    .filter((item) => item.control_id.length > 0);

  const practices: Practice[] = loadRuntimeItems("data/publish/runtime/practices.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      chapter_id: strOf(item, "chapter_id"),
      label: strOf(item, "label"),
      ...(strOf(item, "normalized_label")
        ? { normalized_label: strOf(item, "normalized_label") }
        : {}),
    }))
    .filter((item) => item.id.length > 0);

  const assignments: PracticeAssignment[] = loadRuntimeItems("data/publish/runtime/assignments.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      chapter_id: strOf(item, "chapter_id"),
      practice_id: strOf(item, "practice_id"),
      role: strOf(item, "role"),
      phase: strOf(item, "phase"),
      risk_level: strOf(item, "risk_level"),
      action: strOf(item, "action"),
      artifacts: arrStr(item, "artifacts"),
      ...(strOf(item, "user_story_id") ? { user_story_id: strOf(item, "user_story_id") } : {}),
      ...(strOf(item, "proportionality") ? { proportionality: strOf(item, "proportionality") } : {}),
    }))
    .filter((item) => item.id.length > 0);

  const userStories: UserStory[] = loadRuntimeItems("data/publish/runtime/user_stories.json")
    .filter(isRecord)
    .map((item) => ({
      ...(strOf(item, "id") ? { id: strOf(item, "id") } : {}),
      ...(strOf(item, "us_id") ? { us_id: strOf(item, "us_id") } : {}),
      title: strOf(item, "title"),
      ...(strOf(item, "chapter_id") ? { chapter_id: strOf(item, "chapter_id") } : {}),
      ...(strOf(item, "practice_id") ? { practice_id: strOf(item, "practice_id") } : {}),
      roles_normalized: arrStr(item, "roles_normalized"),
      related_roles: arrStr(item, "related_roles"),
      risk_levels: arrStr(item, "risk_levels"),
      ...(strOf(item, "acceptance_criteria")
        ? { acceptance_criteria: strOf(item, "acceptance_criteria") }
        : {}),
      bdd: arrStr(item, "bdd"),
      checklist_items: arrStr(item, "checklist_items"),
      ...(strOf(item, "goal") ? { goal: strOf(item, "goal") } : {}),
      ...(strOf(item, "summary") ? { summary: strOf(item, "summary") } : {}),
      ...(strOf(item, "document_path") ? { document_path: strOf(item, "document_path") } : {}),
    }))
    .filter((item) => item.title.length > 0);

  // Detail-on-demand join (consumer contract §"Serving — detail level"): enrich each
  // US with its proportionality (L1-L3) and SDLC integration, keyed by user_story_id.
  // The cheap index (guide-by-role stub) drops these via its own projection; only the
  // resolve/detail path surfaces them.
  const proportionalityByUs = new Map<string, { L1?: string; L2?: string; L3?: string }>();
  for (const item of loadRuntimeItemsOptional("data/entities/proportionality.json").filter(isRecord)) {
    const usId = strOf(item, "user_story_id");
    if (!usId) continue;
    proportionalityByUs.set(usId, {
      ...(strOf(item, "L1") ? { L1: strOf(item, "L1") } : {}),
      ...(strOf(item, "L2") ? { L2: strOf(item, "L2") } : {}),
      ...(strOf(item, "L3") ? { L3: strOf(item, "L3") } : {})
    });
  }
  const sdlcByUs = new Map<string, NonNullable<UserStory["sdlc_integration"]>>();
  for (const item of loadRuntimeItemsOptional("data/entities/sdlc_integration.json").filter(isRecord)) {
    const usId = strOf(item, "user_story_id");
    if (!usId) continue;
    const list = sdlcByUs.get(usId) ?? [];
    const phase = strOf(item, "phase_normalized") || strOf(item, "phase");
    const responsible = strOf(item, "responsible_normalized") || strOf(item, "responsible");
    list.push({
      ...(phase ? { phase } : {}),
      ...(strOf(item, "trigger") ? { trigger: strOf(item, "trigger") } : {}),
      ...(responsible ? { responsible } : {}),
      ...(strOf(item, "sla") ? { sla: strOf(item, "sla") } : {})
    });
    sdlcByUs.set(usId, list);
  }
  for (const us of userStories) {
    if (!us.id) continue;
    const prop = proportionalityByUs.get(us.id);
    if (prop && Object.keys(prop).length > 0) us.proportionality = prop;
    const sdlc = sdlcByUs.get(us.id);
    if (sdlc && sdlc.length > 0) us.sdlc_integration = sdlc;
  }

  const roles: CanonicalRole[] = loadRuntimeItems("data/publish/runtime/roles.json")
    .filter(isRecord)
    .map((item) => ({
      role_id: strOf(item, "role_id"),
      aliases: arrStr(item, "aliases"),
      canonical: item.canonical !== false,
      source: strOf(item, "source"),
    }))
    .filter((item) => item.role_id.length > 0);

  const phases: CanonicalPhase[] = loadRuntimeItems("data/publish/runtime/phases.json")
    .filter(isRecord)
    .map((item) => ({
      phase_id: strOf(item, "phase_id"),
      label: strOf(item, "label"),
      aliases: arrStr(item, "aliases"),
      canonical: item.canonical !== false,
      source: strOf(item, "source"),
    }))
    .filter((item) => item.phase_id.length > 0);

  const artifacts: Artifact[] = loadRuntimeItems("data/publish/runtime/artifacts.json")
    .filter(isRecord)
    .map((item) => ({
      artifact_type_id: strOf(item, "artifact_type_id"),
      name: strOf(item, "name"),
      canonical_aliases: arrStr(item, "canonical_aliases"),
      ...(strOf(item, "category") ? { category: strOf(item, "category") } : {}),
      lifecycle_phases: arrStr(item, "lifecycle_phases"),
      produced_by_controls: arrStr(item, "produced_by_controls"),
      validated_by_controls: arrStr(item, "validated_by_controls"),
    }))
    .filter((item) => item.artifact_type_id.length > 0);

  const artifactRequirements: ArtifactRequirement[] = loadRuntimeItems("data/publish/runtime/artifact_requirements.json")
    .filter(isRecord)
    .map((item) => ({
      artifact_type_id: strOf(item, "artifact_type_id"),
      requirement_id: strOf(item, "requirement_id"),
      source_control_ids: arrStr(item, "source_control_ids"),
      source_practice_ids: arrStr(item, "source_practice_ids"),
      mandatory: item.mandatory === true,
      chapter_ids: arrStr(item, "chapter_ids"),
      ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
    }))
    .filter((item) => item.artifact_type_id.length > 0 && item.requirement_id.length > 0);

  // Canonical threat surface = the v1 tripartition tier (consumer contract v1.3 §1.8):
  // the `threat_substantive` records of manual_threat_mitigation.jsonl. The legacy
  // runtime/threats.json is empty by design (superseded — its Manual-typed parser
  // does not match the Run-2 canon/50 format; the v1 tier is the live source).
  // Fall back to threats.json only for older bundles that still populate it.
  const v1ThreatRows = loadRuntimeJsonl("data/publish/runtime/v1/manual_threat_mitigation.jsonl").filter(
    (item) => strOf(item, "coverage_status") === "threat_substantive" && strOf(item, "threat_id").length > 0
  );
  const threatRows =
    v1ThreatRows.length > 0
      ? v1ThreatRows
      : loadRuntimeItems("data/publish/runtime/threats.json").filter(isRecord);

  const threats: Threat[] = threatRows
    .map((item) => {
      // threat_id (v1) | mitigated_threat_id (legacy); manual_chapter (v1) | chapter_id (legacy);
      // associated_controls is a single string in v1, an array in legacy.
      const id = strOf(item, "threat_id") || strOf(item, "mitigated_threat_id");
      const essence = strOf(item, "essence");
      const title = essence || strOf(item, "threat_label_raw");
      const chapter = strOf(item, "chapter_id") || strOf(item, "manual_chapter");
      const methodology = strOf(item, "methodology") || strOf(item, "methodology_label");
      const assocStr = strOf(item, "associated_controls");
      return {
        ...(id ? { id, mitigated_threat_id: id } : {}),
        ...(title ? { title, threat_label_raw: title } : {}),
        ...(essence ? { essence } : {}),
        ...(chapter ? { chapter_id: chapter } : {}),
        ...(strOf(item, "mitigation_summary")
          ? { mitigation_summary: strOf(item, "mitigation_summary") }
          : {}),
        ...(strOf(item, "how_it_arises") ? { how_it_arises: strOf(item, "how_it_arises") } : {}),
        ...(methodology ? { methodology } : {}),
        ...(strOf(item, "threat_category") ? { threat_category: strOf(item, "threat_category") } : {}),
        ...(strOf(item, "mitigation_strength")
          ? { mitigation_strength: strOf(item, "mitigation_strength") }
          : {}),
        canonical_control_ids: arrStr(item, "canonical_control_ids"),
        associated_controls: assocStr ? [assocStr] : arrStr(item, "associated_controls"),
      };
    })
    .filter((item) => item.id || item.mitigated_threat_id);

  // Anti-silent-0 guard: an empty threat surface is the failure that bit us (a
  // stale parser returning 0 with no error). Surface it loudly on stderr so it is
  // never silent again — the protocol reserves stdout for JSON-RPC.
  if (threats.length === 0) {
    process.stderr.write(
      "[ontology-loader] WARNING: threat surface is EMPTY — neither the v1 tier " +
        "(runtime/v1/manual_threat_mitigation.jsonl, threat_substantive) nor legacy " +
        "runtime/threats.json yielded threats. The consumed bundle may be incomplete.\n"
    );
  }

  const evidencePatterns: EvidencePattern[] = loadRuntimeItems("data/publish/runtime/evidence_patterns.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      maps_to_control_id: strOf(item, "maps_to_control_id"),
      maps_to_requirement_id: strOf(item, "maps_to_requirement_id"),
      ...(strOf(item, "evidence_expectation")
        ? { evidence_expectation: strOf(item, "evidence_expectation") }
        : {}),
      ...(strOf(item, "verification_logic")
        ? { verification_logic: strOf(item, "verification_logic") }
        : {}),
      expected_artifact_type_ids: arrStr(item, "expected_artifact_type_ids"),
    }))
    .filter((item) => item.id.length > 0);

  const requirementControlLinks: RequirementControlLink[] = loadRuntimeItems("data/publish/runtime/requirement_control_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      link_type: strOf(item, "link_type"),
      ...(typeof item.confidence === "number" ? { confidence: item.confidence } : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const signals: Signal[] = loadRuntimeItems("data/publish/runtime/signals.json")
    .filter(isRecord)
    .map((item) => ({
      signal_id: strOf(item, "signal_id") || strOf(item, "entity_id"),
      label: strOf(item, "label"),
      bundle_ids: arrStr(item, "bundle_ids"),
    }))
    .filter((item) => item.signal_id.length > 0);

  const signalEvidenceLinks: SignalEvidenceLink[] = loadRuntimeItems("data/publish/runtime/signal_evidence_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      ...(strOf(item, "target_source_basis")
        ? { target_source_basis: strOf(item, "target_source_basis") }
        : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const antipatterns: AntiPattern[] = loadRuntimeItems("data/publish/runtime/antipatterns.json")
    .filter(isRecord)
    .map((item) => ({
      antipattern_id: strOf(item, "antipattern_id") || strOf(item, "entity_id"),
      label: strOf(item, "label"),
      bundle_ids: arrStr(item, "bundle_ids"),
      ...(strOf(item, "risk") ? { risk: strOf(item, "risk") } : {}),
    }))
    .filter((item) => item.antipattern_id.length > 0);

  const antipatternRequirementLinks: AntiPatternRequirementLink[] = loadRuntimeItems("data/publish/runtime/antipattern_requirement_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const antipatternThreatLinks: AntiPatternThreatLink[] = loadRuntimeItems("data/publish/runtime/antipattern_threat_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      ...(strOf(item, "target_chapter_id")
        ? { target_chapter_id: strOf(item, "target_chapter_id") }
        : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  _cache = {
    domainMapping,
    concernsMap,
    requirements,
    controls,
    roles,
    threats,
    assignments,
    userStories,
    practices,
    phases,
    artifacts,
    artifactRequirements,
    evidencePatterns,
    requirementControlLinks,
    signals,
    signalEvidenceLinks,
    antipatterns,
    antipatternRequirementLinks,
    antipatternThreatLinks,
  };

  return _cache;
}

export function resolveRequirementBundle(requirement: Requirement): string | undefined {
  if (requirement.source_bundle && requirement.source_bundle.length > 0) {
    return requirement.source_bundle;
  }

  if (requirement.source_file) {
    const [bundle] = requirement.source_file.split("/", 1);
    if (bundle) return bundle;
  }

  if (!Number.isNaN(requirement.source_chapter)) {
    const padded = String(requirement.source_chapter).padStart(2, "0");
    return `${padded}-unknown`;
  }

  return undefined;
}

export function resolveThreatChapterNumber(threat: Threat): number {
  return typeof threat.chapter_id === "string" ? chapterNumber(threat.chapter_id) : NaN;
}
