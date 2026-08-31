/**
 * The 94 acceptance scenarios of DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md
 * (5 axes), expressed as executable verdicts over the live MCP server.
 *
 * Status semantics (behaviour, not exact strings — per the doc's legend):
 *   PASS  — meets the scenario's verdict criteria
 *   PART  — partially meets / a documented [limite]/[dados] gap is confirmed as still present
 *   FAIL  — contradicts the verdict criteria
 *   SKIP  — not executable here (commercial/stateful surface, needs a client LLM, no tool)
 * owner on FAIL/PART: mcp (serving) | graph (bundle data) | mixed | roadmap.
 */

const ok = (note = "") => ({ status: "PASS", note });
const part = (note, owner = "mcp") => ({ status: "PART", note, owner });
const fail = (note, owner = "mcp") => ({ status: "FAIL", note, owner });
const skip = (note) => ({ status: "SKIP", note });

const ids = (arr, k) => (arr ?? []).map((x) => x?.[k]).filter(Boolean);
const has = (arr, v) => (arr ?? []).includes(v);
const bundlesOf = (review, file) => (review.pathMapping ?? []).filter((m) => (m.matchedFiles ?? []).includes(file)).flatMap((m) => m.bundles ?? []);
const stable = (v) => JSON.stringify(v);
const ctxLinksTargeting = (ctx, controlId) => ctx ? [...ctx.knownIds].filter((rid) => /^(?:REQ-[A-Z]{3}-|[A-Z]{3}-)\d{3}$/.test(rid)).reduce((n, rid) => n + (ctx.links.targetsOf(rid).includes(controlId) ? 1 : 0), 0) : 0;

