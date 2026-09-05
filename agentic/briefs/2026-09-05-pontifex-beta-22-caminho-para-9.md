# Brief: 0.20.0-beta.22 — «o caminho para 9»: os 7 itens da validação externa, fechados

**Date:** 2026-09-05
**De:** Pontifex
**Para:** programme lead (registo; 3 caudas P2/P3 para triagem) · Orchestrator (cenários TC-F-37/38 novos; TC-F-27 actualizado) · avaliador externo (as 7 sondas, antes→depois)
**Autorização:** lead «avança» (2026-09-05); §12 da nota de desenho
**Natureza:** relatório de execução (linha beta; bundle e estável INALTERADOS)

## TL;DR

Os 7 itens estão fechados e as sondas do avaliador viram todas de ✗ para ✓. O item 1 (P1-A) foi tratado como **invariante** e não como cenário — e a invariante **apanhou duas instâncias que a sonda não alcançava** (o nível esvazia a selecção; caminhos que não casam a tabela). Suite 756/756; eval 145: 105/17/**0**, gate E PASS; ouro discover 10/10, declarativo 6/4/0; orçamentos: série histórica byte-idêntica, caminho declarativo +9/+12 tk (o custo do rasto que faltava).

## As 7 sondas — antes → depois

| # | Item | Sonda | Antes | Depois |
|---|---|---|---|---|
| 1 | **P1-A** guarda anti-zero | `exposure=local` + `data_sensitivity=low` | `selected:[] `, `needs_input:false` | `needs_input` + `inert_declarations:["exposure=\"local\"","data_sensitivity=\"low\""]` |
| 2 | local/low inertes | vocabulário | omitidos do `closed_set` | publicados com `inert: true` + nota |
| 3 | **P1-B** gralha | `concerns:["authz","auth"]` | `authz` descartado em silêncio | `unknown_concerns{values, valid_values(24), vocabulary_resource, note}` |
| 4 | **P1-C** um contrato | enum servido | select **ausente** · consult **13** · prepare **ausente** | **24 · 24 · 24**, gerado pelo builder do recurso |
| 5 | **P1-D** traço do stack | `stack:"docker e kubernetes"` | 2 capítulos, **0** traços | `stack_token` ×1 (só `kubernetes` é do vocabulário) |
| 6 | **P1-E** regra nomeada | `technologies:["jwt"]` | SES-008 entra, **0** traços | `named_rule/SES-008/jwt` no trace |
| 7 | **P2-A** etiqueta órfã | `concerns:["auth"]`, task vazio | 1 × `task_term` | 0 × `task_term`, 1 × `concern_slice_mapping` |

## A invariante do ponto 1 (o que ela apanhou além da sonda)

`declarative-invariants.test.ts` varre **192 combinações declaráveis** (níveis × exposure × data_sensitivity × cada concern × cada tecnologia × stack × changed_files × gralhas) e exige: **nenhuma selecção vazia sem `needs_input`** e **nenhum `needs_input` com selecção**. Apanhou duas instâncias novas da mesma família:

1. **o nível esvazia** — `privacy`/`threat_modeling` em L1 activam categorias mas nenhum requisito se aplica ao nível: agora `needs_input` que diz que **o problema é o nível**, em que níveis existe, e junta `excluded_by_level` (15 grupos) como prova;
2. **caminhos sem padrão** — `changed_files:["Dockerfile"]` não casa a tabela: inércia **nomeada** (apanhado pelo cenário TC-F-27, que passou a declarar a tecnologia).

Segunda propriedade transversal testada: **toda a activação tem traço** (stack→`stack_token`, regra→`named_rule`, sem `task_term` no declarativo) e **toda a ausência tem aviso** (inválido → `unknown_concerns`; inerte → `needs_input`; exclusões → `narrowed_out`/`excluded_by_level`).

## Fora de âmbito (reportado, não corrigido)

- **P2-B** `get_threat_landscape` alarga em vez de estreitar (10/15 capítulos, ~8,4k tk, sem ordenação por relevância).
- **P2-C** `changed_files` em fase de design (quem ainda não tem código) — **decisão de contrato do lead**; esta vaga apenas torna a inércia **visível e nomeada**.
- **P2-D** granularidade de capítulo em `technologies` (`containers` traz 22 reqs de IaC).
- **P3** deriva de docs — com destaque para a **contradição declarada**: `prepare` dizia «preferir `stack`» e o `select` diz «preferir `technologies`». Corrigi só o que o P1-C tocava (descrição dos `concerns`); **a contradição do `stack` fica registada** (com `src/config.ts` na tabela geral e o jargão PT/EN).

## Verificação

Suite **756/756**; check ✅; eval **145: 105/17/0/23**, gate E PASS, 25/25 tools; ouro **discover 10/10** + declarativo **6/4/0**; orçamentos: discover byte-idêntico (f2 9 092/8 365/4 796), declarativo f1 19 147/6 495/5 848/3 838 e f2 24 776/8 077/7 351/4 657.

## Pendente (fora desta lane)

1. **Lead:** triagem de P2-B/C/D e P3; decisão sobre migrar a linha declarativa para a estável (agora com o 9 na mão).
2. **Orchestrator:** registar TC-F-37/38 no catálogo partilhado (executável já no meu repo).
