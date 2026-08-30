# Nota de fecho — 0.20.0-beta.4 (linha beta) publicada

**Date:** 2026-08-30 · **Persona:** Pontifex

- Commit de release: `d89b30dfacbc89c023ec53c1b5b882b77a9f86a9` em `origin/0.20-beta` (fix-forward sobre `272d8c9`, que ficou com um marcador de conflito no change log do FREEZE-REGISTRY — corrigido no commit seguinte, histórico append-only); tag anotada `v0.20.0-beta.4` (objecto `6291f50d`) nesse commit.
- `release.yml` run **33282763025** ✅ (validate, branch check, bundle, GitHub pre-release 3 assets, `npm publish --tag beta`).
- npm: `dist-tags = { beta: 0.20.0-beta.4, latest: 0.10.3 }`; `@0.20.0-beta.4` gitHead `d89b30df…`; `@0.10.3` gitHead `06f8bbaa…` (inalterado).
- Pin: formal KG `v1.6.1` (`df6920cb…f547b`, v1.12, Manual v1.7.1) — igual à estável 0.10.3.
- `eval:acceptance` gate PASS (102: 59/20/0/23; 21/22 tools — `trace_sbd_toe_graph` sem cenário → follow-up Axis G).
- Orçamentos: f1 6.280/5.641/3.746 (112 ids); f2 8.617 (≤8.700 ratificado)/7.898/4.642.
- Pendente (fora de Pontifex): cenário Axis G para a lente SPARQL; TC-E-01/02 PART owner `graph`.
