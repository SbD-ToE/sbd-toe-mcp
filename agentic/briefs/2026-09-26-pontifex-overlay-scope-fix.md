---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-26"
---

# Overlay regulatório no `prepare`: diagnóstico e correcção (branch `fix/overlay-scope`, não publicado)

**Data:** 2026-09-26 · **Persona:** Pontifex · **Para:** Orchestrator (→ lead: pergunta binária no §3)
**Autorização:** mensagem directa do Orchestrator 2026-09-26 (decisão do lead): diagnóstico e correcção num branch, com teste;
sem merge, sem tag, sem publicação, sem dist-tag.

## 1. (a) Desde quando, e que regulamentos

Medido em cada versão publicada (pacote npm corrido via `npx`) e no `master` (0.21.0), caso `auth`+`logging`, L2:

| framework | 0.19.4 (`latest`) | 0.20.0 | 0.21.0 | mapeamentos |
|---|---:|---:|---:|---:|
| RGPD | overlay 117k tk | 117k | 117k | 1 691 → 1 693 |
| DORA | 116k | 116k | 116k | 1 663 → 1 665 |
| NIS2 | 82k | 82k | 82k | 1 165 → 1 167 |
| CRA | 131k | 131k | 131k | 1 733 → 1 737 |
| AI Act | 54k | 54k | 54k | 748 → 750 |
| ENISA-CSA | 0 | 0 | 0 | sem obrigações publicadas |

(overlay em `standard`; o `full` soma ~8k). **O defeito vem de trás da 0.20.0 — está no `latest` que toda a gente instala.**
Afecta os cinco regulamentos com obrigações publicadas. A causa é de serving (minha): `resolveOverlay` junta os mapeamentos de
todas as obrigações do framework sem os cruzar com o âmbito activado; os dados do overlay estão correctos.

## 2. (b) A correcção

Branch `fix/overlay-scope` sobre `master` @ `d603a83`. Um mapeamento serve-se quando o alvo está no âmbito activado
(requisito ou controlo activado; EP de requisito activado; capítulo de requisito activado). EP que espelha um mapeamento de
requisito servido elide-se como derivável. As **obrigações ficam completas** (são ids citáveis). O resto conta-se em
`regulatory_overlay.mappings_scope` com `rest_ref` executável e `note_id`. Efeito: RGPD `lista` **123 056 → 11 549 tk** (−91%);
os outros quatro caem na mesma proporção. Acima do envelope, o payload continua a dizê-lo.

Prova: teste novo (17 casos), vitest 833/833, `check`, smoke, aceitação gate PASS, Eixo H 10/10. Detalhe no CHANGELOG
(«Não publicado»).

## 3. (c) A relação com a decisão parqueada: tectos por contagem vs por custo projectado

A correcção **não precisa** dessa decisão: é um defeito de âmbito e fica certa em qualquer das duas respostas.

Mas mostra o limite do tecto por contagem com mais clareza do que o caso dos 48 requisitos longos. Com o overlay, uma tarefa de
36 requisitos (abaixo do tecto 52) ainda custa ≈11,5k tk em `lista`, porque o overlay pesa 3–6k tk **independentemente do número
de requisitos**. O tecto conta requisitos e não vê esse peso: a resposta sai pronta e declara `within_envelope: false`.

**Pergunta ao lead (binária):** os tectos de `lista` e `standard` passam a ser por **custo projectado** — incluindo o overlay e a
variância por requisito — em vez de por **contagem**?
- **Sim:** uma chamada que projecte acima do envelope devolve `needs_decomposition` com lotes (o mecanismo já existe), e o
  envelope passa a ser uma promessa verdadeira por construção. Custa uma 0.21.x com o modelo de custo e testes.
- **Não:** fica como está — contagem, e o payload declara quando passa o envelope.

## 4. Fora deste branch (declarado)

Os mapeamentos restantes ainda repetem `framework_id` e `mapping_id` derivável; uma dieta de serialização tiraria ~1k tk. Não o
fiz — é forma, não âmbito, e cabe numa decisão à parte.
