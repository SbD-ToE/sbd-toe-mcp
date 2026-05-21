---
ai_assisted: true
model: Codex GPT-5
date: 2026-05-20
purpose: documentation
reasoning: Execution-control plan for MCP v0.9.0 with updated KG assets, deterministic G2 context, semantic disambiguation, regulatory overlay support and grounded codegen workflow.
review_status: pending-human-review
---

# MCP v0.9.0 - G2 Grounded Codegen Execution Plan

## Contexto

O objetivo da versão `0.9.0` e evoluir o `sbd-toe-mcp-poc` para consumir o KG e ontologias atualizadas e expor uma experiencia de codegen/review grounded no manual SbD-ToE.

O MCP ja tem ferramentas deterministicas uteis:

- `map_sbd_toe_applicability`
- `consult_security_requirements`
- `resolve_entities`
- `get_threat_landscape`
- `get_guide_by_role`
- `search_sbd_toe_manual`

O gap para `0.9.0` nao e recriar o MCP. E ligar os assets novos do KG e reduzir a orquestracao manual que hoje o agente tem de fazer para gerar ou corrigir codigo com rastreabilidade.

## Objetivo

Entregar uma versao `0.9.0` em que o MCP:

1. consome KG/ontologias atualizadas, incluindo `runtime/v1`;
2. inclui overlay regulatoria publicada pelo KG;
3. responde deterministicamente sobre o que o manual/KG/overlay dizem;
4. tem uma camada semantica de desambiguacao para ativar escopo;
5. impede asks demasiado vagos ou grandes de irem diretamente para codegen;
6. devolve contexto estruturado pronto para LLM gerar/corrigir codigo com razoes, citacoes e evidencia esperada.

## Nao objetivos

- Nao implementar todo o Paper 5.
- Nao provar superioridade experimental G2 vs G1.
- Nao transformar o MCP num agente que edita ficheiros.
- Nao deixar o LLM inventar requisitos, controlos, obrigacoes regulatorias, mappings ou evidencia.
- Nao despejar o KG inteiro no prompt de codegen.
- Nao tratar codigo gerado por IA como evidencia de cumprimento.

## Decisoes base

- A verdade normativa vem de lookup/traversal deterministico sobre manual/KG/overlay.
- A camada semantica apenas ativa candidatos de escopo e deve produzir `activation_trace`.
- O output para codegen deve ser proporcional e auditavel.
- A tool pode usar todo o KG, mas deve entregar ao LLM apenas o subconjunto ativado.
- Pedidos vagos devem devolver `needs_clarification` ou `needs_decomposition`, nao contexto massivo.
- Pedidos codegen devem ser bite-size: uma superficie tecnica principal, uma fase principal e um conjunto pequeno de concerns.

## Artefactos relevantes

