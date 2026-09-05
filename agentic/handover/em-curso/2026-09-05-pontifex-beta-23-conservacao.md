---
ai_assisted: true
model: Claude Fable 5
date: 2026-09-05
purpose: handover
reasoning: Brief da vaga beta.23 (CONSERVAÇÃO) — o motor não deita fora o que foi declarado.
review_status: pending-human-review
---

# Vaga beta.23 — CONSERVAÇÃO (linha beta 0.20-beta)

**Persona:** Pontifex (camada de consumo/serviço do MCP).
**Autorização:** programme lead («avança», 2026-09-05).
**Diagnóstico vinculativo:** `DevelopmentGovernance/docs/mcp-declarative-first-design-note.md` §14.
**Bundle:** pin INALTERADO (release KG `v1.11.0`). **Linha estável:** intocada.

## O princípio que esta vaga acrescenta

A beta.22 fechou *nada acontece sem traço, nada falta sem aviso*.
A beta.23 fecha a metade que faltava: **nada prometido se perde**.

## Âmbito executado

1. **Invariante de conservação** (`src/serving/conservation-invariant.test.ts`, 5 propriedades)
   sobre o vocabulário TODO. Apanhou **12 violações em 4 famílias** — `build` (DEV),
   `supply_chain` (CIC), `release` (OPS), `deployment` (IAC) — quando a sonda externa
   tocava só `build`. Apanhou também um **erro no enunciado da lei** pedido no despacho
   (ver CHANGELOG: `excluded_by_level` vive fora de `eligible`; o que fecha é
   `selected + narrowed_out == eligible`, exacto nas 72 combinações).
2. **P0-1** — o motor cede à promessa publicada por categoria; traço `declared_category`.
   12 de 72 combinações mudam, 60 idênticas, **ouro imóvel nos dois braços**.
3. **P0-2** — `unsupported_concerns` declarado (11 de 24 concerns davam zero mudo);
   agent-guide deixou de mandar afirmar «not applicable in this scope» a partir de lista vazia.
4. **P0-3** — guarda anti-zero cobre `technologies`; a declaração com efeito (jwt→SES-008)
   deixa de ser descartada; `unknown_technologies` nomeia tokens fora do vocabulário.
5. **P1** — `provenance.server` em 20 sítios, incluindo os payloads bloqueados do `prepare`.

## Verificação

- Suite 761/761 · Aceitação 149: 109 PASS · 17 PART · **0 FAIL**, gate **PASS**
- Ouro: `discover` **10/0/0** (obrigatório) · declarativo **6 PASS / 4 PART / 0 FAIL**
- Orçamentos: 8/8 gates hard seguram; `rest` do `full` 1.350→1.360 (medido 1.356, +6 = `server`)
- Gate de serviço: stdout só JSON-RPC · exit 0 · `package_version` = `sbd://toe/version` = `provenance.server`
- Cenários novos no catálogo partilhado: **TC-F-39, TC-F-40, TC-F-41, TC-F-42**

## Achado colateral (corrigido, declarado)

`npm run smoke:mcp` estava partido **desde a beta.21** (pedia `prepare` só com `task`).
Verificado contra o build de `6a695af`: não é regressão desta vaga. Corrigido.

## Registos

- `docs/acceptance-runs/2026-09-05-conservacao-v0.20.0-beta.23-acceptance.{md,json}`
- `docs/acceptance-runs/2026-09-05-conservacao-axis-h-selection-v0.20.0-beta.23.{md,json}`
