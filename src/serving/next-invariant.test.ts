/**
 * 0.19.3 — INVARIANTE DE SUITE: todo o `next` é executável verbatim.
 *
 * Percorre os next de todos os builders (fixtures representativas) e dos payloads
 * reais dos handlers, e valida cada sugestão contra o schema REAL do destino
 * (tools/list do próprio servidor): a tool existe, os parâmetros nomeados existem,
 * valores com enum são válidos, tectos anunciados (≤N) têm verdade no schema, e
 * URIs só aparecem via read_sbd_toe_resource. Next inválido PARTE a suite.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import * as aff from "./affordances.js";
import type { Affordance } from "./protocol-envelope.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";
import { handleGetVerificationMatrix } from "../tools/get-verification-matrix.js";
import { handleTraceRequirementSources } from "../tools/trace-requirement-sources.js";
import { handleAssessImplementation } from "../tools/assess-implementation.js";
import { handleGetChapterImplementationChecklist } from "../tools/get-chapter-implementation-checklist.js";
import { handleGetOperatingModel } from "../tools/get-operating-model.js";
import { handleMapRegulatoryActivation } from "../tools/map-regulatory-activation.js";
import { handlePlanRollout } from "../tools/plan-rollout.js";
import { handlePlanRepoGovernance } from "../tools/plan-repo-governance.js";
import { handleMapSbdToeApplicability } from "../tools/structured-tools.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { handleGetGuideByRole } from "../tools/get-guide-by-role.js";
import { handleMapSbdToeReviewScope } from "../tools/map-review-scope.js";
import { handleListSbdToeChapters } from "../tools/structured-tools.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

type Prop = { enum?: string[]; maxItems?: number; type?: string };
type ToolSchema = { props: Record<string, Prop> };
const schemas: Record<string, ToolSchema> = {};
const universe = new Set<string>();
let server: ChildProcess | null = null;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build` antes da suite").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: { tools?: { name: string; inputSchema?: { properties?: Record<string, Prop> } }[] } }) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        pending.get(m.id)?.(m);
      } catch {
        /* logs vão para stderr; linhas parciais ignoram-se */
      }
    }
  });
  const rpc = (method: string, params: unknown) =>
    new Promise<{ result?: { tools?: { name: string; inputSchema?: { properties?: Record<string, Prop> } }[] } }>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "next-invariant", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = await rpc("tools/list", {});
  for (const tool of t.result?.tools ?? []) {
    const props = tool.inputSchema?.properties ?? {};
    schemas[tool.name] = { props };
    for (const k of Object.keys(props)) universe.add(k);
  }
  expect(Object.keys(schemas).length).toBeGreaterThan(20);
}, 20000);

afterAll(() => server?.kill());

function violations(a: Affordance, from: string): string[] {
  const out: string[] = [];
  const dest = schemas[a.tool];
  if (!dest) {
    out.push(`${from}: tool desconhecida ou URI no lugar da tool: "${a.tool}"`);
    return out;
  }
  const raw = a.with ?? "";
  if (raw.includes("sbd://") && a.tool !== "read_sbd_toe_resource")
    out.push(`${from} → ${a.tool}: URI no with sem nomear read_sbd_toe_resource`);
  // instrucionais fora: "(recomendado …)", placeholders <…>, elipses
  let stripped = raw.replace(/\(recomendado[^)]*\)/g, "");
  // sanitização multi-carácter por ponto-fixo (CodeQL js/incomplete-multi-character-sanitization)
  let prev: string;
  do {
    prev = stripped;
    stripped = stripped.replace(/"<[^>]*>"/g, "").replace(/<[^>]*>/g, "");
  } while (stripped !== prev);
  for (const m of stripped.matchAll(/(?:≤|<=)\s*(\d+)/g)) {
    const n = Number(m[1]);
    const truth = Object.entries(dest.props).some(([k, v]) => v.maxItems === n && stripped.includes(k));
    if (!truth) out.push(`${from} → ${a.tool}: tecto anunciado ≤${n} sem verdade no schema`);
  }
  for (const tok of stripped.split(/[^A-Za-z_]+/)) {
    if (tok && universe.has(tok) && !(tok in dest.props))
      out.push(`${from} → ${a.tool}: parâmetro "${tok}" não existe no destino`);
  }
  for (const m of stripped.matchAll(/([A-Za-z_]+)="([^"]*)"/g)) {
    const p = dest.props[m[1]];
    if (p?.enum && m[2] && !m[2].includes("…") && !p.enum.includes(m[2]))
      out.push(`${from} → ${a.tool}: ${m[1]}="${m[2]}" fora do enum [${p.enum.join("|")}]`);
  }
  return out;
}