- `data/upstream/graph-runtime-lock.json`
- `data/publish/runtime/`
- `data/publish/runtime/v1/`
- `data/publish/overlay/`
- `data/publish/ontology/`
- `src/bootstrap/checkout-backend.ts`
- `src/bootstrap/release-checkout.ts`
- `src/tools/ontology-loader.ts`
- `src/tools/resolve-entities.ts`
- `src/backend/semantic-index-gateway.ts`
- `src/index.ts`
- `package.json`
- `scripts/check-npm-package.mjs`
- `scripts/package-release-lib.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

## Estado observado em 2026-05-20

- O MCP atual esta pinado a um runtime antigo no lock local.
- O KG local/remoto tem tags novas `kg-v1-cycle-b-run-2-aligned-2026-05-12` e `kg-v1-cycle-b-manual-ref-2026-05-14`.
- O KG novo publica `data/publish/runtime/v1/` com `Slice`, `ControlObjective`, `Mechanism`, `Practice`, `Artifact`, relacoes e rastreabilidade.
- O MCP atual copia `data/publish/runtime/` recursivamente, logo `runtime/v1` pode entrar pelo checkout local quando o lock for atualizado.
- O MCP atual nao trata `data/publish/overlay/` como artefacto publicado obrigatorio.
- O `package.json`, `check-npm-package.mjs` e `package-release-lib.mjs` ainda nao exigem overlay regulatoria.
- O tamanho adicional estimado e aceitavel: `runtime/v1` ~1.3 MB e `overlay` ~4.6 MB.

## Tool alvo

Nome proposto:

`prepare_sbd_toe_codegen_context`

Finalidade:

Preparar contexto grounded para um LLM gerar, corrigir ou rever codigo. A tool nao gera codigo nem edita ficheiros.

### Input inicial

```json
{
  "task": "Adicionar validacao de payload ao endpoint PATCH /users/:id/email",
  "risk_level": "L2",
  "mode": "codegen",
  "stack": "Node.js/Express",
  "exposure": "public",
  "data_sensitivity": "personal",
  "concerns": ["validation", "api"],
  "changed_files": ["src/routes/users.ts"],
  "regulatory_frameworks": ["GDPR"],
  "include_regulatory_overlay": true
}
```

### Estados de output

`ready_for_codegen`

O pedido esta pequeno e claro o suficiente para devolver contexto de implementacao.

`needs_clarification`

Falta informacao minima, por exemplo endpoint, modo, risco, stack ou objetivo.

`needs_decomposition`

O pedido e demasiado amplo e deve ser partido em tasks menores.

`unsupported_scope`

O pedido exige assets, overlays, record types ou capacidades ainda nao publicadas.

### Output esperado quando ready

```json
{
  "status": "ready_for_codegen",
  "activation_trace": [],
  "activated_scope": {
    "requirements": [],
    "controls": [],
    "slices": [],
    "regulatory_obligations": []
  },
  "g2_context": {
    "control_objectives": [],
    "mechanisms": [],
    "practices": [],
    "artifacts": [],
    "evidence_patterns": []
  },
  "manual_grounding": [],
  "regulatory_overlay": [],
  "citation_map": {},
  "completeness_report": {
    "expected_objectives": 0,
    "returned_objectives": 0,
    "m_recall": 1.0
  },
  "llm_codegen_instructions": [],
  "security_rationale_template": []
}
```

## Scope gate

Antes de devolver contexto para codegen, a tool deve avaliar o tamanho e clareza do pedido.

### Limites iniciais

- Maximo recomendado: 1 superficie tecnica principal.
- Maximo recomendado: 1 fase principal (`implement`, `test`, `deploy`, `operate`).
- Maximo recomendado: 1 a 3 slices AppSec Core.
- Maximo recomendado: 8 a 12 requisitos ativos para uma task de codigo.
- Maximo recomendado: 1 a 2 overlays regulatorias por ask.
- Se o pedido ativar dominios como auth, validation, logging, secrets, CI/CD, deploy e monitoring ao mesmo tempo, devolver `needs_decomposition`.

### Exemplos que devem decompor

- "Torna esta aplicacao segura."
- "Implementa compliance CRA/GDPR na API toda."
- "Corrige todos os problemas de seguranca do repo."
- "Gera uma arquitetura segura completa."

### Exemplos prontos para codegen

- "Adicionar validacao de payload ao endpoint PATCH /users/:id/email."
- "Adicionar testes 401/403 ao endpoint POST /payments."
- "Remover segredo hardcoded de src/config.ts e passar para variavel de ambiente validada."
- "Adicionar logging seguro para rejeicoes de autenticacao sem PII sensivel."

## Plano de execucao

### WP0 - Preparacao

- [ ] Confirmar branch de trabalho para `v0.9.0`.
- [ ] Confirmar estado do worktree e preservar alteracoes nao relacionadas.
- [ ] Confirmar tag/commit exato do KG a usar.
- [ ] Registar decisao de tag/commit no PR.

Gate WP0:

- [ ] Existe tag/commit KG escolhido.
- [ ] Nao ha alteracoes de utilizador revertidas.

### WP1 - Atualizar assets KG

- [ ] Atualizar `data/upstream/graph-runtime-lock.json`.
- [ ] Correr `npm run checkout:backend`.
- [ ] Confirmar existencia de `data/publish/runtime/v1/v1_manifest.json`.
- [ ] Confirmar existencia de `data/publish/runtime/v1/relations.jsonl`.
- [ ] Copiar ou integrar `data/publish/overlay/` no checkout local.
- [ ] Sanitizar manifests para nao publicar caminhos privados.

Gate WP1:

- [ ] `runtime/v1` existe localmente.
- [ ] `overlay` existe localmente ou esta explicitamente marcado como pendente.
- [ ] O checkout falha se o KG observado nao bater com o lock.

### WP2 - Package e release assets

- [ ] Adicionar `data/publish/overlay/` ao `files` de `package.json`.
- [ ] Atualizar `scripts/check-npm-package.mjs` com required paths novos.
- [ ] Atualizar `scripts/package-release-lib.mjs` para incluir overlay e `runtime/v1`.
- [ ] Verificar que os banned paths continuam a proteger artefactos internos.
- [ ] Correr `npm run check:npm-package`.
- [ ] Correr `npm run package:release -- --version v0.9.0-dry-run`.

Gate WP2:

- [ ] `npm pack --dry-run --json` inclui `runtime/v1`.
- [ ] `npm pack --dry-run --json` inclui overlay.
- [ ] Release bundle inclui os mesmos assets publicaveis.

### WP3 - Loaders deterministicas

- [ ] Criar loader AppSec Core v1, por exemplo `src/tools/g2-runtime-loader.ts`.
- [ ] Carregar `slices.json`.
- [ ] Carregar `control_objectives.json`.
- [ ] Carregar `mechanisms.json`.
- [ ] Carregar `practices.json`.
- [ ] Carregar `artifacts.json`.
- [ ] Carregar `relations.jsonl`.
- [ ] Carregar `manual_rastreabilidade.jsonl` para nomes, fonte, autoridade e metodologia.
- [ ] Criar loader overlay, por exemplo `src/tools/regulatory-overlay-loader.ts`.
- [ ] Expor provenance por ficheiro e manifest.

Gate WP3:

- [ ] Loader falha claramente se ficheiros obrigatorios faltarem.
- [ ] Loader nao inventa nomes quando a rastreabilidade nao tem entrada.
- [ ] Loader devolve contagens coerentes com `v1_manifest.json`.

### WP4 - Expandir lookup estruturado

- [ ] Expandir `resolve_entities` com novos record types:
  - `appsec_slice`
  - `control_objective`
  - `mechanism`
  - `appsec_practice`
  - `appsec_artifact`
  - `appsec_relation`
  - `regulatory_framework`
  - `regulatory_obligation`
  - `regulatory_mapping`
  - `regulatory_playbook`
- [ ] Manter record types antigos compativeis.
- [ ] Atualizar schemas da lista de tools em `src/index.ts`.
- [ ] Atualizar testes de `resolve_entities`.

Gate WP4:

- [ ] Queries por slice devolvem entities v1.
- [ ] Queries por overlay devolvem entities regulatorias quando publicadas.
- [ ] Provenance diferencia runtime normal, runtime v1 e overlay.

### WP5 - Implementar `prepare_sbd_toe_codegen_context`

- [ ] Criar modulo da tool, por exemplo `src/tools/prepare-codegen-context.ts`.
- [ ] Definir schema input/output.
- [ ] Implementar scope gate.
- [ ] Implementar ativacao por concerns existentes.
- [ ] Implementar ativacao AppSec Core por slice/familia.
- [ ] Implementar ativacao overlay por framework/termos.
- [ ] Resolver requisitos/controlos/evidencia via runtime deterministico.
- [ ] Resolver objectives/mechanisms/practices/artifacts via runtime v1.
- [ ] Montar `citation_map`.
- [ ] Montar `completeness_report`.
- [ ] Montar `llm_codegen_instructions`.
- [ ] Registar tool em `src/index.ts`.

Gate WP5:

- [ ] Ask vago devolve `needs_decomposition`.
- [ ] Ask incompleto devolve `needs_clarification`.
- [ ] Ask pequeno devolve `ready_for_codegen`.
- [ ] O output nunca contem requisito/controlo/obrigacao sem provenance.

### WP6 - Desambiguacao semantica auditavel

- [ ] Reutilizar aliases/intents existentes em `semantic-index-gateway.ts` quando aplicavel.
- [ ] Adicionar mapeamento pequeno e auditavel de terms -> concerns/slices.
- [ ] Produzir `activation_trace` com score, fonte e razao.
- [ ] Nao deixar score semantico criar entidades.
- [ ] Expor candidatos rejeitados quando `debug` for true.

Gate WP6:

- [ ] "endpoint seguro" ativa API/auth/validation/logging de forma explicavel.
- [ ] "segredo hardcoded" ativa config/secrets.
- [ ] "pipeline release" ativa CI/CD/release sem ativar toda a app.
- [ ] Debug mostra porque cada concern/slice foi ativado.

### WP7 - Instrucoes ao LLM e skill/runtime prompts

- [ ] Atualizar ou criar prompt/recurso para grounded codegen.
- [ ] Instruir o LLM a gerar `security_rationale`.
- [ ] Instruir o LLM a citar IDs do `citation_map`.
- [ ] Instruir o LLM a listar validacoes e evidencia esperada.
- [ ] Instruir o LLM a nao declarar conformidade sem evidencia.
- [ ] Instruir o LLM a pedir clarificacao quando a tool devolver `needs_clarification`.
- [ ] Instruir o LLM a decompor quando a tool devolver `needs_decomposition`.

Gate WP7:

- [ ] Prompt nao encoraja claims de compliance.
- [ ] Prompt distingue codigo gerado, testes e evidencia.
- [ ] Prompt obriga rastreabilidade sem encher codigo com comentarios desnecessarios.

### WP8 - Testes

- [ ] Testes unitarios dos loaders v1.
- [ ] Testes unitarios dos loaders overlay.
- [ ] Testes de `resolve_entities` para novos record types.
- [ ] Testes de scope gate.
- [ ] Testes de `prepare_sbd_toe_codegen_context` com:
  - ask vago;
  - ask incompleto;
  - ask pequeno API/validation;
  - ask com overlay regulatoria.
- [ ] Teste de package contents.
- [ ] Teste de release bundle.

Gate WP8:

- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run check:npm-package`
- [ ] `npm run package:release -- --version v0.9.0-ci`

