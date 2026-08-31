# Serving batch 0.13.0 — read_sbd_toe_resource + stamp provenance.kg + inspect com pin (bundle inalterado)

**Date:** 2026-09-01 · **De:** Pontifex · **Para:** Orchestrator (merge; depois tag+npm automáticos) · programme lead (registo; 1 achado fora de âmbito reportado)

- **Tool nova `read_sbd_toe_resource(uri)`**: espelho de resources/read para clientes sem suporte de resources (Claude Desktop); materializer PARTILHADO com resources/read (zero drift); URIs válidos derivam do `RESOURCE_CATALOG` único (também alimenta resources/list); templados aceitam o valor no URI; desconhecido ⇒ erro declarado com a lista. `codegen_instructions_ref` dos payloads dietados resolve em qualquer cliente. TC-F-16 (runner + doc §4.4).
- **Stamp `provenance.kg`** (= release_tag do pin, `v1.9.0`) em TODAS as respostas (13 tools + envelope + prepare). Medições: +3–4 tokens/fixture — std f2 9.105≤9.200, min 8.379≤8.450, ultrathin 4.833≤4.840 — **nenhum tecto tocado** (sem paragem). Snapshots regenerados (+1 linha). TC-F-17.
- **Inspect**: linha "Pin servido (consumed-bundle.json)" com kg/manual/ontologia; hipótese do Orchestrator CONFIRMADA com correcção fina: o run_manifest ATÉ segue no tarball (`files` do package.json), mas o gateway lê o do CHECKOUT upstream (dev-only) — em produção não existe → n/d; agora os campos do checkout caem com fallback declarado. Fóssil "Substrate version: v2-draft" intocado (lane do KG).
- **Varrimento**: "223" (real 273) removido da descrição da verification-matrix; "8 inference rules / 4 pipelines" removidos; "15 chapters" → "Chapters 00–14". Contagens governadas por dados não vivem em prosa.
- **`release_ref`** normalizado `Shiftleftpt`→`SbD-ToE` no pin E no default do sync-bundle (senão regressava no próximo pin).
- **Ensino**: instructions + guide com "Step 0 — identify the server" (sbd://toe/version via resources/read ou via a tool nova); resource na tabela; 2 linhas de routing.
- Verificação: 689/689; eval `2026-09-01`: **121 cenários, 80/18/0 FAIL/23 — gate E PASS**; ouro **10/10** sem divergência; **23/23 tools**.

## Fora de âmbito — reportado, não corrigido
1. O registo de autorização citado (`agentic/done/2026-08-31-lote-formal-…-beta.7.md`) **não existe** em done/ nem no hub — prossegui com o dispatch do lead como autorização directa; o Orchestrator deve materializar o registo.
2. A emenda v0.11.0 (afinal foi tagged/publicada — os registos do #62 dizem o contrário) continua pendente de autorização.
