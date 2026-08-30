# Brief: release 0.10.3 — pin formal KG `v1.6.1` (camada requisito→controlo curada v2, Manual v1.7.1) — fecho da linha estável

**Date:** 2026-08-30 · **De:** Pontifex · **Para:** programme lead (merge; tag após squash) · Codex (ask 1 executado na linha estável) · Orchestrator (fecho) · Manual (nota `REQ-010`)
**Em resposta a:** `sbd-ai-runtime/handover/em-curso/2026-08-30-codex-curated-link-layer-v2-release-v1.6.1.md` · handover Manual v1.7.1 (`2026-08-29-manual-wave-v1.7.1-minisite-ex-req.md`)

## Identificadores (verificados)
| Item | Valor |
|---|---|
| KG | `v1.6.1` → `e9fc54f312829c632ecd50e2306bfa356e9e457c` = `refs/heads/mcp-stable` (`git ls-remote`) |
| Asset | `sbd-toe-knowledge-graph-bundle-v1.6.1.zip`, sha256 **`df6920cbef5bbd6f2b723708efe0b48ca5017abf8928bc800db0609536ef547b`** = sidecar (`sync-bundle --from-release`) |
| Pin | `source: release`, contrato **v1.12**, `pinned_at 2026-08-30`, Manual **v1.7.1** `8e03454c`, `run_manifest.release = stable/v1.6.1`; verificador ✅ |
| Diff `data/` vs v1.6.0 | 19 ficheiros: `requirement_control_links` (263→265, 14 com `curation`), 10 EPs, overlay/referrals (+75), tier v1 (rastreabilidade/maturity/threat), manifests |

## mcp.verify — `npm run eval:acceptance` (registo `docs/acceptance-runs/2026-08-30-v0.10.3-acceptance.{md,json}`)
102 cenários (94 + Eixo F 8), 79 executados: **59 PASS · 20 PART · 0 FAIL · 23 SKIP**; **gate E = PASS** pelo critério revisto (E‑01/02 = PART: `mitigated_by` estrutural 15/15 e 159/159 com ids que resolvem; `associated_controls` textual = campo do substrato). **TC‑F‑08**: 265 ligações, `coverage_gaps` 0/0/0 (L1/L2/L3), AUT‑007/008 → `CTRL-identity-…`, AUT‑010 → `CTRL-monitoring-…`; chave `curation` tolerada (o loader só projecta `source_id/target_id/link_type/confidence`). 21/21 tools. `npm run check` ✅ · `npm test` 533/533 (novo: `EX-REQ-010` nunca resolve).

## Nota para Codex/Manual
Critério de saída «`citation_note` = 0 para `REQ-NNN` ilustrativos»: 19/20 IDs a zero; **`REQ-010` continua citado 2×** — pelo próprio mini-site (`020-assets/mcp/05-tools-reference`, exemplo de `query("REQ-010")` → `citation_note`). É um exemplo legítimo, não uma citação legada; fica informativo por desenho.

## Registo
CHANGELOG 0.10.3 (pin v1.6.1 + camada curada v2 + itens do #49 + correcções de registo: 661 mappings, 3 prompts, beta.3) · FREEZE-REGISTRY (tag protegida `v0.10.3`, estado corrente, pins exactos) · AI-USE-DISCLOSURE (runner = veredictos por script, sem LLM) · adendas de correcção na closing note 0.10.2 e no handoff ao Manual.

## Pontos 4 (após merge — update no em-curso)
Tag anotada `v0.10.3` no squash → `release.yml` → `npm view` (version/dist-tags/gitHead).
