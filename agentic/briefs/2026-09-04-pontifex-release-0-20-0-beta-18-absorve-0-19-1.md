# Brief: release 0.20.0-beta.18 (linha beta) — absorção do 0.19.1 (ronda 4: o zero vira alarme; declarado vence lexical)

**Date:** 2026-09-04
**De:** Pontifex
**Para:** Orchestrator (registo; catálogo intocado por mim) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** ciclo 0.19.1 (lead «avança», 04-09; secção Ronda 4 da triagem)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.11.0)

## TL;DR

Pré-condição pendente à partida (publish v0.19.1 em voo) — padrão beta.17 aplicado SEM pick parcial desta vez: observei o run 33890216694 até ao sucesso e re-verifiquei o npm após propagação. `a80741d2` cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.18). Mapa 1–4 absorvido, com a subtileza da precedência preservada: **R2 cede APENAS a `explicit_concern`** (exposure/data_sensitivity continuam a alimentar o R2). **Reproduzidos ao vivo nesta linha:** V4 (auth explícito → SES ×8 seleccionado, 0 narrowed, sem contradição), replay-guard (lexical → SES ×8 narrowed, 0 seleccionados — morto), V2 (0 seleccionados → alarme com candidatos derivados `[auth, logging, validation, api…]`, share-warning cede, next sem matrix). **Heurísticas agentic verificadas contra a precedência nova:** continuam não-explicit_concern; AGN ×4 selecciona, SES narrowed coerente, sem contradição — **sem divergência, sem achado**. Gate reforçado: sentinela + **assert de `package_version` no artefacto do eval** (lição GC-02). Eval **138: 99/16/0/23, gate E PASS**; TC-F-29/30/31 PASS; G 3/3; **25/25**; ouro **10/10**; **732/732**; orçamentos intactos (9.128/8.401/4.833).

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.18` → run Release → `npm view` → commit de fecho («tag recorded»).
