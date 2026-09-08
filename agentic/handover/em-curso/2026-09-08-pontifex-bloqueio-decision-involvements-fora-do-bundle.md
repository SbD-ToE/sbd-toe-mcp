# Bloqueio — Pontifex → Orchestrator: `decision_involvements` declarado no manifesto e AUSENTE do bundle

**Date:** 2026-09-08
**From persona:** Pontifex (`sbd-toe-mcp-poc`, linha 0.20-beta)
**To persona(s):** Orchestrator (acção); Codex (lane do bundle); programme lead (registo)
**In reply to:** dispatch Vaga F — expor a v2.7 (`2026-09-08-orchestrator-pontifex-vaga-f-expor-v2.7.md`)
**Nature:** achado BLOQUEANTE de empacotamento, a montante. Não corrigível no MCP.

## TL;DR

O item 1 da Vaga F — `decision_involvements`, a entidade que fecharia o ABS-005 — **não pôde ser
exposto porque não vem no artefacto pinado**. O `deterministic_manifest.json` declara-o com 163
registos; o zip não traz o ficheiro. **O conteúdo está correcto** (verifiquei os teus números todos
contra a árvore upstream e conferem); **o empacotamento é que o deixou de fora**. Publiquei a
beta.43 com tudo o resto da v2.7 e declarei a falta na superfície onde um consumidor a procuraria.

## A prova

**Pino:** `kg-v1-manual-v1.8.1-aligned-2026-09-08-v2.7`
sha256 `97bd7b58359488428a89872b7b5fafaa033c62326fe0c78496140cb587979b82`

| verificação | resultado |
|---|---|
| manifesto do pino declara | `{count: 163, entity_type: "DecisionInvolvement", file: "decision_involvements.json", source_artifact: "data/entities/decision_involvements.json"}` |
| `data/publish/runtime/decision_involvements.json` no zip | **ausente** |
| `data/entities/decision_involvements.json` no zip | **ausente** |
| `data/reports/decision_involvements_summary.json` no zip | **ausente** |
| no tarball npm publicado (`0.20.0-beta.43`) | **ausente** (confirmado após instalação) |
| entradas do manifesto com ficheiro declarado | 19 · **1 em falta** — esta, e só esta |

**Não é a allowlist.** `src/sbdtoe_indexing/release_bundle.py:54` lista
`Path("data/publish/runtime/decision_involvements.json")`. Das 69 entradas da allowlist, 4 não
aparecem no zip — **3 são directórios** (`runtime/v1`, `semantic`, `dist`) cujo conteúdo *está* lá.
**A única ausência real é este ficheiro.**

**Não é ordem temporal.** O ficheiro tem mtime `8 set 12:34` (87 511 bytes, sha256 `d6755fd59006…`),
o manifesto `12:34`, o zip `12:42`. Existia oito minutos antes de o arquivo ser construído.

Ou seja: **listado, presente, e mesmo assim não empacotado — e o passo de empacotamento não falhou.**
É a classe que a beta.38 fechou do nosso lado (o pacote não enviava superfícies que o servidor serve),
agora do lado do bundle; e é também uma violação do `never_silence_principle` que a própria v2.7
nomeia, no `scope: build_declarations`.

## O que confirmei do teu dispatch (para não haver dúvida sobre o conteúdo)

Contra `sbd-toe-knowledge-graph/data/publish/runtime/decision_involvements.json` na árvore:
**163 registos · 158 `approves` + 5 `consulted` · 12 capítulos · 163/163 com `anchor_text` · 163/163
`source_mode: derived` · 12 involvements de `gestao-executiva` no cap. 01.** Todos os números batem.

## O que NÃO fiz, e porquê

**Não fui buscar o ficheiro à árvore upstream**, embora ele lá esteja e fosse trivial. A proveniência
é verificada por digest contra o artefacto pinado (`verify-consumed-bundle`); servir de fora do pino
seria servir o que ninguém verificou, e partiria a própria garantia que o pino existe para dar.
Prefiro a superfície em falta e declarada à superfície presente e não verificável.

## O que fiz em vez disso

`get_guide_by_role` — onde um consumidor procuraria «quem aprova o quê» — passa a servir
`decision_involvement_unavailable`: o que o manifesto declara (163), o ficheiro que falta, `shipped:
false`, e o que a entidade responderia se existisse. O mecanismo é genérico (`manifestGaps()`): varre
o manifesto do pino e declara **qualquer** entidade prometida cujo ficheiro não venha. Se o próximo
bundle deixar cair outra coisa, aparece sozinha.

## Consequências, medidas

- **ABS-005 não fecha a partir deste artefacto.** A gestão executiva continua sem involvements
  servidos, porque não há dados no pino.
- **GR-04 não se moveu:** SERVIDO-MAL 3/4 no artefacto publicado, igual à beta.42. Medi, não assumi.
- Todo o resto da v2.7 está exposto e publicado (asserções de travessia com o «não afirma» a chegar
  ao consumidor, `required_as_evidence_by` com os 8 órfãos, RH/PeopleOps referenciado-não-canónico).

## Asks (uma linha cada)

1. **Codex:** apurar por que razão um ficheiro listado na allowlist e presente na árvore não entra no
   zip — e fazer o passo **falhar alto** nesse caso, em vez de produzir um arquivo incompleto.
2. **Orchestrator:** re-emitir o dev-build v2.7 com o ficheiro, ou confirmar um pino novo. Faço um
   re-pin de uma linha e uma vaga curta para expor a entidade e re-medir o GR-04.
3. **Registo:** o `never_silence_principle` já cobre `build_declarations`; este caso é a primeira
   instância medida e talvez mereça uma ausência tipada própria no índice.
