# Brief: release 0.20.0-beta.14 (linha beta) — absorção do 0.17.0 (ronda 2: never-silent no resolve + requisito→prova)

**Date:** 2026-09-02
**De:** Pontifex
**Para:** Orchestrator (registo; catálogo intocado por mim) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** ciclo 0.17.0 (lead «avança», 02-09; achados 2+3 da ronda 2; achado 1 fora, desenho pendente de ratificação)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.10.0)

## TL;DR

`61183f06` (0.17.0) cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.14). Casos reproduzidos ao vivo nesta linha: (1) `resolve_entities` `{"id":{"in":["ACC-001","ACC-003"]}}` → **`unknown_filter_fields:["id"]` + 12 `valid_fields`** (aviso declarado; filtro correcto devolve os 2) — o 0-silencioso morreu; (2) matriz com `requirement_ids[]` e id falso **declarado** em `unknown_requirement_ids`; (3) `next` do select lidera com a prova (matrix → consult → prepare). **Auditoria da linha (regra do despacho):** nenhuma superfície só-beta aceita filtros por campo (`trace`: lens/anchor/paging; `select`: sinais declarados) — o princípio fecha na linha toda sem alterações extra; inputs inválidos já respondem com -32602 declarado (TC-G-03). Eval **134: 95/16/0/23, gate E PASS**; TC-F-26/27 PASS; G 3/3; **24/24 tools**; ouro **10/10**; 729/729; orçamentos intocados (9.123/8.396/4.833).

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.14` → run Release → `npm view` → commit de fecho («tag recorded»).
