---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-27"
---

# 0007 — Fronteira L3 / L4 da selecção por contexto regulatório

**Data:** 2026-09-27 · **Autor:** Pontifex · **Estado:** DECIDIDA pelo lead, via Orchestrator. **Não implementada:** entra com o
overlay v1.29, depois da 0.22.0.
**Origem:**
- desenho do eixo de contexto regulatório, `sbd-ai-runtime/handover/em-curso/2026-09-27-cobertura-cross-check/` (DESENHO,
  RESPOSTA do Pontifex, SCHEMAS finais §6);
- ADR 0007 (dimensões de interacção) e ADR 0009 (níveis de capacidade) do DevelopmentGovernance.

## Decisão

A linha segue a que a ADR 0009 já traça: **consulta sobre dado publicado** fica no OSS, **execução com contexto privado** fica
no comercial.

**L3 (OSS) — COMPOSIÇÃO.** A partir dos contextos e graus declarados pelo chamador, devolve:
- os requisitos aplicáveis, cada um com a sua origem: `base`, `elevado` ou `acrescentado`;
- as obrigações e os artigos que os motivam (`base.obrigacoes`);
- a força das obrigações do regime (`parcial`, `lacuna`, `fora_de_ambito`), juntada pelo id da obrigação;
- **sempre** o eco do que foi declarado e o aviso «não é determinação de conformidade».

**L4 (comercial) — DETERMINAÇÃO:**
- se o sistema está de facto num contexto (entidade essencial ou importante, inventário de FCI, qualificação jurídica do sistema
  de IA);
- o registo das declarações ao longo do tempo, com evidência e gatilhos de reclassificação;
- as justificações de não aplicabilidade;
- a análise de lacunas contra o estado real (repositório, evidência);
- os overlays de organização (`tipo_overlay: organizacao`, ids `ORG-*`). O OSS nunca os serve nem os cita, e declara-os se
  aparecerem.

## Regras de composição do L3 (confirmadas pelo lead a 2026-09-27; o Manual materializa-as em `regra_lista`)

- **Efectivos** = selecção técnica ∪ elevados ∪ acrescentados.
- Os ids de origem `base` só entram se a selecção técnica os activar.
- Um elevado ou acrescentado sem activação técnica entra marcado: «aplica-se pelo regime; se o componente não existir, exige
  justificação documentada de não aplicabilidade». Não se impõe às cegas nem cai em silêncio.
- Os pisos-parâmetro servem-se verbatim. O valor efectivo calcula-o o KG, pelas escalas publicadas, e o MCP mostra o efectivo e
  todos os pisos, cada um com a sua base.
- **Citação:** o catálogo (master) é a fonte canónica do requisito, e a obrigação é overlay. A página gerada «Requisitos
  aplicáveis» nunca se cita e fica fora dos índices.

## Porque esta linha

- **A composição é uma função pura de dado público:** catálogo, pisos e matriz. O contexto é declarado, como `exposure`. Fechá-la
  seria uma fronteira fraca, e deixaria o utilizador OSS sem pisos que a lei exige, em silêncio.
- **A determinação precisa de dado privado e de fluxo**, que é o território da L4 pela ADR 0009. A proximidade de aconselhamento
  de conformidade fica do lado que pode assumir essa responsabilidade.

## Dependências (antes de implementar)

- **Overlay v1.29** no contrato do KG: `sbdtoe-overlay/1`, `lista_ids` por grau, `regra_lista`, força por obrigação e ids
  estáveis com `retirado`.
- **Operador `elevar`** na ontologia (`requirement_selection_model`), a cargo do Archon.
- **Páginas geradas** excluídas dos índices de pesquisa pelo KG.
- **Âncoras resolvidas** publicadas pelo KG (o MCP não re-implementa a slugificação).

## Princípio do lead (2026-09-27, append): «o que é público é consultado público»

- **Tudo o que o Manual e o KG publicam é servido pelo OSS (L1–L3):** contextos, pisos, `lista_ids`, origem, obrigações, força e
  fora de âmbito.
- **O L4 nunca retém nem condiciona conteúdo público.** Acrescenta só o que depende do cliente: a determinação, o registo, as
  justificações, a análise de lacunas contra o estado real e os overlays de organização.
- **Teste de fronteira:** se um dado público só pudesse ser obtido pelo L4, isso é um **defeito de fronteira** e corrige-se do
  lado do OSS. Nunca se aceita como diferenciação comercial.
