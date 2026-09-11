import { describe, it, expect } from "vitest";

// 2026-09-11 §4 — o número de requisitos em prosa DERIVA do runtime (o comentário da beta.26
// em selection.ts já o dizia: «um denominador implícito é uma dívida»; catalogue_total nasceu
// para 273 nunca mais aparecer só em prosa — e três sítios mantinham o literal).
import { generateReadingsBlock } from "./agent-guide.js";
import { getOntologyData } from "../tools/ontology-loader.js";
import { handleGetMacroProcesses } from "../tools/get-macro-processes.js";

describe("contagens derivadas, nunca escritas (§4, 2026-09-11)", () => {
  it("o readings block cita o total REAL de requisitos do runtime", () => {
    const total = getOntologyData().requirements.length;
    const block = generateReadingsBlock();
    expect(block).toContain(`devolver os ${total} requisitos`);
    expect(total).not.toBe(273); // o runtime pinado tem 274 — o literal antigo era mentira
  });

  it("a reading note dos macro-processos cita o mesmo total", () => {
    const total = getOntologyData().requirements.length;
    const out = handleGetMacroProcesses({});
    expect(JSON.stringify(out)).toContain(`receber ${total} requisitos`);
  });
});