### WP9 - Documentacao e release

- [ ] Atualizar README ou docs de uso com a nova tool.
- [ ] Documentar contrato de output e estados.
- [ ] Documentar limitations: MVP G2, nao Paper 5 completo.
- [ ] Atualizar changelog/release notes se existir.
- [ ] Confirmar workflow de release.
- [ ] Criar tag `v0.9.0` apenas depois dos gates.

Gate WP9:

- [ ] Docs explicam que a tool prepara contexto, nao gera codigo.
- [ ] Docs explicam scope gate.
- [ ] Release so avanca depois de CI verde.

## Criterios de aceitacao da v0.9.0

- [ ] O package npm contem KG atualizado, `runtime/v1` e overlay regulatoria.
- [ ] O MCP consegue resolver record types antigos e novos.
- [ ] A tool `prepare_sbd_toe_codegen_context` existe e esta listada no MCP.
- [ ] A tool devolve `needs_decomposition` para asks demasiado abrangentes.
- [ ] A tool devolve `ready_for_codegen` para asks pequenos.
- [ ] O output inclui `activation_trace`, `activated_scope`, `g2_context`, `citation_map`, `completeness_report` e `llm_codegen_instructions`.
- [ ] O output separa manual, KG/AppSec Core e overlay regulatoria.
- [ ] Nenhuma resposta normativa depende de texto inventado pelo LLM.
- [ ] Os testes e package checks passam.

