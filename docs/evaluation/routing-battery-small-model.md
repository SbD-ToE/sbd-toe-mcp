---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-09
purpose: evaluation
reasoning: Bateria de encaminhamento para modelo pequeno (R4) — preparada; correr é opcional.
review_status: pending-human-review
---

# Bateria de encaminhamento — modelo PEQUENO

## Porque existe

Quatro auditorias correram na **mesma família de modelos**, e todas elogiaram o mesmo: *«a
pergunta encaminha sozinha, zero tentativas falhadas»*. Isso pode ser propriedade do servidor
— ou artefacto de um modelo grande a ler descrições longas e bilingues.

O risco é concreto e recente: a decisão do lead pôs o **estatuto pragmático na descrição**, que
é exactamente a parte que um modelo pequeno pesa menos. Se o encaminhamento depender de ler 40
palavras de português técnico, a b.46 melhorou o produto para um leitor e não para o outro.

**Esta bateria mede o encaminhamento, não a resposta.** Não interessa se o modelo responde bem
à pergunta de negócio; interessa se chega à superfície certa **à primeira**.

## Como correr

1. Ligar o servidor MCP (`@shiftleftpt/sbd-toe-mcp`, tag `beta`) a um cliente com um modelo
   pequeno. **Sem system prompt do SbD-ToE** e **sem ler `sbd://toe/agent-guide` primeiro** —
   a bateria mede o que as DESCRIÇÕES conseguem sozinhas, que é a condição do utilizador que
   instala o servidor e pergunta.
2. Uma pergunta por sessão limpa. Sem reformular e sem ajudar.
3. Registar, por pergunta: a **primeira** tool chamada, todas as chamadas até chegar (ou
   desistir), e se chegou.

## Critério de sucesso

| métrica | definição |
|---|---|
| **acerto à primeira** | a 1.ª tool chamada é a esperada (ou uma das aceitáveis) |
| **tentativas falhadas** | chamadas a tools que não a esperada, antes de chegar |
| **chegou** | atingiu a tool esperada em ≤ 3 chamadas |
| **desistiu** | respondeu sem chamar nenhuma tool, ou parou sem chegar |

**Leitura:** a comparação que interessa **não é com 100%** — é com a mesma bateria no modelo
grande. Se o grande acerta 10/10 à primeira e o pequeno 4/10, o encaminhamento depende do
leitor e o achado é do produto, não do modelo.

## As perguntas

Em **linguagem de negócio** — nenhuma nomeia uma tool, um capítulo ou um termo do vocabulário.
As seis primeiras são as leituras do oráculo GR (o painel que o servidor já mede a 6·0·0), as
restantes cobrem as superfícies que a decisão do estatuto pragmático tocou.

| # | Pergunta | Tool esperada | Também aceitável |
|---|---|---|---|
| 1 | «Vamos construir um endpoint que exporta dados de clientes. O que temos de garantir?» | `select_sbd_toe_requirements` | `prepare_sbd_toe_codegen_context` |
| 2 | «Queremos pôr de pé a capacidade de CI/CD seguro. Como sabemos que a temos?» | `get_sbd_toe_chapter_capability` | `get_sbd_toe_chapter_implementation_checklist` |
| 3 | «Somos sujeitos ao DORA. Como é que este Manual ajuda?» | `get_sbd_toe_playbook` | `map_sbd_toe_regulatory_activation` |
| 4 | «Organização de 200 pessoas, sem programa de segurança. Por onde começamos?» | `get_sbd_toe_macro_processes` | `plan_sbd_toe_rollout` |
| 5 | «Sou Product Owner, início de sprint. O que tenho de garantir?» | `get_guide_by_role` | — |
| 6 | «O que é que o Manual diz sobre gestão de segredos?» | `explain_sbd_toe_topic` | `consult_security_requirements` |
| 7 | «Como me configuro para usar isto bem?» | `read_sbd_toe_resource` (`sbd://toe/quick-start`) | `generate_sbd_toe_skill` |
| 8 | «Quem aprova o quê na classificação de aplicações?» | `get_guide_by_role` | — |
| 9 | «Estes ficheiros mudaram no PR. O que é preciso rever?» | `map_sbd_toe_review_scope` | — |
| 10 | «Medimos 90% de cobertura de SAST. Estamos bem?» | `assess_sbd_toe_implementation` | `get_sbd_toe_chapter_capability` |

**A 10 é a mais importante desta ronda.** É a única cuja descrição foi reescrita para dizer que
o servidor **não emite juízo** («a leitura é tua»). Se um modelo pequeno a lê e mesmo assim
espera um veredicto, o estatuto pragmático não está a chegar a quem mais precisa dele.

## Registo

`docs/evaluation/routing-battery-<data>-<modelo>.md`, uma linha por pergunta:

```
| # | 1.ª tool chamada | chegou? | tentativas falhadas | notas |
```

E o cabeçalho com: modelo, cliente, versão do servidor (`sbd://toe/version`), e se o
`agent-guide` foi lido (deve ser **não**).

## O que esta bateria NÃO mede

Qualidade da resposta · correcção do conteúdo servido · desempenho. Só encaminhamento.

## Estado

**Preparada, não corrida.** Não conduzo aqui um modelo pequeno: a sessão corre num modelo
grande e correr a bateria nele mediria o leitor que as auditorias já mediram — daria um
resultado bom e sem informação. Entrego-a pronta; a comparação grande-vs-pequeno é que é o
produto.
