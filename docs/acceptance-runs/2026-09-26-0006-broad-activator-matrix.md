# Matriz dos activadores largos — antes / depois da decisão 0006 — 2026-09-26

Decisão: `agentic/decisions/0006-activadores-largos-trazem-contexto.md` (opção A). Reprodutível com
`node scripts/measure/broad-activator-context-matrix.mjs <worktree-antes> [out.json]`. O «antes» é a build de `89fa703`. Os
dados estão em `2026-09-26-0006-broad-activator-matrix.json`. Pino KG v1.12.0: os números **serão re-medidos contra o bundle
novo** no ciclo completo.

**Casos:** em L1, L2 e L3, cada `exposure` (3), cada `data_sensitivity` (3) e as 9 combinações; mais o caso do avaliador e o
exemplo dos docs. São 47 declarações em `lista` e `standard`: 94 casos. Os lotes executam-se com o task original.

| | antes | depois |
|---|---:|---:|
| declarações com **zero** entidades G2 no `full` | **46 / 47** | **0 / 47** |
| entidades G2 no `full`, somadas | 43 | 5 747 |
| prontos / decompostos | 70 / 24 | 42 / 52 |
| lotes, no total | 48 | 116 |
| decomposições de um só lote | 0 | 0 |
| decomposições cuja união devolve **exactamente** as fatias do pedido | — | 52 / 52 |
| violações (lote não pronto, fora do envelope, custo declarado ≠ recebido) | 0 | 0 |
| tokens medidos, somados | 697 k | 905 k (+29,8 %) |

**Casos nomeados:**

| caso | antes | depois |
|---|---|---|
| avaliador (L3, public + personal) | G2 **0**; `lista` 12 224 tk → 2 lotes | G2 **163**; 14 975 tk → 3 lotes |
| exemplo dos docs (L2, auth+logging+jwt+public) | G2 43; 10 780 tk → 2 lotes | G2 144; 12 289 tk → 2 lotes |

**Latência:** a primeira chamada de um processo leva cerca de 1,1 s (carregamentos e calibração). A quente, uma decomposição com
activadores largos leva 210–430 ms.
