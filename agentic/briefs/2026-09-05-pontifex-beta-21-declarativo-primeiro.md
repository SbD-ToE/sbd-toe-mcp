# Brief: 0.20.0-beta.21 — experiência «declarativo primeiro» na linha beta (o MCP responde ao que o LLM declara)

**Date:** 2026-09-05
**De:** Pontifex
**Para:** programme lead (números da experiência — a decisão sobre a estável é tua) · Orchestrator (registo; 2 achados do ponto 8; cenários re-tratados) · avaliador externo (a tese encenada, medida)
**Autorização:** decisão do lead 2026-09-05 («fazemos isso no beta!»); desenho vinculativo `DevelopmentGovernance/docs/mcp-declarative-first-design-note.md` §§3/7/8/9
**Natureza:** relatório de execução de experiência (linha beta; **a estável não muda**); bundle INALTERADO (KG v1.11.0)

## TL;DR

A selecção deixou de depender da REDACÇÃO. Mesma feature em 5 redacções: **discover dá 5 conjuntos diferentes (0–58 requisitos); declarativo dá 1 conjunto (44, constante)**. Caso do agente: 3 conjuntos vs 1. A ausência de declaração deixou de ser zero silencioso: é `needs_input` (894 tk) com vocabulário, candidatos **a confirmar** e exemplo copiável que, seguido à letra, selecciona. O oráculo histórico corre em `discover` e mantém **10/10** (continuidade); o conjunto declarativo novo dá **6 PASS / 4 PART / 0 FAIL** com as expectativas do oráculo **intocadas**.

## Forma do `sbd://toe/activation-vocabulary`

Derivado (nunca escrito à mão) das tabelas do próprio motor + bundle: `provenance`, `contract`, `how_to_use` (6 passos), `risk_level` (+baseline por nível), `concerns` (24, cada um com `activates_categories`, `activates_chapters`, `requirements_at{L1,L2,L3}`), `exposure` (3), `data_sensitivity` (3), `technologies` (9, incl. `jwt`→regra SES-008), `changed_files` (13 padrões de path), `roles` (13), `phases` (8), `not_activators` (`task`, `stack`). ≈2,9k tokens. Teste garante que a promessa (`auth@L2 = 27`) bate certo com a selecção real.

## Exemplo de `needs_input` (verbatim, resumido)

```
reason: "Nenhum activador DECLARADO nesta chamada. O servidor não interpreta prosa: não
         adivinha o âmbito a partir do `task`, e não devolve zero em silêncio…"
vocabulary_resource: "sbd://toe/activation-vocabulary"
candidates_to_confirm: { note: "SUGESTÃO A CONFIRMAR, não selecção…",
                         from_task_text: ["api","auth","files","logging","validation"] }
example: { tool: "select_sbd_toe_requirements",
           with: 'risk_level="L2", concerns=[api, auth, files]' }
baseline_escape_hatch: { with: 'risk_level="L2", mode="baseline"' }
next: [read_sbd_toe_resource(vocabulário) → select(declarando) → select(baseline)]
```

## Medição — os dois modos

| Caso | discover | declarativo |
|---|---|---|
| Feature A, 5 redacções | **5 conjuntos**, N 0–58, 2 502–7 114 tk | **1 conjunto**, N 44, ~5 925 tk |
| Agente, 3 redacções | **3 conjuntos**, N 0–47 | **1 conjunto**, N 29 |
| Oráculo (10 casos) | **10 PASS / 0 / 0** | **6 PASS / 4 PART / 0 FAIL** |
| Fixtures da dieta f1/f2 | 18 773/6 099/5 452/3 651 · 25 193/9 092/8 365/4 796 | 19 138/6 495/5 848/3 838 · 24 764/8 077/7 351/4 657 |

Os 4 PART do braço declarativo (GC-01 90 %, GC-02 95 %, GC-03 55 %, GC-05 79 %) são resultado honesto: as expectativas históricas foram construídas contra o motor inferencial. **Nada foi ajustado ao oráculo.**

## Resposta ao ponto 8 (verificado ANTES de mexer)

- `changed_files` → **tabela de padrões de path** publicada: legítimo, mantido.
- `technologies` → **lookup exacto**: legítimo, mantido (e agora também aceite pelo `prepare`, que as ignorava).
- **Achado (a):** `stack` fazia `includes(token)` sobre texto livre → no declarativo só conta por **token exacto** do vocabulário.
- **Achado (b):** o `activate()` do prepare fazia **regex sobre nomes de ficheiro** (`route|controller|handler|endpoint → api`, …) → é inferência, fica em `discover`.

## O que removi e o que ficou em discover

Removidos do caminho declarativo (perderam objecto): `basis: lexical` (fica valor único `declared`), `lexical_dominance_warning`, `empty_selection_warning`, regra **R2**, e a activação por termos/aliases/compostos/intenções (incl. o homónimo da imagem). **Todos continuam vivos e testados em `mode: "discover"`.** A regra **SES-008** sobreviveu com gatilho declarado (`technologies: ["jwt"]`).

## Cenários

12 marcados **DISCOVER-ONLY** (TC-A-01/02, TC-F-11..15, TC-F-19, TC-F-29, TC-F-31, TC-F-32, TC-F-33) + **2 novos**: TC-F-35 (needs_input → declaração → estabilidade → baseline) e TC-F-36 (vocabulário fechado, derivado e executável). Edições em `scripts/acceptance/scenarios.mjs` (executável, meu repo) — **o catálogo em DevelopmentGovernance não foi tocado**; o registo dos dois cenários novos lá é lane do Orchestrator.

## Verificação

Suite **750/750**; `check` ✅; eval **143 cenários: 103/17/0/23, gate E PASS**, 25/25 tools, Eixo G 3/3, Eixo H 10/10 (discover). Registos: `docs/acceptance-runs/2026-09-05-declarativo-*`.

## Pendente (fora desta lane)

1. **Programme lead:** decidir se a tese passa à estável (seria major + contrato v1.18) — os números estão aqui.
2. **Orchestrator:** registar TC-F-35/36 no catálogo partilhado; decidir se o oráculo ganha um conjunto declarativo oficial.
