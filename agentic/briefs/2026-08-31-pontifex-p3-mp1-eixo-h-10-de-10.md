# P3 — regras pós-P2 aplicadas; Eixo H **10/10 PASS** na estável (oráculo intocado)

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** Orchestrator (merge do PR; beta.6 a seguir) · programme lead (resultado do ciclo MP1) · **Dispatcher:** decisões de regra pós-P2 ("sim sim")

## Resultado
| | 0.10.4 | P2 (0.11.0) | **P3 (0.11.0 final)** |
|---|---|---|---|
| Eixo H | 1 PASS/3 PART/6 FAIL | 6/4/0 | **10 PASS / 0 PART / 0 FAIL** |
| prepare cobertura média | 41% | ≈96% | **100%** (precisão-estrita 100%, 0 must-NOT) |
Registos: `docs/acceptance-runs/2026-08-31-p3-axis-h-selection-v0.11.0.{md,json}` + eval completo `2026-08-31-p3-v0.11.0-acceptance.*` (116 cenários, 0 FAIL, **gate E PASS**, 22/22 tools, 689/689 testes). Oráculo nunca editado; nada afinado ao oráculo — só regras de serving declaradas.

## O que fechou cada caso
- **GC-07 → R1 `R1:principal-nao-humano`** (regra nomeada no `selection_trace`): `agents` selecciona {ACC-002, AUT-006, ENC-006} ∪ {DEP-011, DEP-013, DEP-014} (ARC-015).
- **GC-02 → R2 `R2:narrowing-de-sinais-SES`**: sem sinais de sessão/login/token de utilizador, SES-* sai para `narrowed_out` com razão; com eles (GC-01 "autenticação de utilizador", GC-08 "login e sessão JWT") fica. concernsMap do loader INTACTO (via de dados anotada).
- **GC-03 → sinal**: `deployment` activa também a categoria base DST (DST-006).
- **GC-10 → sinais**: `mtls` → +`secrets` (CFG-006, material criptográfico); `message queue` → +`logging` (LOG-001). E o gate de decomposição passou a contar **superfícies** (famílias dos concerns PRIMÁRIOS de cada sinal — `decompositionFamilies`): concerns de suporte do mesmo sinal não pedem decomposição; GC-10 (1 integração legítima) deixa de ser travado; os negativos multi-superfície continuam a decompor (`sliceFamilies`/grounding intocados).

## Efeitos colaterais medidos e declarados
R2 nas fixtures da dieta: −8 citações cada (SES-001..008; 112→104, 151→143), snapshots golden regenerados (diff puro-SES). Tectos da estável confirmados COM FOLGA: standard f2 8.446 ≤ 8.900; minimal 5.463 ≤ 5.950 e 7.720 ≤ 8.200; standard f1 6.109 ≤ 6.500. Contrato do KG intocado.

## Asks
1. **Orchestrator:** merge; depois beta absorve P2+P3 (0.20.0-beta.6) e re-corre H na beta; só então tag `v0.11.0` + npm (duas linhas verificadas).
2. **Lead:** ciclo MP1 atinge o alvo 10/10 — a via de dados do concernsMap (`auth→SES`) fica anotada para o loader num ciclo futuro; lacunas de catálogo do oráculo (ficheiros, mensageria, API keys) continuam com o Author.