function collectNext(payload: unknown, depth = 0): Affordance[] {
  if (depth > 3 || payload === null || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  const found: Affordance[] = [];
  if (Array.isArray(o["next"])) found.push(...(o["next"] as Affordance[]));
  for (const v of Object.values(o)) if (v && typeof v === "object" && !Array.isArray(v)) found.push(...collectNext(v, depth + 1));
  return found;
}

describe("invariante 0.19.3 — next executável verbatim", () => {
  it("todos os builders de affordances produzem sugestões válidas contra os schemas reais", () => {
    const many = Array.from({ length: 60 }, (_, i) => `VAL-${String(i + 1).padStart(3, "0")}`);
    const cases: [string, Affordance[]][] = [
      ["listChapters", aff.listChaptersAffordances()],
      ["mapApplicability", aff.mapApplicabilityAffordances("L2")],
      ["select(base)", aff.selectRequirementsAffordances("L2", ["VAL-001", "AUT-001", "ACC-001", "LOG-001"])],
      ["select(vazio+concerns)", aff.selectRequirementsAffordances("L2", [], ["auth", "integration", "validation", "secrets"])],
      ["select(>50)", aff.selectRequirementsAffordances("L3", many)],
      ["consult", aff.consultAffordances("L2", ["auth", "logging"])],
      ["chapterBrief", aff.chapterBriefAffordances("02")],
      ["chapterBrief(sem)", aff.chapterBriefAffordances(undefined)],
      ["queryEntities", aff.queryEntitiesAffordances()],
      ["resolveEntities", aff.resolveEntitiesAffordances()],
      ["guideByRole", aff.guideByRoleAffordances("L2", "developer")],
      ["threat", aff.threatLandscapeAffordances("L2", ["auth"])],
      ["threat(sem)", aff.threatLandscapeAffordances("L2", undefined)],
      ["planRepoGov", aff.planRepoGovernanceAffordances("L2")],
      ["reviewScope", aff.reviewScopeAffordances("L2")],
      ["prepare(ready)", aff.prepareCodegenAffordances("ready_for_codegen", ["VAL-001", "AUT-001", "ACC-001"])],
      ["prepare(ready,sem ids)", aff.prepareCodegenAffordances("ready_for_codegen")],
      ["prepare(decomp)", aff.prepareCodegenAffordances("needs_decomposition")],
      ["prepare(blocked)", aff.prepareCodegenAffordances("blocked_scope_too_broad")],
      ["generateSkill", aff.generateSkillAffordances()],
    ];
    const all: string[] = [];
    for (const [from, list] of cases) for (const a of list) all.push(...violations(a, from));
    expect(all, all.join("\n")).toEqual([]);
  });

  it("os next dos payloads reais dos handlers são válidos (fixtures; skips declarados)", () => {
    const fixtures: [string, () => unknown][] = [
      ["select", () => handleSelectRequirements({ risk_level: "L2", task: "Implementar login com sessões de utilizador" })],
      ["select(vazio)", () => handleSelectRequirements({ risk_level: "L2", task: "Cumprir as políticas internas de segurança da informação no módulo de clientes" })],
      ["consult", () => handleConsultSecurityRequirements({ risk_level: "L2", concerns: ["auth"] })],
      ["matrix", () => handleGetVerificationMatrix({ risk_level: "L2" })],
      ["trace", () => handleTraceRequirementSources({ requirement_ids: ["VAL-001"] })],
      ["assess", () => handleAssessImplementation({ risk_level: "L2" })],
      ["checklist", () => handleGetChapterImplementationChecklist({ chapter: "02" })],
      ["operatingModel", () => handleGetOperatingModel({})],
      ["regulatory", () => handleMapRegulatoryActivation({ framework: "GDPR" })],
      ["rollout", () => handlePlanRollout({})],
      ["planRepoGov", () => handlePlanRepoGovernance({ riskLevel: "L2" })],
      ["applicability", () => handleMapSbdToeApplicability({ riskLevel: "L2" })],
      ["threat", () => handleGetThreatLandscape({ risk_level: "L2" })],
      ["guide", () => handleGetGuideByRole({ risk_level: "L2", role: "developer" })],
      ["reviewScope", () => handleMapSbdToeReviewScope({ changedFiles: ["src/auth/login.ts"], riskLevel: "L2" })],
      ["listChapters", () => handleListSbdToeChapters({})],
      ["prepare", () => handlePrepareCodegenContext({ task: "Implementar login com sessões de utilizador", risk_level: "L2" })],
    ];
    const all: string[] = [];
    let validated = 0;
    const skipped: string[] = [];
    for (const [from, run] of fixtures) {
      let payload: unknown;
      try {
        payload = run();
      } catch (e) {
        skipped.push(`${from}: ${(e as Error).message.slice(0, 80)}`);
        continue;
      }
      for (const a of collectNext(payload)) {
        validated += 1;
        all.push(...violations(a, `payload:${from}`));
      }
    }
    // skips são declarados, nunca silenciosos — e o grosso tem de validar de facto.
    expect(skipped.length, `fixtures skipped: ${skipped.join(" | ")}`).toBeLessThanOrEqual(3);
    expect(validated).toBeGreaterThanOrEqual(25);
    expect(all, all.join("\n")).toEqual([]);
  });
});
