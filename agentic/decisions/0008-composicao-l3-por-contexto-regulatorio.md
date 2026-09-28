---
ai_disclosure:
  tool: "Claude Opus 5.5 (Claude Code)"
  role: "drafting under Pontifex persona, operator-reviewed"
  date: "2026-09-28"
---

# 0008 — Composição L3 por contexto regulatório, contra o KG v2.1.0: a promessa (0.23.0)

**Data:** 2026-09-28 · **Autor:** Pontifex · **Ramo:** `0.23.0`, a partir do `master` (0.22.0, `f84a511`).
**Origem:** despacho do Orchestrator de 2026-09-28 (KG v2.1.0 publicado); decisão 0007 (fronteira L3/L4, «o que é público é
consultado público», regra de activação confirmada pelo lead).
**Estado:** PROPOSTA — **a promessa vem antes do código.** Nada implementado. **O código precisa do sim directo do lead nesta
sessão.**

**KG v2.1.0, verificado:** a tag anotada `v2.1.0` (objecto `d82005b5`) aponta para `92b1154f`. O artefacto
`sbd-toe-knowledge-graph-bundle-v2.1.0.zip` tem sha256 `577cafb82a545dfbca9460247ac961ff2916b14e0f39199d94cb31be28910956`, igual
ao `.sha256` publicado. O contrato é **v2.1**, uma subida minor aditiva, por isso o gate de subida major não bloqueia. Os pinos
são Manual v1.17.1 e ontologia v2.11.

---

## 1. A promessa

> **Declarar um contexto regulatório nunca muda o que já se servia.** Sem `regulatory_contexts`, cada resposta é byte a byte a da
> 0.22.0, e os oráculos não mudam.
>
> **Com contextos declarados** (id + graus), a selecção e o prepare devolvem os **requisitos efectivos**: selecção técnica ∪
> elevados ∪ acrescentados. Cada id diz a sua **origem**:
> - `base`: activado pela selecção técnica. Só entra se a técnica o activar;
> - `elevado`: um piso do contexto, com as obrigações e os artigos que o fundamentam;
> - `acrescentado`: `CTX-<regime>-Rnn`, que só existe no overlay, com a sua base.
>
> Um elevado ou acrescentado **sem activação técnica entra marcado** «aplica-se pelo regime; se o componente não existir, exige
> justificação documentada». Nunca é imposto às cegas nem cai em silêncio.
>
> **Pisos-parâmetro:** o valor efectivo, que é o que o KG calcula pela escala e pelo sentido, e **todos** os pisos, cada um com a
> sua base. Pisos incomparáveis são declarados em conflito, sem valor.
>
> **Obrigações e força:** as obrigações que motivam cada elevado e acrescentado, e a força de cada uma (`cobre`, `parcial`,
> `apoia_evidencia`, `lacuna`, `fora_de_ambito`), juntadas pelo id da obrigação. **O regime inteiro** (obrigações, respostas com
> âncora resolvida e `citable`, `fora_de_ambito` com a razão, pendentes da ronda AISVS-SAIF e mapas de evidência) consulta-se
> paginado numa tool própria. Nada disto fica retido: é público e consulta-se em público.
>
> **Sempre:** o eco do que foi declarado, e o aviso «isto não é determinação de conformidade: a aplicabilidade do contexto é
> declarada por ti». A determinação é L4.
>
> **Guarda:** `tipo_overlay: organizacao` e ids `ORG-*` nunca se servem nem se citam. Se aparecerem no bundle, declaram-se.

## 2. O dado v2.1 (medido; KG v2.1.0)

| ficheiro | conteúdo | tamanho |
|---|---|---|
| `overlay/regulatory_contexts.json` | 5 contextos (NIS2, DORA, CRA, AIA-RE, RGPD), graus (FCI, PERTINENTE, ART50), pisos (59), `effective_parameters` (4, 0 conflitos), `lista_ids` autoritativa, `regra_lista` | ≈ 89k tk |
| `overlay/regulatory_requirements.json` | 21 acrescentados `CTX-*-Rnn` | ≈ 12k tk |
| `overlay/regulatory_obligations.json` | 1 583 obrigações; força; 9 pendentes AISVS-SAIF; `evidence_maps` | ≈ 350k tk |
| `overlay/regulatory_coverage.jsonl` | 2 699 respostas; `target_type` ∈ Requirement, PolicySection, Section, AddedRequirement, UserStory, RegulatoryContext; âncora resolvida; `citable` | ≈ 705k tk |

