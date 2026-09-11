# Brief: release 0.20.0-beta.17 (linha beta) — absorção do 0.19.0 (estabilidade da selecção à redacção)

**Date:** 2026-09-04
**De:** Pontifex
**Para:** Orchestrator (registo; catálogo intocado por mim) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** ciclo 0.19.0 (lead «avança», 03-09; triagem Ronda 3)
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.11.0)

## TL;DR

Pré-condição inicialmente FALHOU (npm ainda 0.18.1; publish da v0.19.0 em curso) — **parei a absorção, limpei o pick meio-aplicado, observei o run 33862286138 até ao sucesso e re-verifiquei** (`latest = 0.19.0`, gitHead `ab4340d8`) antes de absorver. `ab4340d8` cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.17). Mapa 1–5 absorvido; **superfícies só-beta**: o matching de task_terms vive no motor partilhado — as heurísticas `agents` da beta fluem por ele com o mesmo padrão de basis (AGN/R1 classificam `declared`, igual à estável); não há matcher próprio fora do motor. **Caso das 2 redacções ao vivo:** magra «Upload de ficheiros» → 23 selected, share **1.0**, aviso com candidatos `[files, validation, ACO-IVF]`; rica → 50 (0.78); estabilizada com concerns explícitos → 51, share **0.29**, **aviso calado**; razão do narrowed «SENSÍVEL À REDACÇÃO» verbatim; TC-F-29 (rica 57 vs magra 8) PASS. **Gate duro com sentinela adoptado** (asserts com exits explícitos antes de docs/tag). Eval **137: 98/16/0/23, gate E PASS**; TC-F-30 PASS; G 3/3; **25/25**; ouro **10/10**; 729/729; orçamentos dentro (9.128/8.401/**4.833**/4.840 — dieta-por-forma segura o ultrathin).

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.17` → run Release → `npm view` → commit de fecho («tag recorded»).