## Riscos e mitigacoes

| Risco | Mitigacao |
| --- | --- |
| Overlay nao estar num formato estavel | Loader tolerante por formato, com `unsupported_scope` quando faltar schema |
| Tool devolver contexto excessivo | Scope gate e limites de requisitos/slices |
| Desambiguacao virar verdade normativa | `activation_trace` e resolucao final apenas por entidades publicadas |
| Runtime v1 ter drift em algumas slices | Reportar warnings do manifest; nao esconder drift |
| Package crescer demasiado | Medir `npm pack --dry-run`; manter banned paths |
| Cliente sem skill correto usar mal a tool | Enforcement no MCP, nao apenas no prompt |

## Perguntas em aberto

- Qual tag exata do KG deve ser o pin da `0.9.0`?
- O overlay regulatorio deve ser todo publicado ou filtrado por conjunto minimo?
- O nome final da tool deve ser `prepare_sbd_toe_codegen_context` ou `prepare_g2_codegen_context`?
- A tool deve aceitar `changed_files` ja na v0.9.0 ou deixar essa integracao para a tool de review scope?
- O output deve incluir snippets narrativos do manual ou apenas IDs/provenance e instrucoes?

## Resumo operacional

- atualizar lock e checkout para KG novo
- publicar `runtime/v1` e overlay no package/release bundle
- adicionar loaders deterministicas para v1 e overlay
- expandir `resolve_entities`
- implementar `prepare_sbd_toe_codegen_context` com scope gate
- devolver contexto G2 tipado, provenance, citation map e instrucoes de codegen
- validar com testes, package dry-run e release bundle dry-run
