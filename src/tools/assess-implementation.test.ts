import { describe, it, expect } from "vitest";
import { handleAssessImplementation } from "./assess-implementation.js";

// assess_sbd_toe_implementation — stateless KPI self-report vs per-level thresholds.
// Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md

describe("assess_sbd_toe_implementation", () => {
  it("evaluates a submitted KPI against its per-level threshold (gte)", () => {
    const pass = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ARC-K01": 85 } });
    const arcPass = pass.data.per_kpi.find((k) => k.metric_id === "ARC-K01");
    expect(arcPass?.threshold_value).toBe(80);
    expect(arcPass?.operator).toBe("gte");
    expect(arcPass?.status).toBe("meets"); // 85 >= 80

    const fail = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ARC-K01": 50 } });
    expect(fail.data.per_kpi.find((k) => k.metric_id === "ARC-K01")?.status).toBe("below"); // 50 < 80
  });

  it("marks an applicable KPI with no submitted value as not_reported (never a pass)", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "XX-PROBE": 1 } });
    const arc = r.data.per_kpi.find((k) => k.metric_id === "ARC-K01");
    expect(arc?.status).toBe("not_reported");
    expect(r.data.gaps.some((g) => g.metric_id === "ARC-K01")).toBe(true);
  });

  it("posture distingue AVALIADO de NÃO-avaliado (0.15.1): meets+not_reported → 'at' declarado", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ARC-K01": 85 } });
    expect(r.data.posture).toBe("at"); // cumpriu o avaliado; extensão declarada em totals
    expect(r.data.totals.meets).toBeGreaterThanOrEqual(1);
    expect(r.data.totals.not_reported).toBeGreaterThan(0);
  });

  it("posture é 'below' apenas com avaliação abaixo do threshold (0.15.1)", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ARC-K01": 1 } });
    expect(r.data.posture).toBe("below");
  });

  it("kpi_values {} é rejeitado com erro instrutivo; só not_reported ⇒ posture not_assessed (0.15.1)", () => {
    expect(() => handleAssessImplementation({ risk_level: "L2", kpi_values: {} })).toThrow(/kpi_values vazio/);
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "XX-PROBE": 1 } });
    expect(r.data.posture).toBe("not_assessed");
    expect(r.data.gaps_coverage.total).toBeGreaterThan(0);
  });

  it("surfaces unknown metric ids without counting them in posture", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ZZZ-K99": 1 } });
    expect(r.data.unknown_metrics).toContain("ZZZ-K99");
    expect(r.data.per_kpi.some((k) => k.metric_id === "ZZZ-K99")).toBe(false);
  });

  it("only scores KPIs applicable at the requested level (null threshold = out of scope)", () => {
    // ARC-K01 has no L1 threshold ("-") → must not appear at L1.
    const l1 = handleAssessImplementation({ risk_level: "L1", kpi_values: { "ARC-K01": 100 } });
    expect(l1.data.per_kpi.some((k) => k.metric_id === "ARC-K01")).toBe(false);
  });

  it("is stateless self-report and declares it; thresholds come from the bundle", () => {
    const r = handleAssessImplementation({ risk_level: "L3", kpi_values: { "XX-PROBE": 1 } });
    expect(r.data.mode).toBe("self_report_stateless");
    expect(r.provenance.source_data).toContain("metrics.json");
    expect(r.provenance.note.toLowerCase()).toContain("nothing persisted");
  });

  it("next affordance routes each gap to its chapter implementation checklist", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "XX-PROBE": 1 } });
    expect((r.next ?? []).some((a) => a.tool === "get_sbd_toe_chapter_implementation_checklist")).toBe(true);
    expect((r.next ?? []).length).toBeLessThanOrEqual(3);
  });

  it("cites the KPI catalog source per KPI (retrieval-grounded, never invented)", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "ARC-K01": 85 } });
    const arc = r.data.per_kpi.find((k) => k.metric_id === "ARC-K01");
    expect(arc?.source?.source_file).toContain("kpis-metricas");
    expect(r.provenance.source_data.toLowerCase()).toContain("catalog");
  });

  it("validates risk_level and kpi_values shape", () => {
    expect(() => handleAssessImplementation({ risk_level: "L9", kpi_values: { "XX-PROBE": 1 } })).toThrowError(/risk_level/);
    expect(() => handleAssessImplementation({ risk_level: "L2", kpi_values: [] })).toThrowError(/kpi_values/);
    expect(() => handleAssessImplementation({ risk_level: "L2" })).toThrowError(/kpi_values/);
  });

  // Coverage-preserving pagination (the per_kpi list must never be an unbounded dump).
  it("paginates per_kpi with a bounded default + coverage cursor; totals stay whole", () => {
    const r = handleAssessImplementation({ risk_level: "L2", kpi_values: { "XX-PROBE": 1 } });
    expect(r.coverage).toBeDefined();
    const cov = r.coverage as { total: number; returned: number; nextOffset: number | null; hasMore: boolean };
    // default page is bounded (agentic budget = 15), not the full applicable set.
    expect(r.data.per_kpi.length).toBeLessThanOrEqual(15);
    expect(cov.total).toBe(r.data.totals.applicable); // full extent declared
    expect(cov.total).toBeGreaterThan(r.data.per_kpi.length); // many KPIs → more than one page
    expect(cov.hasMore).toBe(true);
    expect(cov.returned).toBe(r.data.per_kpi.length);
    expect(r.data.gaps.length).toBe(r.data.gaps_returned);
    expect(r.data.gaps_returned).toBeLessThanOrEqual(r.data.totals.gaps); // gaps bounded, full count in totals
  });

  it("walking coverage.nextOffset yields every per_kpi once (nothing dropped)", () => {
    const seen: string[] = [];
    let offset: number | null = 0;
    let total = 0;
    let guard = 0;
    while (offset !== null && guard++ < 100) {
      const r = handleAssessImplementation({ risk_level: "L3", kpi_values: { "XX-PROBE": 1 }, offset, limit: 20 });
      const cov = r.coverage as { total: number; nextOffset: number | null };
      total = cov.total;
      seen.push(...r.data.per_kpi.map((k) => k.metric_id));
      offset = cov.nextOffset;
    }
    expect(seen.length).toBe(total);
    expect(new Set(seen).size).toBe(total); // no duplicates, no omissions
  });
});
