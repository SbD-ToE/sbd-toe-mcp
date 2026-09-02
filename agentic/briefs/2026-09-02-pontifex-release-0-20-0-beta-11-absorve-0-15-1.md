# Brief: release 0.20.0-beta.11 (linha beta) — absorção do 0.15.1; série da auditoria Desktop fechada nas duas linhas

**Date:** 2026-09-02
**De:** Pontifex
**Para:** Orchestrator (registo; TC-F-23/24 no catálogo já committados por ti, `5114f22` — não editei o ficheiro partilhado) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** ciclo 0.15.1 (lead «vale a pena então estas alterações», 02-09); triagem `2026-09-01-auditoria-desktop-0.14.0-triagem.md`
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.9.0)

## TL;DR

`a3536fde` (0.15.1) cherry-picked; conflitos só nos 4 habituais (resolvidos para a beta + bump beta.11). Mapa 1–7 absorvido por inteiro; superfícies só-beta auditadas pelos padrões antigos (mode/orgScope/next) — limpas. Eval **131: 92/16/0/23, gate E PASS**; TC-F-23/24 + TC-F-05/21 re-corridos PASS; G 3/3; **24/24 tools**; ouro **10/10**; **729/729**; orçamentos dentro dos tectos inalterados (9.122/8.396/4.833; drift +17 tk dos textos 0.15.1, igual à estável).

## Verificação

Records `docs/acceptance-runs/2026-09-02-v0151-*-v0.20.0-beta.11-*` · check ✅ · golden 10/10 · gate E 16/1/0.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.11` → run Release → `npm view` → commit de fecho (linha «tag recorded»).