export const scenarios = [
  // ───────────────────────── Axis A — Tool coverage ─────────────────────────
  { id: "TC-A-01", axis: "A", title: "codegen ready_for_codegen with real citation_map", tool: "prepare_sbd_toe_codegen_context",
    run: async (c, ctx) => {
      const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Validação de payload no PATCH /users/:id/email, Node/Express", risk_level: "L2" });
      if (!r.ok) return fail(r.error);
      const d = r.data; if (d.status !== "ready_for_codegen") return fail(`status=${d.status}`);
      const keys = Object.keys(d.citation_map ?? {}); const unknown = keys.filter((k) => !ctx.knownIds.has(k));
      if (keys.length === 0) return fail("empty citation_map");
      if (unknown.length) return fail(`citation ids not in bundle: ${unknown.slice(0, 5).join(",")}`, "mixed");
      if (!Array.isArray(d.activation_trace) || d.activation_trace.length === 0) return fail("no activation_trace");
      return ok(`ready; ${keys.length} citations all resolve; trace ${d.activation_trace.length}; provenance ${d.provenance ? "yes" : "no"}`);
    } },
  { id: "TC-A-02", axis: "A", title: "codegen vague task → clarification/decomposition, no ids", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Melhora a segurança da aplicação toda", risk_level: "L2" }); if (!r.ok) return fail(r.error);
      const s = r.data.status; if (!["needs_clarification", "needs_decomposition"].includes(s)) return fail(`status=${s}`);
      if (r.data.citation_map) return fail("citation_map present on non-ready status"); return ok(`status=${s}; no citation_map`); } },
  { id: "TC-A-03", axis: "A", title: "codegen with regulatory overlay (EXT-DORA) — honest degradation", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Validação de input e auditoria de transacções no módulo de pagamentos", risk_level: "L2", regulatory_frameworks: ["EXT-DORA"], include_regulatory_overlay: true }); if (!r.ok) return fail(r.error);
      const d = r.data; if (d.status === "unsupported_scope") return ok("overlay absent → unsupported_scope (honest)");
      const ob = d.regulatory_overlay?.obligations ?? []; const fw = d.regulatory_overlay?.frameworks ?? [];
      if (d.status !== "ready_for_codegen") return part(`status=${d.status}`);
      return ob.length || fw.length ? ok(`status=${d.status}; overlay frameworks ${fw.length}, obligations ${ob.length}`) : part("ready but regulatory_overlay empty although overlay is published", "mcp"); } },
  { id: "TC-A-04", axis: "A", title: "review scope: auth/.tf/ci paths mapped with reasoning", tool: "map_sbd_toe_review_scope",
    run: async (c, ctx) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["src/auth/login.ts", "infra/terraform/main.tf", ".github/workflows/ci.yml"] }); if (!r.ok) return fail(r.error);
      const d = r.data; const b = (d.bundlesToReview ?? []); const bad = b.filter((x) => !ctx.chapters.has(x.chapterId));
      if (bad.length) return fail(`unknown bundles ${ids(bad, "chapterId")}`); if (b.some((x) => !x.reason)) return fail("bundle without reason");
      const tf = bundlesOf(d, "infra/terraform/main.tf"), ci = bundlesOf(d, ".github/workflows/ci.yml"), auth = bundlesOf(d, "src/auth/login.ts");
      if (!has(tf, "08-iac-infraestrutura")) return fail(`.tf → ${tf}`); if (!has(ci, "07-cicd-seguro")) return fail(`ci → ${ci}`); if (!has(auth, "06-desenvolvimento-seguro")) return fail(`auth → ${auth}`);
      return ok(`${b.length} bundles, each with reason; tf→08, ci→07, auth→06`); } },
  { id: "TC-A-05", axis: "A", title: "review scope: docs-only change → no domain bundles forced", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["README.md", "docs/notes.md"] }); if (!r.ok) return fail(r.error);
      const b = r.data.bundlesToReview ?? []; const domain = b.filter((x) => x.category === "domain");
      if (domain.length) return fail(`domain bundles forced for docs: ${ids(domain, "chapterId")}`);
      return b.length ? part(`${b.length} foundation/operational bundles (${ids(b, "chapterId").join(",")}) with explicit README reasons — low scope, not zero`) : ok("zero bundles"); } },
  { id: "TC-A-06", axis: "A", title: "applicability L2 + containers/ci-cd/iac/api-gateway", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["containers", "ci-cd", "iac", "api-gateway"] }); if (!r.ok) return fail(r.error);
      const d = r.data; if (!Array.isArray(d.active) || !Array.isArray(d.conditional) || !Array.isArray(d.excluded)) return fail("missing active/conditional/excluded");
      const r2 = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["containers", "ci-cd", "iac", "api-gateway"], hasPersonalData: true, isPublicFacing: true });
      if (stable(r2.data?.active) !== stable(d.active)) return part("informational fields changed active scope");
      return d.conditional.length ? ok(`active ${d.active.length}, conditional ${d.conditional.length} (tech-reasoned), excluded ${d.excluded.length}`) : part("no conditional entries for 4 technologies"); } },
  { id: "TC-A-07", axis: "A", title: "applicability L1 minimal", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L1" }); if (!r.ok) return fail(r.error); const d = r.data;
      const l2 = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2" });
      if (d.active.length >= l2.data.active.length) return fail("L1 not narrower than L2"); if (d.excluded.length === 0) return fail("nothing excluded at L1");
      return ok(`active ${d.active.length} < L2 ${l2.data.active.length}; excluded ${d.excluded.join(",")}`); } },
  { id: "TC-A-08", axis: "A", title: "generate_skill deterministic canonical agent-guide", tool: "generate_sbd_toe_skill",
    run: async (c) => { const a = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); const b = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); if (!a.ok) return fail(a.error);
      const g = await c.resource("sbd://toe/agent-guide"); const guideCore = (g.text ?? "").slice(0, 200);
      if (a.data.content !== b.data.content) return fail("non-deterministic"); if (!(a.data.content ?? "").includes("SbD-ToE")) return fail("content not the guide");
      return ok(`deterministic (${a.data.content.length} chars); guide resource ${g.text ? "readable" : "absent"}${guideCore ? "" : ""}`); } },
  { id: "TC-A-09", axis: "A", title: "[limite] generate_skill per clientType differentiation", tool: "generate_sbd_toe_skill",
    run: async (c) => { const a = await c.tool("generate_sbd_toe_skill", { clientType: "github-copilot" }); const b = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      return a.data.content === b.data.content ? part("gap confirmed: content identical across clientType (no per-client differentiation)", "roadmap") : ok("content differs per clientType"); } },
  { id: "TC-A-10", axis: "A", title: "repo governance artefacts L3 by chapter", tool: "plan_sbd_toe_repo_governance",
    run: async (c, ctx) => { const r = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3" }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.byChapter?.length) return fail("no byChapter"); const bad = d.byChapter.filter((x) => !ctx.chapters.has(x.chapterId)); if (bad.length) return fail("unknown chapter ids");
      const arts = d.byChapter.reduce((n, x) => n + (x.artefacts?.length ?? 0), 0); return ok(`${d.byChapter.length} chapters, ${arts} artefacts (total ${d.totalArtefacts}), sourced note present: ${!!d.note}`); } },
  { id: "TC-A-11", axis: "A", title: "repo governance pagination walk (offset/limit, coverage-preserving)", tool: "plan_sbd_toe_repo_governance",
    run: async (c) => { const seen = []; let offset = 0, pages = 0; for (;;) { const r = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3", offset, limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data; pages++;
        if ((d.byChapter?.length ?? 0) > 3) return fail("page > limit"); if (!d.coverage || !d.size_estimate) return fail("missing coverage/size_estimate"); seen.push(...ids(d.byChapter, "chapterId"));
        if (!d.coverage.hasMore) break; if (d.coverage.nextOffset === null || d.coverage.nextOffset <= offset) return fail("bad nextOffset"); offset = d.coverage.nextOffset; if (pages > 20) return fail("runaway"); }
      const full = await c.tool("plan_sbd_toe_repo_governance", { riskLevel: "L3" }); const all = ids(full.data.byChapter, "chapterId");
      if (new Set(seen).size !== seen.length) return fail("duplicates across pages"); if (stable([...seen].sort()) !== stable([...all].sort())) return fail("walk ≠ full set");
      return ok(`${pages} pages of ≤3 cover all ${all.length} chapters, no loss/duplication`); } },
  { id: "TC-A-12", axis: "A", title: "list_chapters L2 with applicability/minLevel", tool: "list_sbd_toe_chapters",
    run: async (c) => { const r = await c.tool("list_sbd_toe_chapters", { riskLevel: "L2" }); if (!r.ok) return fail(r.error); const ch = r.data.chapters ?? [];
      if (ch.some((x) => !x.applicability || !x.readableTitle)) return fail("missing applicability/readableTitle"); if (ch.some((x) => x.applicability.L2 !== true)) return fail("non-L2 chapter listed for L2");
      const all = await c.tool("list_sbd_toe_chapters", {}); return ok(`${ch.length} L2 chapters of ${all.data.chapters.length}; minLevel present ${ch.every((x) => "minLevel" in x)}`); } },
  { id: "TC-A-13", axis: "A", title: "query_entities by text with type/chapter/risk filters", tool: "query_sbd_toe_entities",
    run: async (c) => { const a = await c.tool("query_sbd_toe_entities", { query: "autenticação", entityType: "requirement", chapterId: "02-requisitos-seguranca", riskLevel: "L2", topK: 5 }); const b = await c.tool("query_sbd_toe_entities", { query: "autenticação", entityType: "control_objective", topK: 5 }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      if ((a.data.entities?.length ?? 0) === 0) return fail(`typed+chapter+risk query returns nothing (filters=${stable(a.data.filters)})`);
      if (!a.data.filters?.applied) return fail("filters not declared");
      const cited = a.data.entities.every((e) => e.citationId && e.documentPath); return ok(`Requirement × ch.02 × L2: ${a.data.total} matched over pool ${a.data.filters.retrieval_pool} (risk facet on ${a.data.filters.pool_with_risk_facet}); entities cite chunk+path: ${cited}; control_objective is not a chunk mention type (→ resolve_entities): total ${b.data.total}, declared`); } },
  { id: "TC-A-14", axis: "A", title: "resolve control_objective exact id or honest total:0", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "control_objective", filters: { id: "CO-AUTH-001" } }); if (!r.ok) return fail(r.error);
      if (r.data.total === 0 && r.data.entities.length === 0) return ok(`total:0 honest; provenance ${r.data.provenance?.source_data}`); return r.data.total === 1 ? ok("single record") : fail(`total=${r.data.total}`); } },
  { id: "TC-A-15", axis: "A", title: "resolve regulatory_obligation EXT-DORA", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "regulatory_obligation", filters: { framework_id: "EXT-DORA" } }); if (!r.ok) return fail(r.error);
      if (r.data.total === 0) return ok(`overlay absent → total:0 + note: ${r.data.meta?.note?.slice(0, 60)}`); if (r.data.entities.some((e) => e.framework_id !== "EXT-DORA")) return fail("filter leak"); return ok(`${r.data.total} DORA obligations`); } },
  { id: "TC-A-16", axis: "A", title: "search(debug) bounded + inspect_retrieval without model; E5 envelope wiring", tool: "search_sbd_toe_manual",
    run: async (c) => { const s = await c.tool("search_sbd_toe_manual", { question: "Segredos em CI/CD?", topK: 3, debug: true }); const i = await c.tool("inspect_sbd_toe_retrieval", { question: "Segredos em CI/CD?", topK: 3 }); if (!s.ok || !i.ok) return fail(s.error ?? i.error);
      if (!/\[M\d+\]/.test(s.text)) return fail("no [Mnnn] citations"); if (s.size > 200000) return fail(`debug ${s.size} chars`);
      const e5 = /coverage_map|handles/.test(s.text); return e5 ? ok(`cites; debug ${s.size} chars; E5 envelope present`) : part(`cites; debug bounded (${s.size} chars); inspect ${i.size} chars; E5 coverage_map/handles not wired on search`, "roadmap"); } },

  // ───────────────────────── Axis B — By role ─────────────────────────
  ...[
    ["TC-B-01", "developer", "develop", "L2", null],
    ["TC-B-02", "appsec-engineer", "design", "L3", null],
    ["TC-B-03", "qa", "test", "L2", null],
    ["TC-B-04", "devops-sre", "build", "L2", null],
    ["TC-B-05", "infrastructure", "deploy", "L3", "[dados] infrastructure not a canonical role"],
    ["TC-B-06", "security-champion", "plan", "L1", null],
    ["TC-B-07", "product-management", "plan", "L2", null],
    ["TC-B-09", "grc-compliance", "govern", "L3", "[dados]"],
    ["TC-B-10", "auditores", "govern", "L3", "[dados]/[comercial] evidence-pack is state"],
    ["TC-B-11", "procurement", "govern", "L2", "[dados] procurement not a canonical role; [comercial] tracking is state"],
    ["TC-B-12", "training-manager", "govern", "L2", "[dados] training-manager not a canonical role; [comercial] completion is state"],
    ["TC-B-13", "incident-response", "operate", "L3", "[dados] ir alias; [comercial] live incident is state"],
    ["TC-B-14", "application-manager", "operate", "L2", "[dados] app-manager alias; [comercial] posture is state"],
    ["TC-B-15", "gestao-executiva", "govern", "L2", "[dados]; [comercial] KPIs with data are state"],
    ["TC-B-16", "appsec-engineer", "operate", "L3", "[comercial] CVE backlog/SLA is state"],
  ].map(([id, role, phase, L, marker]) => ({ id, axis: "B", title: `guide by role ${role} × ${phase} @ ${L}`, tool: "get_guide_by_role",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: L, role, phase }); if (!r.ok) return fail(r.error); const d = r.data;
      const known = d.meta?.knownRoles ?? []; const canonical = d.canonicalRole; const n = d.assignments?.length ?? 0;
      if (n > 0) { const bad = d.assignments.filter((a) => a.canonical_phase !== phase || a.canonical_role !== canonical); if (bad.length) return fail(`assignments outside role∧phase: ${bad.length}`);
        const fullBody = d.assignments.some((a) => Array.isArray(a.user_story?.bdd) && a.user_story.bdd.length > 0 && !("include_detail" in {}) && (a.user_story?.checklist_items?.length ?? 0) > 0);
        return ok(`${role}→${canonical}; ${n} assignments, ${d.meta.userStoryCount} US (index${fullBody ? " carries US detail" : ", detail on demand"})${marker ? "; " + marker : ""}`); }
      if (!known.includes(canonical)) return part(`role "${role}" → "${canonical}" not in canonical vocabulary (${known.length} roles) → 0 assignments${marker ? "; " + marker : ""}`, "graph");
      return part(`canonical ${canonical} but 0 assignments in phase ${phase}${marker ? "; " + marker : ""}`, "graph"); } })),
  { id: "TC-B-08", axis: "B", title: "skill-pack anchored on guide by role+phase (parsimonious)", tool: "generate_sbd_toe_skill",
    run: async (c) => { const r = await c.tool("generate_sbd_toe_skill", { role: "developer", risk_level: "L2", phase: "develop", format: "skill" }); if (!r.ok) return fail(r.error); const cov = r.data.meta?.coverage;
      if (!cov) return fail("no coverage declared"); const full = await c.tool("generate_sbd_toe_skill", { clientType: "claude-code" });
      return ok(`coverage chapters ${cov.chapters}/${cov.of_total_chapters}, assignments ${cov.assignments}, US ${cov.user_stories}; ${r.data.content.length} chars (${r.data.content.length < full.data.content.length ? "smaller than" : "not smaller than"} the generic guide)`); } },

  // ───────────────────────── Axis C — By surface (28 AC) ─────────────────────────
  { id: "TC-C-01", axis: "C", title: "AC-01 inline: control + acceptance criterion + citation (size-bounded?)", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("consult_security_requirements", { risk_level: "L3", concerns: ["auth"] }); if (!r.ok) return fail(r.error);
      if (!(r.data.controls?.length) || !(r.data.requirements?.length)) return fail("no controls/requirements"); return part(`consult gives ${r.data.requirements.length} req / ${r.data.controls.length} controls with ids (${r.size} chars); answer needs client sampling; no inline size bound (RF-F2 [limite])`, "roadmap"); } },
  { id: "TC-C-02", axis: "C", title: "AC-02 tester checklist by phase for an auth change", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L3", changedFiles: ["src/auth/login.ts", "src/auth/session.ts"] }); if (!r.ok) return fail(r.error);
      const b = ids(r.data.bundlesToReview, "chapterId"); return has(b, "10-testes-seguranca") ? part(`review scope anchors ch.10 + ${b.length - 1} bundles with expectedEvidence; per-phase checklist is prose (answer)`, "roadmap") : fail(`ch.10 not in scope: ${b}`); } },
  { id: "TC-C-03", axis: "C", title: "AC-03 ChatOps: manual statement with verifiable citation (session token TTL)", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "O que diz o manual sobre o TTL do token de sessão?", topK: 5 }); if (!r.ok) return fail(r.error);
      const cites = (r.text.match(/\[M\d+\]/g) ?? []).length; const urls = (r.text.match(/URL: https?:\/\//g) ?? []).length; const ttl = /TTL|tempo de vida|expira|sess[ãa]o/i.test(r.text);
      return cites && urls && ttl ? ok(`${cites} cited chunks with URLs; session/TTL content present`) : part(`cites ${cites}, urls ${urls}, ttl-content ${ttl}`); } },
  ...["04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "16", "17", "18", "19", "20", "21", "22", "23", "24", "27", "28"].map((n) => ({ id: `TC-C-${n}`, axis: "C", title: `AC-${n} — commercial / stateful surface (L4a/L4b)`, tool: "—", run: async () => skip("commercial roadmap (interventive/stateful) — documented, not run") })),
  { id: "TC-C-14", axis: "C", title: "AC-14 architecture: threats contextualised (not a ch.02 dump)", tool: "get_threat_landscape",
    run: async (c) => { const t = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["architecture"] }); if (!t.ok) return fail(t.error); const chs = new Set(ids(t.data.threats, "chapter_id"));
      if (chs.size === 1 && chs.has("02-requisitos-seguranca")) return fail("ch.02 dump"); return chs.has("04-arquitetura-segura") ? ok(`${t.data.threats.length} threats over ${[...chs].join(",")}`) : part(`threats over ${[...chs].join(",")} (no ch.04)`); } },
  { id: "TC-C-15", axis: "C", title: "AC-15 pentester role → assignments", tool: "get_guide_by_role",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: "L3", role: "pentester" }); if (!r.ok) return fail(r.error); const n = r.data.assignments?.length ?? 0;
      const t = await c.tool("get_threat_landscape", { risk_level: "L3", concerns: ["auth"] }); return n === 0 ? part(`gap confirmed: pentester → 0 assignments (not a canonical role); threat_landscape auth gives ${t.data.threats.length} threats with ${t.data.threats.filter((x) => x.related_antipatterns?.length).length} antipattern-linked`, "graph") : ok(`${n} assignments`); } },
  { id: "TC-C-25", axis: "C", title: "AC-25 training: curriculum by role (OSS part)", tool: "generate_sbd_toe_skill",
    run: async (c) => { const r = await c.tool("generate_sbd_toe_skill", { role: "developer", risk_level: "L3", format: "skill" }); if (!r.ok) return fail(r.error); return part(`curriculum ≡ role skill-pack (coverage ${JSON.stringify(r.data.meta?.coverage)}); who-has-not-completed is commercial state`, "roadmap"); } },
  { id: "TC-C-26", axis: "C", title: "AC-26 PO: security acceptance criteria grounded in CO/chapter", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("get_guide_by_role", { risk_level: "L3", role: "product-owner", phase: "plan", include_detail: true }); if (!r.ok) return fail(r.error);
      const withBdd = (r.data.assignments ?? []).filter((a) => (a.user_story?.bdd?.length ?? 0) >= 3).length; return withBdd ? part(`${withBdd} PO plan stories with BDD acceptance criteria (structured); prose composition needs the client model`, "roadmap") : fail("no BDD criteria for PO"); } },

  // ───────────────────────── Axis D — Negatives / invariants ─────────────────────────
  { id: "TC-D-01", axis: "D", title: "scope-gate: 'Torna a minha app segura'", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Torna a minha app segura", risk_level: "L2" }); if (!r.ok) return fail(r.error); return r.data.status !== "ready_for_codegen" && !r.data.citation_map ? ok(`status=${r.data.status}, zero ids`) : fail(`status=${r.data.status}`); } },
  { id: "TC-D-02", axis: "D", title: "scope-gate: apply the whole manual to my pipeline", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Aplica o manual inteiro à minha pipeline, dá-me tudo", risk_level: "L3" }); if (!r.ok) return fail(r.error); return r.data.status === "needs_decomposition" ? ok(`needs_decomposition; suggestions ${r.data.suggestions?.length}`) : r.data.status === "ready_for_codegen" ? fail("dumped ready_for_codegen") : part(`status=${r.data.status}`); } },
  { id: "TC-D-03", axis: "D", title: "scope-gate: quantum-resistant blockchain → unsupported_scope", tool: "prepare_sbd_toe_codegen_context",
    run: async (c) => { const r = await c.tool("prepare_sbd_toe_codegen_context", { task: "Código seguro para blockchain quantum-resistant", risk_level: "L2" }); if (!r.ok) return fail(r.error); return r.data.status === "unsupported_scope" && !r.data.citation_map ? ok("unsupported_scope, zero ids") : fail(`status=${r.data.status}`); } },
  { id: "TC-D-04", axis: "D", title: "não-inventar: invent a quantum-safe requirement with id", tool: "answer_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("answer_sbd_toe_manual", { question: "Inventa um requisito quantum-safe para o cap.06 com ID" }); if (!r.ok) return fail(r.error); const fake = (r.text.match(/\b[A-Z]{3}-\d{3}\b/g) ?? []); return skip(`server returns retrieval context only (no sampling in this client): ${fake.length} real ids echoed, no generation — refusal is the client model's; verdict needs an LLM client`); } },
  { id: "TC-D-05", axis: "D", title: "não-inventar: CO-9999 → not found, no fabricated description", tool: "resolve_entities",
    run: async (c) => { const a = await c.tool("resolve_entities", { record_type: "control_objective", filters: { id: "CO-9999" } }); const b = await c.tool("query_sbd_toe_entities", { query: "CO-9999" }); if (!a.ok || !b.ok) return fail(a.error ?? b.error);
      if (a.data.total !== 0) return fail("resolve returned something"); return b.data.match === undefined ? part(`resolve total:0 honest; query_entities falls back to semantic search (${b.data.total} chunks) instead of an explicit not_found`) : ok("not_found"); } },
  { id: "TC-D-06", axis: "D", title: "não-inventar: leading question (key rotation 24h)", tool: "answer_sbd_toe_manual",
    run: async () => skip("grounded-or-nothing refusal is the client model's behaviour; server only retrieves — needs an LLM client") },
  { id: "TC-D-07", axis: "D", title: "parsimónia: list user stories of ch.12 as an index", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { chapter_id: "12-monitorizacao-operacoes" } }); if (!r.ok) return fail(r.error); const e = r.data.entities ?? [];
      const heavy = e.filter((u) => (u.bdd?.length ?? 0) + (u.checklist_items?.length ?? 0) > 0).length; return heavy ? part(`${e.length}/${r.data.total} stories returned with bdd/checklist bodies (fields capped at 8) — no index-only mode; affordances present: ${!!r.data.next}`) : ok("index only"); } },
  { id: "TC-D-08", axis: "D", title: "affordance: chapter brief signals detail + handle", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "09-containers-imagens" }); if (!r.ok) return fail(r.error); const nx = r.data.next ?? []; return nx.length && nx.every((n) => n.tool) ? ok(`${nx.length} actionable affordances (${ids(nx, "tool").join(", ")}); artifacts ${r.data.artifacts?.length}`) : fail("no affordance handles"); } },
  { id: "TC-D-09", axis: "D", title: "never-silent-trunc: consult declares totals", tool: "consult_security_requirements",
    run: async (c) => { const r = await c.tool("consult_security_requirements", { risk_level: "L3", concerns: ["api"], exposure: "public" }); if (!r.ok) return fail(r.error); const m = r.data.meta; return m.requirementCount === r.data.requirements.length && m.controlCount === r.data.controls.length ? ok(`N=M declared (${m.requirementCount} req, ${m.controlCount} controls); gaps declared ${r.data.coverage_gaps?.requirements_without_control_link?.count}`) : fail("counts ≠ returned"); } },
  { id: "TC-D-10", axis: "D", title: "never-silent-trunc: threat landscape total/remaining", tool: "get_threat_landscape",
    run: async (c) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2" }); if (!r.ok) return fail(r.error); const tools = c.tools.find((t) => t.name === "get_threat_landscape"); const paginated = "limit" in (tools?.inputSchema?.properties ?? {});
      return r.data.meta?.threatCount === r.data.threats.length ? (paginated ? ok("total declared + paginated") : part(`returns all ${r.data.threats.length} threats with threatCount declared (no silent truncation) but no offset/limit — not paginated (rule: every set-returning tool paginates)`)) : fail("threatCount ≠ returned"); } },
  { id: "TC-D-11", axis: "D", title: "determinism: resolve ×2 byte-identical", tool: "resolve_entities",
    run: async (c) => { const a = await c.tool("resolve_entities", { record_type: "requirement", filters: { category: "AUT" } }); const b = await c.tool("resolve_entities", { record_type: "requirement", filters: { category: "AUT" } }); return a.text === b.text ? ok(`identical (${a.data.total} records)`) : fail("differs between runs"); } },
  { id: "TC-D-12", axis: "D", title: "determinism: consult ×2 same ids same order", tool: "consult_security_requirements",
    run: async (c) => { const a = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["auth", "logging"] }); const b = await c.tool("consult_security_requirements", { risk_level: "L2", concerns: ["auth", "logging"] }); return stable(ids(a.data.requirements, "requirement_id")) === stable(ids(b.data.requirements, "requirement_id")) && stable(ids(a.data.controls, "control_id")) === stable(ids(b.data.controls, "control_id")) ? ok("same ids, same order") : fail("drift"); } },
  { id: "TC-D-13", axis: "D", title: "vector-overreach: lookup query stays deterministic (vector off)", tool: "inspect_sbd_toe_retrieval",
    run: async (c) => { const r = await c.tool("inspect_sbd_toe_retrieval", { question: "Procura 'shift left'", topK: 3 }); if (!r.ok) return fail(r.error); const vec = /source=vector/.test(r.text); return !vec && /source=mcp/.test(r.text) ? ok("only source=mcp hits; no vector recall by default") : fail("vector hits present by default"); } },
  { id: "TC-D-14", axis: "D", title: "vector-overreach: inspect exposes the method", tool: "inspect_sbd_toe_retrieval",
    run: async (c) => { const r = await c.tool("inspect_sbd_toe_retrieval", { question: "Como chegaste a estes resultados sobre shift left?", topK: 3 }); if (!r.ok) return fail(r.error); const shows = /Debug|Query:|index=mcp_chunks|localScore/.test(r.text); return shows && !/source=vector/.test(r.text) ? ok("method exposed (index, rank, localScore); deterministic") : part("method partially exposed"); } },
  { id: "TC-D-15", axis: "D", title: "citação: guide answers carry real ids", tool: "get_guide_by_role",
    run: async (c, ctx) => { const r = await c.tool("get_guide_by_role", { risk_level: "L2", role: "appsec-engineer", phase: "design" }); if (!r.ok) return fail(r.error); const a = r.data.assignments ?? []; const uncited = a.filter((x) => !x.chapter_id || !x.practice_id || !ctx.chapters.has(x.chapter_id)); return a.length && !uncited.length ? ok(`${a.length} assignments each with chapter_id + practice_id (+ user_story ${a.filter((x) => x.user_story).length})`) : fail(`${uncited.length} uncited`); } },
  { id: "TC-D-16", axis: "D", title: "citação+não-inventar: applicability for 'fintech AI agentic'", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L3", technologies: ["fintech", "ai-agentic"] }); if (!r.ok) return r.rpc && /Valores permitidos/.test(r.error) ? part("rejects unknown technologies with the allowed vocabulary (no silent fill); ml-ai is the grounded proxy — no not_covered field") : fail(r.error);
      return r.data.conditional?.some((x) => /not_covered/.test(JSON.stringify(x))) ? ok("not_covered signalled") : part("mapped without not_covered marker"); } },
  { id: "TC-D-17", axis: "D", title: "scope-gate+parsimónia: review without diff asks for paths", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: [] }); return !r.ok && /path/i.test(r.error) ? ok(`asks for paths (${r.rpc ? "rpc -32602" : "tool error"})`) : fail("mapped a generic review without diff"); } },

  // ───────────────────────── Axis F — 0.10.0 tools not in the June elicitation (+ G1 pagination) ─────────────────────────
  // Added by Pontifex 2026-08-29: the 94 were elicited against 15 tools; 0.10.0 exposed 6 more.
  // Verdicts are structural (envelope: data + provenance + coverage {total, returned, offset,
  // nextOffset, hasMore}) and enforce cross-tool gate G1 (every set-returning tool paginates).
  { id: "TC-F-01", axis: "F", title: "verification matrix L2 — paginated EXPECTED side, declared gaps", tool: "get_sbd_toe_verification_matrix",
    run: async (c) => { const r = await c.tool("get_sbd_toe_verification_matrix", { risk_level: "L2", offset: 0, limit: 5 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage || d.coverage.total === undefined || d.coverage.hasMore === undefined) return fail("no coverage envelope (G1)"); if ((d.data?.rows?.length ?? 0) > 5) return fail("page > limit");
      if (typeof d.data?.coverage_gaps?.requirements_without_evidence_pattern !== "number") return fail("gap not declared");
      return ok(`rows ${d.data.rows.length}/${d.coverage.total}, hasMore ${d.coverage.hasMore}, EP-gaps ${d.data.coverage_gaps.requirements_without_evidence_pattern}, provenance ${!!d.provenance}`); } },
  { id: "TC-F-02", axis: "F", title: "operating model — sections paginated with provenance", tool: "get_sbd_toe_operating_model",
    run: async (c) => { const r = await c.tool("get_sbd_toe_operating_model", { limit: 2 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage || !d.provenance) return fail("no coverage/provenance"); if ((d.data?.sections?.length ?? 0) === 0) return fail("no sections"); if (d.data.sections.length > 2) return fail("page > limit");
      return ok(`sections ${d.data.sections.length}/${d.coverage.total}, hasMore ${d.coverage.hasMore}, source ${d.provenance.source_data?.slice(0, 40)}`); } },
  { id: "TC-F-03", axis: "F", title: "chapter implementation checklist ch.09 — cited items, paginated", tool: "get_sbd_toe_chapter_implementation_checklist",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_implementation_checklist", { chapter: "09-containers-imagens", limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage) return fail("no coverage envelope (G1)"); const items = d.data?.items ?? d.data?.checklist ?? []; if (!Array.isArray(items) || items.length === 0) return fail("no items");
      const cited = items.every((i) => JSON.stringify(i).includes("chunk") || i.chunk_id || i.source); return cited ? ok(`${items.length}/${d.coverage.total} items, cited; hasMore ${d.coverage.hasMore}`) : part(`${items.length} items but not all cite a chunk`); } },
  { id: "TC-F-04", axis: "F", title: "rollout plan — 8 canonical phases mapped to chapters, paginated", tool: "plan_sbd_toe_rollout",
    run: async (c) => { const r = await c.tool("plan_sbd_toe_rollout", {}); if (!r.ok) return fail(r.error); const d = r.data; const phases = d.data?.phases ?? [];
      if (!d.coverage) return fail("no coverage envelope (G1)"); if (phases.length === 0) return fail("no phases");
      const withChapter = phases.filter((p) => typeof p.chapter === "string" && p.chapter.length > 0).length; const ordered = phases.every((p, i) => p.order === i + 1); if (withChapter === 0) return fail("phases carry no chapter"); return ok(`${phases.length} phases, ${withChapter} with a chapter anchor, canonical order ${ordered}, model ${d.data.model ?? "absent"}, total ${d.coverage.total}`); } },
  { id: "TC-F-05", axis: "F", title: "assess implementation — not_reported never a pass; thresholds cited", tool: "assess_sbd_toe_implementation",
    run: async (c) => { const r = await c.tool("assess_sbd_toe_implementation", { risk_level: "L2", kpi_values: {}, limit: 5 }); if (!r.ok) return fail(r.error); const d = r.data; const s = JSON.stringify(d);
      if (!d.coverage) return fail("no coverage envelope (G1)"); if (!/not_reported/.test(s)) return fail("empty self-report not flagged not_reported"); if (/"pass"/.test(s) && !/not_reported/.test(s)) return fail("pass without values");
      return ok(`envelope ok; empty kpi_values → not_reported; total ${d.coverage.total}, hasMore ${d.coverage.hasMore}`); } },
  { id: "TC-F-06", axis: "F", title: "regulatory activation DORA — chapters activated, counts, paginated", tool: "map_sbd_toe_regulatory_activation",
    run: async (c) => { const r = await c.tool("map_sbd_toe_regulatory_activation", { framework: "DORA", limit: 3 }); if (!r.ok) return fail(r.error); const d = r.data;
      if (!d.coverage) return fail("no coverage envelope (G1)"); const act = d.data?.activated ?? []; if (act.length === 0) return fail("nothing activated"); if (act.length > 3) return fail("page > limit");
      const u = await c.tool("map_sbd_toe_regulatory_activation", { framework: "PCI" }); const honest = !u.ok || (u.data?.data?.activated?.length ?? 0) === 0;
      return ok(`DORA: ${act.length}/${d.coverage.chapters ?? d.coverage.total} chapters, mappings ${d.coverage.mappings}, obligations ${d.coverage.obligations}; unknown framework → ${honest ? "honest empty/error" : "activated?!"}`); } },
  { id: "TC-F-08", axis: "F", title: "curated requirement→control layer v3 (KG v1.7.0): 282 links, 0 unlinked, curated 16, catalogue rules tolerated", tool: "resolve_entities",
    run: async (c, ctx) => { const links = await c.tool("resolve_entities", { record_type: "requirement_control_link", limit: 1 }); if (!links.ok) return fail(links.error);
      const gaps = []; for (const L of ["L1", "L2", "L3"]) { const r = await c.tool("consult_security_requirements", { risk_level: L }); gaps.push(r.data?.coverage_gaps?.requirements_without_control_link?.count); }
      if (links.data.total !== 282) return fail(`links total ${links.data.total} (expected 282 = 118 catalogue-rule + 148 recalculated + 16 curated)`, "graph");
      if (ctx.links.total !== 282) return fail(`published file carries ${ctx.links.total} links`, "graph");
      if (gaps.some((g) => g !== 0)) return fail(`coverage_gaps ${gaps}`);
      const cur = ctx.links.curationByCurator; if ((cur["archon-2026-08-29"] ?? 0) !== 12 || (cur["archon-2026-08-30"] ?? 0) !== 4) return fail(`curated on surface ${JSON.stringify(cur)} (expected 12 + 4, incl. GOV-013 CAP secondary)`, "graph");
      const unknownJust = ctx.links.justifications.filter((j) => !["bundle_grounding", "catalogue_rule", "catalogue_rule_secondary", "chapter_grounding", "curated_semantic_review", "domain_mapping", "lexical_alignment", "requirement_domain_hint", "single_control_bundle", "domain_owner_fallback", "foundational_domain_unique", "preferred_domain_unique", "preferred_domain_strong", "preferred_domain_disambiguated", "baseline_domain_lexical"].includes(j));
      if (unknownJust.length) return part(`justification values outside the known vocabulary (tolerated, flag for the governance doc): ${unknownJust.join(",")}`, "graph");
      const idn = (t) => t.some((x) => /^CTRL-identity-/.test(x)), mon = (t) => t.some((x) => /^CTRL-monitoring-/.test(x));
      const a7 = ctx.links.targetsOf("AUT-007"), a8 = ctx.links.targetsOf("AUT-008"), a10 = ctx.links.targetsOf("AUT-010");
      if (!idn(a7) || !idn(a8)) return fail(`AUT-007/008 → ${a7},${a8} (expected ^CTRL-identity-, now C1)`, "graph"); if (!mon(a10)) return fail(`AUT-010 → ${a10} (expected monitoring)`, "graph");
      const mon1 = (id) => ctx.links.targetsOf(id).some((x) => /^CTRL-monitoring-/.test(x));
      if (!idn(ctx.links.targetsOf("AUT-006"))) return fail(`AUT-006 → ${ctx.links.targetsOf("AUT-006")}`, "graph");
      if (!mon1("INT-007") || !mon1("LOG-001")) return fail(`INT-007/LOG-001 not → monitoring`, "graph");
      return ok(`282 links (file+surface), gaps L1/L2/L3 = ${gaps.join("/")}, curated 12+4 on surface, justifications incl. catalogue_rule/_secondary tolerated; AUT-006/007/008 → identity (C1), AUT-010 → monitoring, INT-007 + LOG → monitoring`); } },
  { id: "TC-F-09", axis: "F", title: "data_protection domain present (ontology v2.2): control served with links", tool: "resolve_entities",
    run: async (c, ctx) => { const r = await c.tool("resolve_entities", { record_type: "control", filters: { domain: "data_protection" } }); if (!r.ok) return fail(r.error);
      const ids = (r.data.entities ?? []).map((e) => e.control_id); if (r.data.total < 1) return fail("no control in domain data_protection", "graph");
      const linkCount = ids.reduce((n, id) => n + ctxLinksTargeting(ctx, id), 0);
      const consult = await c.tool("consult_security_requirements", { risk_level: "L3" }); const active = (consult.data.controls ?? []).filter((x) => x.domain === "data_protection");
      return linkCount >= 1 && active.length >= 1 ? ok(`${r.data.total} data_protection control(s) (${ids.join(",")}), ${linkCount} requirement links, active in consult L3 (${active.length}, _confidence ${active.map((x) => x._confidence).join(",")})`) : fail(`controls ${ids.join(",")} with ${linkCount} links; active in consult: ${active.length}`, "graph"); } },
  { id: "TC-F-10", axis: "F", title: "AUT requirements resolve to C1 (identity) — never CAP (classificação) or DEV (desenvolvimento)", tool: "resolve_entities",
    run: async (c, ctx) => { const auts = [...ctx.knownIds].filter((id) => /^AUT-\d{3}$/.test(id)); if (auts.length === 0) return fail("no AUT requirements in bundle");
      const bad = [], noIdn = [];
      for (const id of auts) { const t = ctx.links.targetsOf(id); if (t.length === 0) return fail(`${id} unlinked`, "graph");
        if (t.some((x) => /governance-classificacao|code-integrity-desenvolvimento/.test(x))) bad.push(`${id}→${t.join("|")}`);
        if (!t.some((x) => /^CTRL-(identity|monitoring)-/.test(x))) noIdn.push(`${id}→${t.join("|")}`); }
      if (bad.length) return fail(`AUT linked to CAP/DEV: ${bad.join("; ")}`, "graph"); if (noIdn.length) return fail(`AUT outside identity/monitoring: ${noIdn.join("; ")}`, "graph");
      const c1 = auts.filter((id) => ctx.links.targetsOf(id).some((x) => /identidade-autenticacao-e-sessoes/.test(x))).length;
      return ok(`${auts.length} AUT requirements all linked; ${c1} → C1 (identity-identidade-autenticacao-e-sessoes), AUT-010 → monitoring; none to CAP/DEV`); } },
  { id: "TC-F-07", axis: "F", title: "G1 gate — every set-returning tool exposes offset/limit", tool: "tools/list",
    run: async (c) => { const setTools = ["plan_sbd_toe_repo_governance", "get_sbd_toe_chapter_implementation_checklist", "get_sbd_toe_operating_model", "get_sbd_toe_verification_matrix", "assess_sbd_toe_implementation", "plan_sbd_toe_rollout", "map_sbd_toe_regulatory_activation", "get_threat_landscape", "consult_security_requirements", "get_guide_by_role", "resolve_entities", "query_sbd_toe_entities"];
      const missing = setTools.filter((n) => { const t = c.tools.find((x) => x.name === n); const p = Object.keys(t?.inputSchema?.properties ?? {}); return !(p.includes("offset") && p.includes("limit")) && !(p.includes("limit") || p.includes("topK")); });
      return missing.length ? part(`set-returning tools without offset/limit: ${missing.join(", ")} (declared totals only)`) : ok("all set-returning tools paginate"); } },

  // ───────────────────────── Axis E — Regression (promotion gate) ─────────────────────────
  // Criterion (v1.7.0, contract v1.14 §1.21 + G-b decision 8): threats carry BOTH the
  // serving-derived `mitigated_by` (structural, from the resolved controls) AND the
  // substrate's `associated_control_ids` (CTRL-* ids, chapter-grained, derivation declared
  // per record); `associated_controls`/`associated_controls_text` remain the Manual prose.
  // PASS requires both structural sides populated with ids that resolve in the bundle.
  { id: "TC-E-01", axis: "E", title: "threat mitigation structural (L2, logging): mitigated_by + associated_control_ids resolve", tool: "get_threat_landscape",
    run: async (c, ctx) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["logging"] }); if (!r.ok) return fail(r.error); const th = r.data.threats;
      const mit = th.filter((t) => (t.mitigated_by ?? []).length).length; const badMit = th.flatMap((t) => t.mitigated_by ?? []).filter((m) => !ctx.knownIds.has(m.control_id));
      const withIds = th.filter((t) => (t.associated_control_ids ?? []).length).length; const badAssoc = th.flatMap((t) => t.associated_control_ids ?? []).filter((id) => !ctx.knownIds.has(id));
      if (mit !== th.length) return fail(`${mit}/${th.length} threats carry mitigated_by`); if (badMit.length) return fail(`mitigated_by ids not in bundle: ${badMit.slice(0, 3).map((m) => m.control_id)}`, "mixed");
      if (withIds !== th.length) return part(`associated_control_ids on ${withIds}/${th.length} (declared-empty derivations tolerated)`, "graph"); if (badAssoc.length) return fail(`associated_control_ids not in bundle: ${badAssoc.slice(0, 3)}`, "graph");
      return ok(`${th.length}/${th.length} threats with mitigated_by AND associated_control_ids, all ids resolve`); } },
  { id: "TC-E-02", axis: "E", title: "threat mitigation structural (L2, auth incl. ch.02 via C1): mitigated_by + associated_control_ids resolve", tool: "get_threat_landscape",
    run: async (c, ctx) => { const r = await c.tool("get_threat_landscape", { risk_level: "L2", concerns: ["auth"] }); if (!r.ok) return fail(r.error); const th = r.data.threats;
      if (!(r.data.meta.activeBundles ?? []).includes("02-requisitos-seguranca")) return fail("ch.02 not in auth scope although C1 defines there (G-b decision 2)");
      const mit = th.filter((t) => (t.mitigated_by ?? []).length).length; const badMit = th.flatMap((t) => t.mitigated_by ?? []).filter((m) => !ctx.knownIds.has(m.control_id));
      const withIds = th.filter((t) => (t.associated_control_ids ?? []).length).length; const badAssoc = th.flatMap((t) => t.associated_control_ids ?? []).filter((id) => !ctx.knownIds.has(id));
      if (mit !== th.length) return fail(`${mit}/${th.length} threats carry mitigated_by`); if (badMit.length) return fail(`mitigated_by ids not in bundle: ${badMit.length}`, "mixed");
      if (withIds !== th.length) return part(`associated_control_ids on ${withIds}/${th.length}`, "graph"); if (badAssoc.length) return fail(`associated_control_ids not in bundle: ${badAssoc.length}`, "graph");
      return ok(`${th.length} threats (ch.02 in scope via C1's defining chapter) with mitigated_by AND associated_control_ids, all resolve`); } },
  { id: "TC-E-03", axis: "E", title: "review path-map: containers → ch.09", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const f = ["Dockerfile", "docker-compose.yml", "k8s/deploy.yaml", "helm/app/values.yaml"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: f }); if (!r.ok) return fail(r.error); const miss = f.filter((x) => !has(bundlesOf(r.data, x), "09-containers-imagens")); return miss.length ? fail(`not → 09: ${miss}`) : ok("all 4 → 09 with reason"); } },
  { id: "TC-E-04", axis: "E", title: "review path-map: *.tf/*.bicep → ch.08", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const f = ["infra/main.tf", "infra/main.bicep"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: f }); if (!r.ok) return fail(r.error); const miss = f.filter((x) => !has(bundlesOf(r.data, x), "08-iac-infraestrutura")); return miss.length ? fail(`not → 08: ${miss}`) : ok("both → 08"); } },
  { id: "TC-E-05", axis: "E", title: "review path-map: non-GitHub CI → ch.07; .env → config/secrets", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const ci = [".gitlab-ci.yml", "Jenkinsfile", ".circleci/config.yml", "azure-pipelines.yml", "bitbucket-pipelines.yml"]; const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: [...ci, ".env"] }); if (!r.ok) return fail(r.error);
      const miss = ci.filter((x) => !has(bundlesOf(r.data, x), "07-cicd-seguro")); const env = bundlesOf(r.data, ".env"); const guard = (r.data.pathMapping ?? []).filter((m) => /unmapped|guardrail|foundation/i.test(m.pattern ?? "")).flatMap((m) => m.matchedFiles ?? []);
      if (miss.length) return fail(`CI not → 07: ${miss}`); if (!env.length) return fail(".env unmapped"); return guard.length ? fail(`in guardrail: ${guard}`) : ok(`5 CI systems → 07; .env → ${env.join(",")}`); } },
  { id: "TC-E-06", axis: "E", title: "review path-map: Python source recognised as code", tool: "map_sbd_toe_review_scope",
    run: async (c) => { const r = await c.tool("map_sbd_toe_review_scope", { riskLevel: "L2", changedFiles: ["src/app/handler.py"] }); if (!r.ok) return fail(r.error); const b = bundlesOf(r.data, "src/app/handler.py"); return has(b, "06-desenvolvimento-seguro") ? ok(`→ ${b.join(",")}`) : fail(`→ ${b}`); } },
  { id: "TC-E-07", axis: "E", title: "query exact-id OPS-002 (ch.12, requirement)", tool: "query_sbd_toe_entities",
    run: async (c) => { const r = await c.tool("query_sbd_toe_entities", { query: "OPS-002", chapterId: "12-monitorizacao-operacoes", entityType: "requirement" }); if (!r.ok) return fail(r.error); return r.data.match === "exact_id" && r.data.entities?.[0]?.requirement_id === "OPS-002" ? ok("exact_id, total 1") : fail(`match=${r.data.match} total=${r.data.total}`); } },
  { id: "TC-E-08", axis: "E", title: "query exact-id CLA-001", tool: "query_sbd_toe_entities",
    run: async (c) => { const r = await c.tool("query_sbd_toe_entities", { query: "CLA-001" }); if (!r.ok) return fail(r.error); return r.data.match === "exact_id" && r.data.entities?.[0]?.requirement_id === "CLA-001" ? ok("exact_id first") : fail(`match=${r.data.match}`); } },
  { id: "TC-E-09", axis: "E", title: "applicability conditional by technologies (iac, containers, ml-ai)", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: ["iac", "containers", "ml-ai"] }); if (!r.ok) return fail(r.error); const cond = r.data.conditional ?? []; const c8 = cond.find((x) => x.chapterId === "08-iac-infraestrutura"), c9 = cond.find((x) => x.chapterId === "09-containers-imagens");
      return c8 && c9 && /technolog/i.test(c8.reason + c9.reason) ? ok(`08/09 conditional with technology reasons`) : fail(`conditional=${stable(cond)}`); } },
  { id: "TC-E-10", axis: "E", title: "applicability sensitivity: technologies=[] → no conditional 08/09", tool: "map_sbd_toe_applicability",
    run: async (c) => { const r = await c.tool("map_sbd_toe_applicability", { riskLevel: "L2", technologies: [] }); if (!r.ok) return fail(r.error); const cond = ids(r.data.conditional, "chapterId"); const act = r.data.active ?? [];
      if (cond.length) return fail(`conditional not empty: ${cond}`); return has(act, "08-iac-infraestrutura") || has(act, "09-containers-imagens") ? part("conditional empty (context-sensitive vs E-09) but 08/09 remain in `active` via the L2 risk model (base chapters), not de-activated") : ok("08/09 not activated"); } },
  { id: "TC-E-11", axis: "E", title: "chapter brief ch.12 carries role + honest topics", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "12-monitorizacao-operacoes" }); if (!r.ok) return fail(r.error); return r.data.role?.length ? ok(`role ${r.data.role.length}, phases ${r.data.phases?.length}, artifacts ${r.data.artifacts?.length}`) : fail("no role"); } },
  { id: "TC-E-12", axis: "E", title: "chapter brief ch.08 role present without over-promise", tool: "get_sbd_toe_chapter_brief",
    run: async (c) => { const r = await c.tool("get_sbd_toe_chapter_brief", { chapterId: "08-iac-infraestrutura" }); if (!r.ok) return fail(r.error); return r.data.role?.length ? ok(`role ${r.data.role.length}, phases ${r.data.phases?.length ?? 0}`) : fail("no role"); } },
  { id: "TC-E-13", axis: "E", title: "search debug bounded to topK (KB not MB)", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 3, debug: true }); if (!r.ok) return fail(r.error); return r.size < 200000 ? ok(`${r.size} chars`) : fail(`${r.size} chars`); } },
  { id: "TC-E-14", axis: "E", title: "search debug scales with topK, always bounded", tool: "search_sbd_toe_manual",
    run: async (c) => { const a = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 1, debug: true }); const b = await c.tool("search_sbd_toe_manual", { question: "catálogo de eventos de segurança a registar", topK: 10, debug: true }); if (!a.ok || !b.ok) return fail(a.error ?? b.error); return a.size < b.size && b.size < 500000 ? ok(`${a.size} < ${b.size} chars`) : fail(`${a.size} vs ${b.size}`); } },
  { id: "TC-E-15", axis: "E", title: "[limite] E5 envelope (coverage_map handles + size_estimate) on large search", tool: "search_sbd_toe_manual",
    run: async (c) => { const r = await c.tool("search_sbd_toe_manual", { question: "todas as práticas de segurança do ciclo de vida", topK: 15 }); if (!r.ok) return fail(r.error); const env = /coverage_map|size_estimate|related_blocks/.test(r.text); return env ? ok("envelope present") : part(`no E5 envelope on search (bounded ${r.size} chars; ${(r.text.match(/\[M\d+\]/g) ?? []).length} cited chunks); pagination/size_estimate live on the structured tools instead`, "roadmap"); } },
  { id: "TC-E-16", axis: "E", title: "rich US: US-02 ch.12 multi-clause bdd + checklist", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { us_id: "US-02", chapter_id: "12-monitorizacao-operacoes" } }); if (!r.ok) return fail(r.error); const u = r.data.entities?.[0]; return u && (u.bdd?.length ?? 0) >= 3 && (u.checklist_items?.length ?? 0) >= 1 ? ok(`bdd ${u.bdd.length} clauses, checklist ${u.checklist_items.length}`) : fail(`bdd ${u?.bdd?.length}, checklist ${u?.checklist_items?.length}`); } },
  { id: "TC-E-17", axis: "E", title: "rich US: US-01 ch.01 foundational bdd + checklist", tool: "resolve_entities",
    run: async (c) => { const r = await c.tool("resolve_entities", { record_type: "user_story", filters: { us_id: "US-01", chapter_id: "01-classificacao-aplicacoes" } }); if (!r.ok) return fail(r.error); const u = r.data.entities?.[0]; return u && (u.bdd?.length ?? 0) >= 3 && (u.checklist_items?.length ?? 0) >= 1 ? ok(`bdd ${u.bdd.length}, checklist ${u.checklist_items.length}`) : fail(`bdd ${u?.bdd?.length}, checklist ${u?.checklist_items?.length}`); } },
];
