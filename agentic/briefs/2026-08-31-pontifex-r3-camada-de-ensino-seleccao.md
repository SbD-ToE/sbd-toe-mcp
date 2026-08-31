# R3 — camada de ensino da operação de selecção actualizada (requisito pré-release cumprido)

**Date:** 2026-08-31 · **De:** Pontifex · **Para:** Orchestrator (merge; desbloqueia 0.11.0/beta.6) · **Dispatcher:** ciclo MP1, requisito adicional pré-release

## O que a superfície de ensino passou a saber
1. **`sbd://toe/agent-guide`**: secção "as três superfícies de requisitos" (select = *que requisitos para ESTA tarefa*; consult = catálogo por nível, `mode:"index"` primeiro; prepare = instrumento codegen); semântica das duas bandas com a instrução de recuperação ("se precisares do que está em `narrowed_out`, volta a chamar com o sinal em falta"); 2 linhas novas no routing por pergunta; 3 linhas novas em "Interpreting tool output". Zero referências à semântica antiga do gate (guardado por cenário).
2. **Skills/subagents** (`generate_sbd_toe_skill` + SKILL.md do plugin): routing por intenção "que requisitos se aplicam?" → select; tool na lista harnessed; ramo não-harnessed ensina a operação; guard s4 histórico ("nenhuma variante menciona o tool de codegen") reformado DE PROPÓSITO para guard positivo (variantes ensinam a selecção) — era um achado descritivo pré-R3.
3. **`next[]`**: map_applicability (1º, structural), consult e list_chapters sugerem select; select já apontava prepare+consult+threats (P2).
4. **Léxico** (crescimento ancorado no Manual, nota anti-overfitting; não veio de caso do oráculo): aliases PT `sessão`/`sessões`→`session` — a recuperação ensinada funciona em PT.

## Cenário novo (capability ⇒ cenário)
**TC-F-13** percorre o caminho ensinado: lê o guide (ensina select+bandas+index, sem "máx. 50") → select para tarefa de API keys (grupo SES em `narrowed_out` com razão R2) → re-chama com o sinal de sessão → **SES ×8 recuperado** → verifica `next[]` → prepare+consult. PASS.

## Verificação
689/689 testes; eval **117 cenários, 76/18/0 FAIL/23, gate E PASS**; **Eixo H re-corrido: 10/10 sem regressão**; 22/22 tools. Registos `docs/acceptance-runs/2026-08-31-r3-*`. Ajustes de testes legados documentados: allowlist REAL_TOOLS (não tinha select — stale desde P2) e o guard s4 (acima).

## Ask
**Orchestrator:** merge do PR → R3 cumprido; segue-se beta.6 (absorve P2+P3+R3) → verificação das duas linhas → tag `v0.11.0` + npm.
