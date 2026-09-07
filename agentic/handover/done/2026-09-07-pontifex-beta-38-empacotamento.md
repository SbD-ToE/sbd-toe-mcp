---
ai_assisted: true
model: Claude Opus 5
date: 2026-09-07
purpose: handover
reasoning: Vaga A — o pacote não enviava superfícies que o servidor serve; fechar à classe e re-medir sobre o artefacto.
review_status: pending-human-review
---

# Vaga A (beta.38) — O PACOTE NÃO ENVIAVA O QUE O SERVIDOR SERVE

**Persona:** Pontifex. **Autorização:** dispatch do Orchestrator (Vaga A), a partir de auditoria
externa independente ao artefacto publicado. **Bundle pin INALTERADO.** **Estável intocada**
(latest 0.19.4, KG formal v1.11.0 `688863a`). Nada promovido.

## O que estava errado, e o que eu fiz mal

A beta.37 expôs a vista processual e **não enviou os dados**. A minha suite passou 801/801
porque testa o **repo**; o utilizador recebe o **tarball**. Reportei o GR-03 como SERVIDO com
base numa medição que não era do artefacto — a invalidação da medição #6 está certa.

## O teste que fecha a classe, e o que ele deriva

Eram **três** listas estáticas a falhar ao mesmo tempo:

| lista | o que fazia |
|---|---|
| `package.json#files` | branca **por ficheiro** em `indexes/`, `semantic/`, `overlay/`, `ontology/` |
| `REQUIRED_PATHS` (`check-npm-package`) | outra lista à mão, sem as superfícies novas |
| `BANNED_PATHS` | proibia `bundle_policy_links.jsonl` — **para o qual o servidor já encaminhava** |

`scripts/derive-published-surfaces.mjs` passa a ser **fonte única**, e deriva de três lados:

- **materializadas (53)** — entradas de `bundle-files.json`. O que pinamos, enviamos.
- **carregadas (43)** — caminhos `data/…` em literais de código de **produção**.
- **encaminhadas (50)** — nomes citados no código, **comentários incluídos**. É a via que apanha
  o `bundle_policy_links.jsonl`: quem o materializa é o **consumidor**. Sem ela, 3 de 4.

União: **54 obrigatórias**. O gate vive no `check:npm-package` — que o CI **já corre antes do
publish**, ao contrário do `npm test` — e assere contra o **tarball real** (`npm pack`), nunca
contra o `files` lido à mão. A mesma derivação alimenta `package-surface-invariant.test.ts`.

**Guarda da sonda:** se a derivação encolher, falha alto em vez de passar em vazio; o único falso
positivo (`x.json`, que vive num teste) é declarado **com motivo** e a exclusão é exigida
demonstrável.

**Provado por mutação:** removendo `macro_processes.jsonl` do `files`, o gate parte; removendo
`bundle_policy_links.jsonl` — o caso que só existe por encaminhamento — **também**.

## Prova de que o tarball leva as quatro

`npm pack` do artefacto publicado, instalado como um consumidor:

```
data/publish/semantic/macro_processes.jsonl        ENVIADO
data/publish/semantic/mp_edges.jsonl               ENVIADO
data/publish/indexes/cross_layer_referrals.jsonl   ENVIADO
data/publish/indexes/bundle_policy_links.jsonl     ENVIADO
```

224 ficheiros, 5,80 MB (era 5,65). **A política de `semantic/` não foi relaxada** — continua
banido por omissão; as duas novas entram como **excepções NOMEADAS**, pelo mecanismo de 0.18.0:
ganharam-no quando ganharam porta. O `bundle_policy_links.jsonl` sai da proibição porque **banir
um ficheiro para o qual encaminhamos é apontar para o que não enviamos**.

## Re-medição sobre o artefacto

`eval:axis-i --server <entry>` mede um servidor instalado do pacote, e o relatório declara
**contra o quê mediu**.

**Controlo negativo (arquivado em `docs/acceptance-runs/`):** o beta.37 **publicado**, instalado
do npm, dá **GR-03 NÃO SERVIDO, 0/6** — reproduz exactamente o que a auditoria viu. O corrigido
dá **6/6**. A via discrimina; é prova, não afirmação.

| Caso | b.37 publicado | b.38 publicado |
|---|---|---|
| GR-01 IMPL | SERVIDO 5/5 | SERVIDO 5/5 |
| GR-02 CROSS-CHECK | SERVIDO 5/5 | SERVIDO 5/5 |
| **GR-03 PROGRAMA** | **NÃO SERVIDO 0/6** | **SERVIDO 6/6** |
| GR-04 PAPEL/MOMENTO | SERVIDO-MAL 3/4 | SERVIDO-MAL 3/4 |
| GR-05 CONSULT | SERVIDO 7/7 | SERVIDO 7/7 |
| GR-06 SETUP | SERVIDO 4/4 | SERVIDO 4/4 |

**A chegada das remissões inter-camada não moveu nenhuma outra leitura** — nem veredicto nem
contagem de peças. Esperado: nenhum caso do oráculo passa hoje por elas.

## Achados

**De serving (fechados):** o defeito de empacotamento e as três listas estáticas.

**Para o Orchestrator (fora de âmbito, não tocados):**
- `cross_layer_referrals.jsonl` (7.926 remissões) passa a ser enviada e tem módulo de serving,
  mas **nenhuma leitura do oráculo lhe toca** — a superfície existe e não tem caso que a meça.
- `bundle_policy_links.jsonl` é enviada e o servidor **encaminha** para ela, mas **não a serve**:
  o consumidor materializa à mão. Dar-lhe porta é decisão de âmbito, não desta vaga.
- GR-04 mantém-se achado de CONTEÚDO (sem taxonomia decide-vs-delega no bundle).

## Verificação

Suite **806/806** · aceitação **171, 0 FAIL, gate PASS** · **11 invariantes verdes (45 asserções)**
· **ouro do Eixo H byte-idêntico nos dois braços** · orçamentos **14/14** · `check:npm-package`
verde com 54 superfícies derivadas · Eixo I **5·1·0 sobre o artefacto publicado**.
