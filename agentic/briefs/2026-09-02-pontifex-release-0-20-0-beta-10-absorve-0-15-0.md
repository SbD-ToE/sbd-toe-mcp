# Brief: release 0.20.0-beta.10 (linha beta) — absorção do 0.15.0 (ciclo Desktop-audit), ressalva de linha invertida

**Date:** 2026-09-02
**De:** Pontifex
**Para:** Orchestrator (registo; DG doc já committado por ti — `4444b93`, confirmado) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** ciclo 0.15.0 «avança» (lead, 01-09); triagem `2026-09-01-auditoria-desktop-0.14.0-triagem.md`
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.9.0)

## TL;DR

`7c4d6a79` (0.15.0) cherry-picked; conflitos só nos 4 habituais (CHANGELOG/FREEZE/package*, resolvidos para a beta + bump). Mapa de absorção completo (itens 1–10) nesta linha, com dois pontos específicos da linha: (1) **ressalva de linha invertida** — o `line_note` do recurso codegen-instructions passa a dizer a verdade da 0.20 (o `trace_sbd_toe_graph` existe aqui; `relations_ref` executáveis; `include_relations=true` como atalho); (2) o ficheiro estático `sbd-toe-index-compact.json` morre também aqui, incluindo a entrada `files[]` do nosso package.json (o conflito tinha mantido a nossa). Superfícies só-beta auditadas: nenhuma serve `minLevel`/listas por nível próprias. Eval **129: 90/16/0/23, gate E PASS**; TC-F-18..22 + TC-D-10 PASS nesta linha; Eixo G 3/3; **24/24 tools**; ouro **10/10**; 727/727; orçamentos 9.105/8.379/4.833 dentro de 9.200/8.450/4.840 (o quase-toque do ultrathin resolvido pela dieta da estável, sem tecto novo).

## Verificação

Records `docs/acceptance-runs/2026-09-02-v0150-*-v0.20.0-beta.10-*`. Suite 727/727 · check ✅ · golden 10/10 · gate E 16/1/0.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.10` → run Release → `npm view` → commit de fecho (linha «tag recorded» no registry).
