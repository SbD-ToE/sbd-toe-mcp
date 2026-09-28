---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-28"
---

# Em curso (Pontifex) — estado exacto a 2026-09-28, antes do reinício da máquina

## Publicado
- **0.22.0 PUBLICADA, npm `next` e `latest`.**
  - Merge squash do PR #82 → `f84a5114`; tag anotada `v0.22.0` (objecto `12a949f4`); release.yml run 36395780620.
  - shasum `98b884b9…`.
  - KG v2.0.0, contrato v2.0; Manual 1.16.0.
  - Verificado com `npx @latest`.
- **PR #83** (FREEZE-REGISTRY «v0.22.0 tag commit recorded» + CHANGELOG com data), ramo `chore/record-v0.22.0`, head `4061a454`:
  verde, **merge pendente do lead**.

## Em curso
- **Ramo `0.23.0` @ `df48ac58`**, a partir do master `f84a511`: só a **promessa 0008** (composição L3 por contexto regulatório,
  `agentic/decisions/0008-composicao-l3-por-contexto-regulatorio.md`). **Sem código.**
- **KG v2.1.0 verificado:** tag `d82005b5` → `92b1154f`; sha256 `577cafb82a545dfbca9460247ac961ff2916b14e0f39199d94cb31be28910956`;
  contrato v2.1 aditivo.
- **Bloqueio:** o **sim directo do lead nesta sessão** para implementar a 0.23.0.

## Próximo passo concreto (só depois do sim)
1. No ramo `0.23.0`, `node scripts/sync-bundle.mjs --from-release v2.1.0`. É minor, o gate não pede aceitação, e o verify aceita
   v2.x.
2. Implementar a promessa 0008: `regulatory_contexts` em select e prepare; tool `get_sbd_toe_regulatory_coverage`; vocabulário;
   guardas; aviso.
3. Testes, matriz nova (120 casos × 8 pares contexto/grau), acceptance, Eixo H, determinismo.
4. Apresentar ao lead. Qualquer mudança de oráculo volta para ratificação. Merge, tag e `latest` são do lead.

## Seguimentos em aberto
- KG v2.12: a relação precisa «valor de contexto → fatias» e «concern → família» (Archon/Codex).
- Os docs do MCP no Manual vão na v1.17.1 (Manual Agent).
