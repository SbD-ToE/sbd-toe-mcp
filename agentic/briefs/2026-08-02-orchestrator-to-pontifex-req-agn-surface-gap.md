# Brief: REQ-AGN ausente do runtime bundle — declaração de gap na superfície MCP

**Date:** 2026-08-02
**De:** Orchestrator
**Persona:** Pontifex (secundário; primário é o Codex — brief principal em
`sbd-toe-knowledge-graph/agentic/briefs/2026-08-02-orchestrator-to-codex-req-agn-extraction-gap.md`)

---

## Situação

O catálogo agentic **REQ-AGN-001…004** (mandate versionado, autonomia A0–A4, kill-switch,
intent declaration; Manual `02-requisitos-seguranca/addon/09-governaca-automatismos.md`) não
chega ao `requirements.json` do bundle — gap de **extração** no lado Codex (não é version skew:
o resto da onda agentic ARC-015/OPS-012/DPL-010 está no bundle). Consequência na tua superfície:
`consult_security_requirements` responde a perguntas sobre agentes AI **sem** estes 4 requisitos
e **sem declarar o gap** — falha silenciosa, contra never-silent/coverage-preserving.

## Pedido (outcome; forma é tua)

1. Avaliar mitigação **enquanto o bundle corrigido não é emitido**: declaração de gap nas
   respostas afetadas (à imagem dos `declared gaps` da verification matrix / da nota de
   `coverage_gaps`), no mínimo para consultas com concern/âmbito que toque agentes AI.
   Se a relação custo/valor não justificar mitigação interina, di-lo — decisão é tua.
2. Quando o Codex emitir bundle novo: sync verificado (sha256) + release conforme alignment
   policy, cadência normal.

## Nota

Descoberto na revisão do checklist canónico para o produto de client assessment; o report AS-IS
em curso referencia estes IDs (`ASIS-CHK-02-014…017`), pelo que a incompletude é observável por
terceiros que cruzem o report com a superfície MCP.