**O que um contexto acrescenta à selecção técnica é pouco:** entre 2 e 18 elevados e entre 1 e 6 acrescentados por
contexto e grau. Por exemplo, NIS2 PERTINENTE tem 18 elevados e 3 acrescentados; RGPD tem 3 e 6. A `lista_ids` traz o catálogo
inteiro do nível (139 a 290 ids), quase todo de origem `base`, que só entra pela activação técnica.

**Um regime inteiro é grande:** de 68k tk (CSA) a 389k tk (DORA) em bruto. Por isso nunca vai inline, e serve-se paginado, com
totais e cursor.

## 3. A superfície (0.23.0, aditiva)

1. **`select_sbd_toe_requirements` e `prepare_sbd_toe_codegen_context`** ganham `regulatory_contexts: [{id, graus?}]`, validado
   contra o vocabulário publicado. Um id desconhecido, ou um grau não admitido pelo contexto, dá `needs_input` com
   `valid_values`. A resposta ganha um bloco **`regulatory_context`**:
   - o eco do declarado;
   - os ids efectivos com a origem;
   - `requires_justification` nos elevados e acrescentados sem activação técnica;
   - os pisos-parâmetro (o efectivo e todos);
   - as obrigações motivadoras, com força e artigo;
   - um **resumo** da força do regime (contagens por força e pendentes), com uma referência executável à tool do regime;
   - o aviso, por `note_id`.

   Os **acrescentados** entram como requisitos fundidos, com a mesma forma dos do catálogo e `origin: acrescentado`. Citam-se pelo
   id do overlay.
2. **Tool nova `get_sbd_toe_regulatory_coverage`:** `regime` (ou `context` + graus) e filtros por `forca`, `pendente`,
   `mapa_evidencia`, mais `offset`/`limit`. Devolve as obrigações e as respostas, com âncora resolvida e `citable`, `falta` ou
   `razao_fora_de_ambito`, os pendentes (ronda) e os mapas de evidência. É paginada e declara o preço.
3. **`sbd://toe/activation-vocabulary`** ganha `regulatory_contexts`: os ids, os graus admitidos, onde se declara e o critério,
   com a citação. Tudo derivado do dado.
4. **Não muda:** nada nos pedidos sem contextos. O overlay legado (`regulatory_frameworks`) mantém-se, como vista legada.

## 4. Tectos por custo e lotes (0004–0006)

- O bloco `regulatory_context` e os acrescentados entram no **payload medido**, e a regra de custo não muda: cabe, decompõe ou é
  irredutível declarado.
- **Nos lotes, `regulatory_contexts` viaja literalmente, como o overlay.**
  - Os elevados caem no lote da sua categoria.
  - Os acrescentados `CTX-*-Rnn` formam uma unidade própria por regime, e caem no lote-âncora se não tiverem categoria.
  - A união devolve o conjunto efectivo inteiro, sem lotes únicos.
- **A medir antes de fechar:** o custo por contexto e grau, em `lista` e `standard`, sobre a matriz de 120 casos da 0004 × os 8
  pares contexto/grau. Uma matriz nova, de antes e depois, prova:
  - 0 violações;
  - `full` byte-idêntico sem contextos;
  - a união exacta dos lotes com contexto.

## 5. Como se prova

1. **Sem contextos, nada muda:** `full` byte-idêntico à 0.22.0 em toda a matriz; oráculos da invariante 3 e do Eixo H iguais.
2. **Com contextos:** efectivos = técnica ∪ elevados ∪ acrescentados, verificado contra a `lista_ids` publicada. Base sem
   activação técnica fica fora. Elevados e acrescentados sem activação técnica ficam marcados. Cada origem, obrigação e força
   confere com o dado.
3. **Parâmetros:** o efectivo é igual ao de `effective_parameters`, e todos os pisos são servidos.
4. **Regime paginado:** as páginas somam as obrigações do acto, e os totais e o cursor fecham.
5. **Guardas:** ORG-* e `organizacao` nunca servidos (teste com dado sintético); o aviso está sempre presente.
6. Acceptance (cenários novos para contextos), Eixo H 10/10 e determinismo.

## 6. Versão e decisões pedidas ao lead

- **Versão proposta: 0.23.0**, minor aditiva: um parâmetro opcional, uma tool nova, e o contrato do KG v2.1 aditivo.
- **Decisão pedida:** o sim directo, nesta sessão, para implementar a 0.23.0 no ramo `0.23.0` como está escrito. O pino ao v2.1.0
  entra com o gate a registar uma subida minor, sem aceitação especial. **Merge, tag e `latest` continuam com o lead.** Qualquer
  mudança de oráculo volta ao lead para ratificação.
