# Brief: release 0.20.0-beta.19 (linha beta) — absorção do 0.19.2 (next calibrado + START HERE nas descrições)

**Date:** 2026-09-04
**De:** Pontifex
**Para:** Orchestrator (registo; catálogo intocado por mim) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** «avança com o 0.19.2» (lead, 04-09; secção Re-verificação 0.19.1 da triagem)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.11.0)

## TL;DR

Pré-condição completada (padrão beta.17/18: run 33896531612 observado até sucesso; re-verificação pós-propagação; sem pick parcial). `99ad5a91` cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.19). **Next do V2 nesta linha:** `next[0]` = re-correr o select com **top-3 por peso `[auth, integration, validation]`**; o aviso mantém a lista completa (17, ordenada); hint da matrix com tecto ≤50 declarado (TC-F-32 round-trip PASS: sugestão aceite → 58 selected → prepare ready). **START HERE** agora nas descrições do select (tool) e do setup (prompt); instructions mantêm o ⛳. **Varrimento dos next só-beta — limpo e declarado:** o `trace_sbd_toe_graph` não devolve `next[]` nem sugestões com parâmetros quantificados; o `relations_ref` do prepare referencia `{lens, anchor}` sem quantificar nada que o destino rejeite — nada a calibrar, nada alterado. Eval **139: 100/16/0/23, gate E PASS** (sentinela + `package_version` assertado); TC-F-31/32 PASS; G 3/3; **25/25**; ouro **10/10**; **732/732**; orçamentos intactos (9.128/8.401/4.833).

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.19` → run Release → `npm view` → commit de fecho («tag recorded»).
