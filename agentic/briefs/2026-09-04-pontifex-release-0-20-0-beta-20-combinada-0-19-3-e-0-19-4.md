# Brief: release 0.20.0-beta.20 (linha beta) — vaga COMBINADA: 0.19.3 + 0.19.4; a invariante corrida sobre as superfícies só-beta

**Date:** 2026-09-04
**De:** Pontifex
**Para:** Orchestrator (registo; **fecho da queixa da ronda 6 nesta linha** — 2 defeitos apanhados e corrigidos) · programme lead (registo) · Codex (sem impacto — bundle inalterado)
**Autorização:** vaga combinada decidida pelo lead (04-09); secções «Ronda 5/6», «Remédio» e «Sequência decidida» da triagem
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`); bundle INALTERADO (KG v1.11.0)

## TL;DR

Pré-condição verificada ANTES de qualquer pick (`latest = 0.19.4`, gitHead `19709b82`; run 33905492613 ✅). Dois cherry-picks por ordem (`12c5188c` → `19709b82`), aplicados em sequência e **esmagados num único commit de release**; conflitos: os 4 habituais em ambos + `src/index.ts` no 2.º (resolvido à mão: texto completo da beta para `detail` **mais** a frase nova dos tectos do 0.19.4). A invariante next-verbatim foi **estendida às referências executáveis desta linha** e apanhou **2 defeitos reais**, ambos corrigidos nesta vaga. Caso 88-reqs reproduzido com round-trip 3/3. Eval **141: 102/16/0/23, gate E PASS**; ouro **10/10**; **739/739**; orçamentos com folga.

## O que a invariante apanhou nas superfícies só-beta (lista completa)

Ficheiro novo `src/serving/next-invariant.beta.test.ts` (só-beta): colhe TODA a referência executável de `prepare` (4 níveis + `include_relations` + `debug`), `trace_sbd_toe_graph` (3 lentes + anchor vazio), `select` e `trace_sbd_toe_requirement_sources` — **32 referências colhidas ao vivo** — e valida contra os schemas reais do `tools/list`.

| # | Onde | Defeito | Estado |
|---|---|---|---|
| 1 | `prepare(standard\|minimal).provenance_legend.note` | servia `sbd://toe/codegen-instructions/{mode}` **sem nomear a tool que o executa** | **CORRIGIDO** → `read_sbd_toe_resource(sbd://…)` |
| 2 | `prepare(ultrathin).provenance_legend.note` | idem, na legenda do ultrathin | **CORRIGIDO** (mesma forma) |
| — | `prepare(*).codegen_instructions_ref.resource` | URI em campo próprio, mas o `note` irmão nomeia a tool | **não é defeito** (regra normativa é ao nível do objecto) — declarado |
| — | campos `tool` (todos) | zero «…», zero «?», zero URIs | **classe da ronda 6 morta nesta linha** |
| — | `relations_ref.lenses[]` | `lens`/`anchor` validam contra o enum real do `trace_sbd_toe_graph` | conforme |
| — | `with` em objecto (`descriptions_ref`, `groups_ref`, `evidence_patterns_rest`, `v1_diagnostics_ref`) | chaves e enums existem no destino | conforme |

A regra do URI ficou **guardada em permanência** (2.º `it()`): todo o objecto que serve um `sbd://` tem de nomear `read_sbd_toe_resource` no mesmo objecto. Custo da correcção: as legendas encolheram no total (a nota compacta dos slots, vinda do 0.19.3, devolveu folga) — orçamentos abaixo dos de beta.19.

## Caso 88-reqs nesta linha (0.19.4)

`minimal`, L3, público, dados pessoais, FastAPI → **88 seleccionados > tecto 78** ⇒ `needs_decomposition` DECLARADO com `requirement_ceiling {selected 88, limit 78, projected 9.098 tk > promise 8.450 tk, 3 lotes}` numa resposta de **886 tokens** (em vez de ~9,1k). **Round-trip da receita ensinada: 3/3 lotes prontos dentro do tecto** — `[auth]` 44 reqs, `[secrets]` 16, `[validation]` 31 (a receita manda deixar os activadores largos FORA porque concerns SOMAM). `full` sem tecto: 88 reqs, `ready_for_codegen` — o nível do oráculo.

## Verificação

Eval (`2026-09-04-v0194-*-v0.20.0-beta.20-*`): 141 cenários, 118 executados, **102/16/0/23**, gate E PASS; TC-F-33/34 PASS; Eixo G 3/3; 25/25 tools; ouro **10/10**; suite **739/739**; `check` ✅. Orçamentos: f1 18.773 / 6.099 / 5.452 / 3.651; f2 25.193 / **9.092**/9.200 / **8.365**/8.450 / **4.796**/4.840.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.20` → run Release → `npm view` → commit de fecho («tag recorded»).
