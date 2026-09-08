---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-08
purpose: handover
reasoning: Vaga G — os dois bloqueios da 3.ª auditoria, o estatuto pragmático, a via lenta e a identidade de versão.
review_status: pending-human-review
---

# beta.46 — O GUARDA-CORPO QUE FALHAVA, A BANDA QUE NÃO FILTRAVA, O ESTATUTO QUE FALTAVA

**Persona:** Pontifex. **Pino inalterado.** **Estável intocada.** Nada promovido.

## G1 — a citação publicava o verbo da produção

Defeito meu, e **pior do que o `own` que substituiu**: as duas bases passavam o mesmo argumento
a `assertionFor`. No cap. 01, **19 artefactos com base única** — SBOM, Container Image, SCA
Report, IaC Plan — resolviam para «produz ou opera». A ontologia publica asserção para produção
e para prova e **nenhuma para a citação**: não inventei uma. A base passa a `cited_by` sobre o
campo que a fonte nomeia, com `published: false`.

**Classe fechada por invariante:** duas bases nunca publicam o mesmo verbo; sem asserção na
fonte, declara-se em vez de herdar.

## G2 — o nível não filtra, e agora diz-se

19 envolvimentos: **1 a L2, 11 só-L3, 7 sem níveis**; 104 dos 164 sem níveis. Passa a declarar
`filters_this_band: false`, a contagem por nível, e — o que faltava — **ausência de níveis não é
«aplica-se a todos»**. Não filtrei: o produto é de consulta e a entrada fica completa e legível.

## G3 — o verbo pertence a quem chama

Estatuto nas primeiras palavras de **seis** descrições, sem renomear nada. A do `assess` segue a
correcção do lead à formulação do próprio dispatch: comparar é aritmética sobre dado publicado;
o juízo nunca sai do chamador.

## G4 — via lenta

`trace_graph` ganha `kg`+`server` (era a única sem) · `repo_governance` declara que o `riskLevel`
filtra pouco e porquê · `review_scope` marca o `expectedEvidence` como **redacção do servidor**
e declara a sobreposição de padrões de path.

## G5 — identidade de versão

Teste de release que compara **descrições e respostas** contra `sbd://toe/version`. A nota dos
macro-processos deixa de fixar versões. **Fica a montante:** o pino declara `-v2.8` no
`release_tag` e `ontology-v2.7` no `substrate_version`.

## O que recusei

1. **Não inventei um verbo para a citação.** A fonte não o publica; a banda diz que não há.
2. **Não filtrei os envolvimentos por nível.** Filtrar em silêncio esconderia o que existe.
3. **Não renomeei tools** — o princípio aditivo mantém-se; o estatuto vai na descrição.
4. **Não «corrigi» o rótulo do pino** (`v2.8` vs `v2.7`): é do bundle e reporta-se.

## Verificação

Suite **819/819** · aceitação **178, 0 FAIL, gate PASS** · **17 invariantes verdes** · **ouro do
Eixo H byte-idêntico** · orçamentos **14/14** · matriz **0 FALTA, 0 não exercitáveis**.
