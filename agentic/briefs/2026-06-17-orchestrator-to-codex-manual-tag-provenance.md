# Brief — Codex: carimbar a tag/release REAL do Manual na proveniência da bundle

**De:** Orchestrator · **Para:** Codex (KG builder) · **via:** Pontifex (consome a bundle) · **Data:** 2026-06-17
**Prioridade:** gate de proveniência da release `0.10.0` (decisão do programme-lead pendente — ver fim).

## Problema (verificado ao vivo no `sbd://toe/version`)

O resource de versão do MCP reporta:
```
manual: { version: "0.1.0", commit: "09b20f6fd2714a44b974d4ba38612f4dfdc73c11", generated_at: "2026-06-12T03:02:41Z" }
kg:     { release_tag: "kg-v1-manual-v1.6.4-aligned-2026-06-15", sha256: "caa8cfef…", ... }
```
**`manual.version: "0.1.0"` é um placeholder** e contradiz o próprio KG tag, que codifica
`manual-v1.6.4`. O MCP só **ecoa** o que a bundle carrega; **não deriva** a versão do Manual.
O Pontifex também não a pode inventar (preservation protocol: proveniência nunca inventada).
**Só o Codex** — que compila o KG a partir do Manual — sabe qual a release/tag do Manual usada.

## Princípio

O MCP pode (e deve) afirmar: *"sirvo a KG bundle `<tag>@<sha>`, compilada do Manual `<tag-real>` (commit `<sha>`)"*.
A parte `<tag-real>` do Manual tem de ser **carimbada pelo Codex** na proveniência da bundle, de forma
consistente com o componente `manual-vX.Y.Z` que o Codex já põe no KG release_tag.

## Pedido

1. **Determinar a release/tag real do Manual** que foi o input desta build (commit `09b20f6f…`).
   - Se esse commit corresponde a uma **git tag** do `SbD-ToE-Manual` (provável `v1.6.4`, dado o KG tag), carimbar essa tag.
   - Se a build usou um **commit sem tag** (dev-build untagged), **dizê-lo explicitamente** — ex. `version: null, tag: null, commit: "09b20f6f…", note: "untagged dev-build off vX.Y.Z line"` — **nunca** um número fabricado como `"0.1.0"`.
2. **Emitir a proveniência do Manual na bundle** com os campos:
   `manual: { tag: "<git-tag-ou-null>", version: "<release-ou-null>", commit: "<sha>", generated_at }`
   — para que flua para `consumed-bundle.json → inputs.manual` e o MCP o ecoe sem contradição com o KG tag.
3. **Consistência cruzada:** o `manual-vX.Y.Z` embutido no KG `release_tag` e o `manual.tag/version`
   estruturado têm de concordar. Hoje não concordam (`v1.6.4` no tag vs `0.1.0` no campo).
4. **Re-emitir** a bundle (ou um patch de proveniência digest-verificável) → Pontifex re-sincroniza
   o pin (`scripts/sync-bundle.mjs`, verificação sha256) → o `sbd://toe/version` passa a mostrar a
   tag real do Manual.

## Definição de pronto
- `sbd://toe/version` mostra a tag/release REAL do Manual (ou `null` + nota honesta se untagged), consistente com o KG tag.
- Zero placeholders (`0.1.0` eliminado).
- Pontifex re-pina com sha verificado; smoke-âncora confirma o resource.

## Gate da release 0.10.0 — DECIDIDO: corrigir ANTES (programme-lead, 2026-06-17)
A integridade de proveniência é o que o `PROGRAMME-PRESERVATION-PROTOCOL` exige. **A 0.10.0 NÃO
publica até esta correção estar feita e re-pinada.** Sequência: Codex carimba a tag real do Manual
→ Pontifex re-sincroniza o pin (sha-verificado) + confirma `sbd://toe/version` → só então o
programme-lead publica. É o **primeiro passo** da cadeia de release.
