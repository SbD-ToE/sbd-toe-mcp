---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-10
purpose: brief
reasoning: P1/P2/P3 do despacho do Orchestrator — datar o artefacto gerado e nomear os órfãos da cobertura.
review_status: pending-human-review
---

# Datar o artefacto, e nomear os órfãos

**Persona:** Pontifex · **Despacho:** Orchestrator, 2026-09-10 · **Repo:** `sbd-toe-mcp-poc_0.20.0`
**Entregue em:** `0.20.0-beta.49` · **Pino inalterado** (KG v1.12.0) · **`latest` 0.19.4 intocada**

## P1 — o artefacto data-se a si mesmo (bloqueante)

O ficheiro instala-se e passa a viver sozinho. Ganha `## Provenance` **visível**, nos dois
sabores **e no ramo sem role**: Manual (tag · versão · commit · publicado em) · KG (release ·
sha256 · origem) · substrato + contrato de consumo · ontologia · servidor · hora de geração.

- **Nada fixo em código** — tudo de `loadBundleProvenance()` e `servingServerVersion()`.
- **Ausência declarada** — campo que o pin não traga sai *«não declarado no pin»*.
- **Pin ilegível** — o bloco di-lo e avisa que o ficheiro não é datável.
- `meta.provenance` do JSON passa a datar o Manual, a ontologia e o substrato.

## P2 — a cobertura nomeia os órfãos

Lista os capítulos fora da fatia nos **dois** sabores. Verificado: developer 3 · qa 8 ·
auditores 13, com a prosa a acompanhar o número. Pesa mais no `skilled`, que não tem ferramenta
viva para percorrer o resto.

## P3 — legibilidade dos dois contratos

`serving_contract` (jusante) e `consumer_contract_version` (montante) passam a declarar, cada um
onde é escrito, qual é e que não se seguem. **Nenhuma versão mudou.**

## A consequência, declarada

A hora de geração é volátil **por desenho**. O gate de determinismo apanhou-a e **não o
relaxei**: o carimbo entra nos voláteis declarados com padrão preciso (só a linha «Gerado em»),
e o gate reporta **28 byte-idênticos + 1 após neutralizar · 0 divergências**.

## Terceira omissão da mesma família

**Não encontrei nenhuma** ao mexer no módulo. Encontrei um defeito da mesma família **na minha
própria redacção** — «A count would say three are missing», com o número fixo — e corrigi-o
porque era meu e desta sessão, não pré-existente.

## Aceitação

| # | Critério | Estado |
|---|---|---|
| 1 | artefacto com role, isolado, nomeia Manual/KG/servidor/hora | ✅ |
| 2 | `meta.provenance` data o Manual | ✅ |
| 3 | cobertura nomeia os órfãos nos dois sabores | ✅ |
| 4 | nenhuma versão fixa em código | ✅ |
| 5 | espelho §0.5 + reporte ao Orchestrator | ✅ |

Suite **820/820** · aceitação **180, 0 FAIL** · ouro H byte-idêntico · matriz 0 FALTA.
