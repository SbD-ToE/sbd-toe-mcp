/**
 * 0.20.0-beta.21 — o contrato «declarativo primeiro», guardado por testes.
 *
 * Princípio operacional (nota de desenho §7): «o MCP pode NORMALIZAR o que lhe
 * disseram; não pode DECIDIR o que quiseram dizer». Cada caso abaixo é uma
 * consequência verificável desse princípio — se algum falhar, a fronteira moveu-se.
 */
import { describe, it, expect } from "vitest";
import { runSelection, normalizeDeclaredTechnologies } from "./selection.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";

const TASK = "Implementar login com sessões de utilizador e upload de ficheiros";

describe("declarativo primeiro — a prosa deixou de seleccionar", () => {
  it("a mesma tarefa em 5 redacções dá EXACTAMENTE o mesmo conjunto quando as declarações são iguais", () => {
    const wordings = [
      "Adicionar autenticação ao endpoint de perfil",
      "Proteger o acesso ao perfil do utilizador",
      "Login e sessões para a área de cliente",
      "Utilizadores autenticam-se antes de ver o perfil",
      "Access control no módulo de perfis"
    ];
    const sets = wordings.map((task) =>
      runSelection({ risk_level: "L2", task, concerns: ["auth"] })
        .selected.map((r) => r.requirement_id)
        .sort()
        .join(",")
    );
    expect(new Set(sets).size, `redacções divergiram: ${JSON.stringify(sets.map((s) => s.length))}`).toBe(1);
    expect(sets[0]!.length).toBeGreaterThan(0);
  });

  it("o `task` é contexto registado: presente no rasto, sem efeito no resultado", () => {
    const withTask = runSelection({ risk_level: "L2", task: TASK, concerns: ["auth"] });
    const withoutTask = runSelection({ risk_level: "L2", concerns: ["auth"] });
    expect(withTask.task_record).toEqual({ text: TASK, role: "recorded_context", affects_selection: false });
    expect(withTask.selected.map((r) => r.requirement_id)).toEqual(withoutTask.selected.map((r) => r.requirement_id));
  });

  it("sem declarações: needs_input com vocabulário, candidatos A CONFIRMAR e exemplo copiável — nunca zero", () => {
    const r = runSelection({ risk_level: "L2", task: TASK });
    expect(r.needs_input, "ausência de sinal tem de ser needs_input, não resultado").toBeDefined();
    expect(r.selected).toHaveLength(0);
    expect(r.needs_input!.vocabulary_resource).toBe("sbd://toe/activation-vocabulary");
    expect(r.needs_input!.candidates_to_confirm.note).toMatch(/SUGESTÃO A CONFIRMAR/);
    expect(r.needs_input!.example.tool).toBe("select_sbd_toe_requirements");
    // o exemplo tem de ser EXECUTÁVEL: os concerns citados existem no vocabulário
    const vocab = new Set(buildActivationVocabulary().concerns.values.map((c) => c.value as string));
    const cited = (r.needs_input!.example.with.match(/concerns=\[([^\]]*)\]/)?.[1] ?? "")
      .split(",").map((x) => x.trim()).filter(Boolean);
    expect(cited.length).toBeGreaterThan(0);
    for (const c of cited) expect(vocab.has(c), `${c} fora do vocabulário publicado`).toBe(true);
    // e o exemplo, executado à letra, produz selecção
    const followed = runSelection({ risk_level: "L2", concerns: cited });
    expect(followed.selected.length).toBeGreaterThan(0);
    expect(followed.needs_input).toBeUndefined();
  });

  it("baseline é PEDIDO EXPLÍCITO, nunca fallback", () => {
    const baseline = runSelection({ risk_level: "L2", mode: "baseline" });
    expect(baseline.selected.length).toBeGreaterThan(100);
    expect(baseline.needs_input).toBeUndefined();
    // e sem o pedido explícito a mesma chamada não devolve baseline nenhuma
    expect(runSelection({ risk_level: "L2" }).selected).toHaveLength(0);
  });

  it("basis tem valor único `declared` e os avisos lexicais perderam objecto", () => {
    const r = runSelection({ risk_level: "L2", task: TASK, concerns: ["auth", "files"] });
    const bases = new Set(r.selected.flatMap((s) => s.selection_trace.map((t) => t.basis)));
    expect([...bases]).toEqual(["declared"]);
    expect(r.basis_summary.lexical_only).toBe(0);
    expect(r.lexical_dominance_warning).toBeNull();
    expect(r.empty_selection_warning).toBeNull();
    // R2 perdeu objecto: `auth` declarado traz SES sem depender de palavras na frase
    expect(r.selected.some((x) => x.requirement_id.startsWith("SES-"))).toBe(true);
    expect(r.narrowed_out.every((g) => g.basis === "declared")).toBe(true);
  });

  it("normaliza o declarado, não adivinha prosa: `stack` só conta por token exacto do vocabulário", () => {
    expect(normalizeDeclaredTechnologies([], "Python/FastAPI")).toEqual([]);
    expect(normalizeDeclaredTechnologies([], "docker + kubernetes")).toEqual(["kubernetes"]);
    expect(normalizeDeclaredTechnologies(["Kubernetes"], undefined)).toEqual(["kubernetes"]);
    expect(normalizeDeclaredTechnologies(["telepatia"], undefined)).toEqual([]);
  });

  it("a regra nomeada SES-008 passou a ser accionada por TECNOLOGIA DECLARADA", () => {
    const declared = runSelection({ risk_level: "L1", concerns: ["auth"], technologies: ["jwt"] });
    expect(declared.selected.some((r) => r.requirement_id === "SES-008")).toBe(true);
    const prose = runSelection({ risk_level: "L1", concerns: ["auth"], task: "usar JWT com refresh token" });
    expect(prose.selected.some((r) => r.requirement_id === "SES-008"), "prosa não pode accionar a regra").toBe(false);
  });

  it("discover continua a existir, marcado exploratório, com os avisos todos", () => {
    const d = runSelection({ risk_level: "L2", task: "Adicionar autenticação ao endpoint de perfil", mode: "discover" });
    expect(d.mode).toBe("discover");
    expect(d.task_record.affects_selection).toBe(true);
    expect(d.selected.length).toBeGreaterThan(0);
    const out = handleSelectRequirements({ risk_level: "L2", task: "Adicionar autenticação ao endpoint", mode: "discover" });
    expect(out.exploratory?.mode).toBe("discover");
  });
});

