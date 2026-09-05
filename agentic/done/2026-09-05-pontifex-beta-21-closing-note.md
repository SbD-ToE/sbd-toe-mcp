# Nota de fecho — 0.20.0-beta.21 publicada («declarativo primeiro», experiência da beta)

**Date:** 2026-09-05 · **Persona:** Pontifex

- Release: `415534192f02defcb64f60b878df4252851e6957`; tag `v0.20.0-beta.21`; run **33963546721** ✅; npm `beta = 0.20.0-beta.21` (gitHead igual), `latest = 0.19.4` (estável intocada).
- Peça nova: `sbd://toe/activation-vocabulary` (derivado). Selecção = f(declarado); `task` = contexto registado; sem declaração ⇒ `needs_input` (894 tk) com candidatos a confirmar e exemplo executável; `mode` baseline/discover.
- Medição: 5 redacções → **5 conjuntos (discover) vs 1 (declarativo)**; agente 3 vs 1; oráculo **10/10 discover** + **6/4/0 declarativo** (expectativas intocadas); orçamentos dentro; suite 750/750; eval 143: 103/17/0, gate E PASS, 25/25.
- Achados do ponto 8 declarados: `stack` por substring; regex sobre nomes de ficheiro no `activate()` do prepare — ambos só em discover.
- Pendente fora desta lane: decisão do lead sobre a estável; Orchestrator registar TC-F-35/36 no catálogo.
