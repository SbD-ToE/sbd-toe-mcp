---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-10
purpose: handover
reasoning: Re-pin na release FORMAL KG v1.12.0 — precedência do ledger, ligações autoradas, role_scope.
review_status: pending-human-review
---

# beta.48 — A RELEASE FORMAL, E A PRECEDÊNCIA DO LEDGER

**Persona:** Pontifex. **Pino:** **KG v1.12.0** formal (`c21d35cb7fea`, contrato v1.25).
**Estável intocada** — a promoção é acto separado, gate do lead.

## A precedência do ledger

Dois ficheiros de ausências em desacordo **de propósito**. O ledger prevalece para `status`.
Sem o ler, eu reintroduzia o defeito da b.45 pelo mecanismo criado para evitar churn.

| | índice | ledger | servido |
|---|---|---|---|
| ABS-003 | (sem status) | **withdrawn** | `withdrawn`, `is_debt: false` |
| ABS-011 | (sem status) | **closed** | `closed`, `is_debt: false` |

**`withdrawn` ≠ `closed`.** «A premissa era errada — nada faltava e nada se corrige.» A banda
traz `status_source`, a transição com fundamento e verificador, e **`index_disagrees`**: a
divergência vai à vista porque achatá-la esconderia o mecanismo.

## O `fornecedores-terceiros`

`role_scope: inter_instance`. Zero é o **estado correcto**, não lacuna: é onde outra instância
começa. Porta: `chapters=["14-governanca-contratacao"]`, GOV-006/007.

## As 50 ligações autoradas

30 blocos · 26 viola + 24 materializa · zero ids por resolver. Camada **distinta** da pontuada;
não se somam. **5 casam, 25 não — declarado, não alinhado**: qual conjunto é a entidade é
decisão de modelo, em triagem. **9 ausências autoradas** servidas como recusa deliberada de
ligar fraco — e foi de uma delas que nasceu o `CIC-011`.

## Ouro do Eixo H

**Conjuntos seleccionados, causas e veredictos byte-idênticos** nos dois braços. O `CIC-011`
aparece só em `excess`/`must_not`. Zero perdidos, zero ids alterados. 10/10 PASS.

## O que recusei

1. **Não alinhei os 25 blocos** com as entidades publicadas.
2. **Não servi `withdrawn` como `closed`** — são coisas diferentes.
3. **Não achatei a divergência** índice↔ledger.
4. **Não compensei** o zero do `fornecedores-terceiros`: é o estado certo.

## Nota de contrato absorvida

O `id` de um assignment **não é estável** a mudanças que lhe dêem fase — rodaram 36 neste
bundle. **Nenhuma superfície minha indexa por ele**, e verifiquei que continua assim.

## Verificação

Suite **820/820** · aceitação **179, 0 FAIL, gate PASS** · **18 invariantes** · orçamentos
**14/14** · matriz **0 FALTA** · **determinismo 29/29**. O gate de empacotamento apanhou os dois
ficheiros novos antes de eu publicar.
