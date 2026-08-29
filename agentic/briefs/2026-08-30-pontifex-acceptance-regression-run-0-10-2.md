# Brief: cenários de aceitação (94 + Eixo F) executados como regressão sobre 0.10.2 — cobertura e achados

**Date:** 2026-08-30 · **De:** Pontifex · **Para:** programme lead (decisão sobre os achados) · Codex (TC-E-01/02: `associated_controls`) · Orchestrator (visibilidade; proposta de Eixo F para o documento de governança)

## O que foi feito

- `DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md` (94 cenários, 5 eixos) tornado **executável**: `npm run eval:acceptance` corre cada cenário contra o servidor real (stdio, `dist/index.js`, bundle pinado) e emite veredicto PASS/PART/FAIL/SKIP + owner; Eixo E = gate (exit 1). Registo: `docs/acceptance-runs/2026-08-29-v0.10.2-acceptance.{md,json}`.
- **Eixo F** (7 cenários, proposta minha): os 6 tools de 0.10.0 posteriores à elicitação de Junho (`verification_matrix`, `operating_model`, `implementation_checklist`, `rollout`, `assess`, `regulatory_activation`) + gate G1 de paginação. Sem ele, a cobertura de tools era 15/21.

## Resultado (0.10.2 / KG v1.6.0)

| Eixo | PASS | PART | FAIL | SKIP | de |
|---|---|---|---|---|---|
| A tools | 13 | 3 | 0 | 0 | 16 |
| B roles | 13 | 3 | 0 | 0 | 16 |
| C superfícies (AC) | 2 | 5 | 0 | 21 | 28 |
| D negativos/invariantes | 11 | 4 | 0 | 2 | 17 |
| E regressão (gate) | 13 | 2 | **2** | 0 | 17 |
| F 0.10.0 tools + G1 | 6 | 1 | 0 | 0 | 7 |
| **Total** | **58** | **18** | **2** | **23** | **101** |

Cobertura: 78/101 executados (77 %); **21/21 tools exercidos**; ACs OSS cobertos AC-01/02/03/14/15/25/26, 21 ACs comerciais documentados não corridos; 2 SKIP por exigirem LLM cliente (D-04/D-06 — o servidor só recupera, não gera).

## Achados

1. **Defeito de serving corrigido** (TC-A-13): `query_sbd_toe_entities` com `entityType` ou `riskLevel` devolvia 0 sempre — filtrava campos Algolia (`entity_type`, `risk_levels`) inexistentes no substrato. Corrigido para menções de entidade + facet `filter_tags.risk_level`, com `filters{…}` declarado na resposta.
2. **Código morto removido**: ramos `SnapshotCache` (era Algolia) em 5 handlers, nunca alcançados em runtime; ~25 testes que só exercitavam esses ramos substituídos por testes sobre o bundle real (suite 532).
3. **Gate E em FAIL por dados (owner: Codex)** — TC-E-01/02: `associated_controls` das threats vem **vazio** em ch.12 (logging: 0/15) e **textual** noutros capítulos (auth: 19/144 com refs em prosa, 0 como `CTRL-*`); `mitigated_by` (estrutural, derivado dos controlos) está populado em 100 %. O serving faz passthrough fiel; a expectativa do cenário (ids de controlo coerentes com `mitigated_by`) só se cumpre se o KG publicar o campo como ids — ou se a governança redefinir o critério sobre `mitigated_by`. Decisão pedida.
4. **PART confirmados como limites/gaps documentados** (18): 4 roles fora do vocabulário canónico (`infrastructure`, `procurement`, `training-manager`, `pentester` → 0 assignments, `[dados]`); `generate_skill` sem diferenciação por `clientType`; envelope E5 (`coverage_map`/handles) não ligado ao `search`; `get_threat_landscape`/`consult`/`get_guide_by_role` sem `offset/limit` (declaram totais, G1 parcial); `resolve_entities(user_story)` sem modo índice; `query_entities` de ID inexistente cai em pesquisa semântica em vez de `not_found` explícito; `technologies` rejeita vocabulário desconhecido sem `not_covered`; `map_applicability tech=[]` mantém 08/09 activos pelo modelo de risco L2.

## Asks

1. **Programme lead:** critério para TC-E-01/02 (Codex publica ids em `associated_controls` **ou** o gate passa a medir `mitigated_by`); priorização dos PART (G1 nos 3 tools; `not_found` explícito; modo índice de US).
2. **Codex:** `associated_controls` como ids de controlo (hoje prosa/vazio); 4 roles `[dados]`.
3. **Orchestrator:** adoptar o Eixo F no documento de governança; registar que o "Key finding (0.9.0)" do documento está superado (Eixo E 13/17 PASS, 2 PART `[limite]`, 2 FAIL dados).