describe("declarativo primeiro — superfícies servidas", () => {
  it("o vocabulário publicado é derivado e cobre todos os canais de declaração", () => {
    const v = buildActivationVocabulary();
    expect(v.contract.serving_semantics).toBe("declarative-first");
    expect(v.concerns.values.length).toBeGreaterThan(20);
    for (const key of ["exposure", "data_sensitivity", "technologies", "changed_files", "roles", "phases"] as const) {
      expect((v as unknown as Record<string, { values?: unknown[]; patterns?: unknown[] }>)[key]).toBeDefined();
    }
    // derivado do bundle: as contagens por nível batem com a selecção real
    const authEntry = v.concerns.values.find((c) => c.value === "auth")!;
    const selected = runSelection({ risk_level: "L2", concerns: ["auth"] }).selected;
    const baseSelected = selected.filter((r) => authEntry.activates_categories.includes(r.category)).length;
    expect(baseSelected).toBe(authEntry.requirements_at.L2);
    // `task` e `stack` estão declarados como NÃO-activadores
    expect(v.not_activators.map((n) => n.field).sort()).toEqual(["stack", "task"]);
  });

  it("o select devolve needs_input com next que ensina (vocabulário → declarar → baseline)", () => {
    const out = handleSelectRequirements({ risk_level: "L2", task: TASK });
    expect(out.mode).toBe("declarative");
    expect(out.needs_input).toBeDefined();
    expect(out.task.affects_selection).toBe(false);
    expect(out.next?.map((n) => n.tool)).toEqual([
      "read_sbd_toe_resource",
      "select_sbd_toe_requirements",
      "select_sbd_toe_requirements"
    ]);
    // nunca manda a lista vazia ao destino errado
    expect(JSON.stringify(out.next)).not.toContain("verification_matrix");
  });

  it("o prepare exige declaração e ensina a receita (sem classificador de intenção)", () => {
    const blockedResult = handlePrepareCodegenContext({ task: TASK, risk_level: "L2", mode: "codegen" }) as {
      status: string;
      suggestions?: string[];
    };
    expect(blockedResult.status).toBe("needs_input");
    expect(blockedResult.suggestions?.join(" ")).toContain("sbd://toe/activation-vocabulary");
    const ready = handlePrepareCodegenContext({
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen",
      concerns: ["files", "validation"]
    }) as { status: string };
    expect(ready.status).toBe("ready_for_codegen");
  });
});
