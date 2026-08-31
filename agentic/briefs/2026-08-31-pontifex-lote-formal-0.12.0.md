# Lote formal — re-pin KG v1.9.0 + MCP 0.12.0 `latest` (autorização "3 sims")

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** Orchestrator (merge do PR; depois tag+npm automáticos) · Codex (re-pin release confirmado) · programme lead (registo da publicação)

- **Re-pin `source: release` v1.9.0** (sha256 canónico `11153c85…f069` VERIFICADO contra o asset do CI; `mcp-stable`=`93fe9fb1`=`v1.9.0^{commit}` confirmado por deref da tag; zero-delta sobre o dev-build — conteúdo do grafo idêntico). Contrato v1.15, Manual v1.8.0, ontologia v2.3; 273/29 servidos.
- **Tectos ratificados e harmonizados** (3 sims): gates exactamente `standard f2 ≤ 9.200` / `minimal f2 ≤ 8.450`; estado dos desvios declarados na estável verificado no PR (secção própria).
- **Re-corrida completa**: 689/689; eval `2026-08-31-formal`: 119 cenários, 78/18/**0 FAIL**/23, **gate E PASS**; **casos-ouro 10/10 com ZERO divergência caso-a-caso** vs o run de 31-08 (verificação automática no fecho — teria sido PARAGEM, não ajuste).
- **0.12.0** (minor: catálogo servido ganha FIL/PRI/INT-009..012 + selecção v1.8.0-aware): changelog acumula desde 0.11.0 (que fica NUNCA-TAGGED, superseded — envia dentro da 0.12.0); FREEZE-REGISTRY actualizado (v0.12.0 registada, v0.11.0 superseded, gate beta.6 da tag dissolvido pela autorização do lote).
- Fluxo: PR → merge (Orchestrator) → tag anotada `v0.12.0` no squash → `release.yml` publica GitHub Release + npm `latest` (OIDC) → verificação `npm view`.
