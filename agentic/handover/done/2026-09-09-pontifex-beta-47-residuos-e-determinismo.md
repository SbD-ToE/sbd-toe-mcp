---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-09
purpose: handover
reasoning: Resíduos da 3.ª auditoria (R1, R2), o teste de determinismo do serving (R3) e a bateria para modelo pequeno (R4).
review_status: pending-human-review
---

# beta.47 — OS RESÍDUOS, E A PROMESSA CENTRAL VERIFICADA

**Persona:** Pontifex. **Pino inalterado.** **Estável intocada.**

## R3 — determinismo do serving: 29/29, e um falso positivo apanhado

Dois **processos independentes**, mesma chamada, comparação **byte a byte**. Dois processos e
não duas chamadas no mesmo — repetir dentro do processo mediria a cache.

**Determinístico: 29/29 · 0 divergências · 0 não comparáveis · 0 campos voláteis.** Nada
precisou de neutralização: nenhum payload servido carrega timestamp ou id de execução.

**A 1.ª corrida mentiu.** As três superfícies de recuperação foram chamadas sem `question`,
devolveram **36 bytes de erro** e contaram como byte-idênticas. O runner passou a recusar
payloads < 200 bytes como inconclusivos, e o portão exige **0 não comparáveis**: um buraco no
teste não é um resultado.

## R1 — o schema contradizia a banda

Enum derivado do vocabulário (13 canónicos); legado **aceite** mas não **oferecido**; a
descrição diz que o argumento **AFECTA** a resposta, em vez de negar.

## R2 — a banda declara o que mede

Ocorrência de termo, não relevância — dito, e com os termos que **ancoraram** à vista. Sem piso
numérico: continuo a recusá-lo.

## R4 — bateria preparada, por correr

`docs/evaluation/routing-battery-small-model.md`. **Não a corri:** esta sessão é um modelo
grande e corrê-la aqui mediria o leitor que as auditorias já mediram. A comparação grande vs.
pequeno é o produto.

## O que recusei

1. **Não inventei um piso de relevância** para a banda de ancoragem.
2. **Não removi os valores legados do `projectRole`** — aditivo; deixam de ser oferecidos.
3. **Não corri a bateria num modelo grande** para poder dizer que a corri.
4. **Não normalizei silenciosamente** nada no teste de determinismo: um campo que varie fora da
   lista declarada conta como divergência.

## Verificação

Suite **820/820** · aceitação **179, 0 FAIL, gate PASS** · **18 invariantes verdes** · **ouro do
Eixo H byte-idêntico** · orçamentos **14/14** · matriz **0 FALTA** · determinismo **29/29**.
