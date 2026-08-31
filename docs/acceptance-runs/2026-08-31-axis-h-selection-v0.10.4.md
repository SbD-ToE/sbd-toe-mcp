# Axis H — requirement-selection vs golden oracle — 2026-08-31 — @shiftleftpt/sbd-toe-mcp@0.10.4

Oracle: `golden-selection-cases.md` **v1 (closed 2026-08-31, ratified in block)** (programme lead's; read-only). Bundle: **v1.7.0** (`release`, contract v1.14). Measurement only — **not part of the promotion gate**. "Discutíveis" lines are neutral; GC-01 carries the oracle's contamination note. Verdict measured on `prepare` (the selection instrument); `consult` (task-derived equivalent context, mapping documented in `scripts/acceptance/axis-h.mjs`) reported alongside.

## Tabela — 10 casos × 2 tools × 3 métricas

| Caso | Nível | Verdict | prepare cob. | prepare prec. | prepare exc. | consult cob. | consult prec. | consult exc. |
|---|---|---|---|---|---|---|---|---|
| GC-01 | L2 | PART | 55% | 100% | 15 | 69% | 100% | 18 |
| GC-02 | L3 | FAIL | 0% | 100% | 0 | 82% | 84% | 24 |
| GC-03 | L2 | PART | 95% | 77% | 18 | 100% | 66% | 133 |
| GC-04 | L2 | PART | 100% | 76% | 20 | 100% | 100% | 11 |
| GC-05 | L2 | FAIL | 0% | 100% | 0 | 16% | 100% | 4 |
| GC-06 | L3 | FAIL | 13% | 100% | 8 | 100% | 100% | 46 |
| GC-07 | L3 | FAIL | 0% | 100% | 10 | 22% | 100% | 0 |
| GC-08 | L1 | FAIL | 49% | 100% | 1 | 100% | 100% | 1 |
| GC-09 | — | PASS | 100% | 100% | 0 | n/a | n/a | n/a |
| GC-10 | L2 | FAIL | 0% | 100% | 0 | 100% | 100% | 19 |

Verdicts: **1 PASS · 3 PART · 6 FAIL**. Médias (prepare): cobertura 41%, precisão-estrita 95%.

## Faltas, violações e excessos por caso

### GC-01 — Upload de ficheiros com autenticação e RBAC (⚠ caso contaminado — nota do oráculo)
- oráculo: must-have 29, discutíveis 4, must-NOT 116 · prepare status `ready_for_codegen`, seleccionados 34
- **faltas (prepare):** VAL-001, VAL-002, VAL-004, VAL-005, VAL-006, ERR-001, ERR-002, ENC-001, ENC-002, ENC-005, LOG-001, LOG-002, LOG-003
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-003, ACC-004, ACC-007, ACC-010, API-002, API-004, API-006, API-007, AUT-002, AUT-004, AUT-005, AUT-007, AUT-010, SES-005, SES-007
- discutíveis seleccionados (neutros): AUT-001, AUT-008, SES-008
- consult: faltas 9 [API-001, API-003, API-005, ENC-001, ENC-002, ENC-005, LOG-001, LOG-002, LOG-003], violações 0 []
- **causas:**
  - `VAL-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-003` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
- lacuna registada no oráculo: tratamento de ficheiros (tipo/magic bytes, tamanho, anti-malware, armazenamento, nomes) — sem categoria no catálogo

### GC-02 — API REST pública com rate limiting
- oráculo: must-have 22, discutíveis 0, must-NOT 105 · prepare status `needs_decomposition`, seleccionados 0
- **faltas (prepare):** API-001, API-002, API-003, API-004, API-005, API-006, API-007, VAL-001, VAL-003, VAL-004, VAL-005, VAL-006, VAL-007, ERR-001, ERR-002, ERR-003, AUT-006, ACC-005, ENC-001, LOG-001, LOG-002, ARC-002
- consult: faltas 4 [ENC-001, LOG-001, LOG-002, ARC-002], violações 8 [SES-001, SES-002, SES-003, SES-004, SES-005, SES-006, SES-007, SES-008]
- **causas:**
  - `(caso inteiro)` → **mcp** — prepare devolveu needs_decomposition para uma tarefa legítima do oráculo — o scope gate travou antes de seleccionar; reasons: Pedido activaria 256 requisitos v0 — máximo permitido para codegen: 50.
- lacuna registada no oráculo: ciclo de vida de API keys (emissão/rotação/revogação) — parcialmente em CFG-006/ENC-007

### GC-03 — Serviço containerizado com deploy em Kubernetes
- oráculo: must-have 20, discutíveis 0, must-NOT 78 · prepare status `ready_for_codegen`, seleccionados 48
- **faltas (prepare):** DST-006
- **must-NOT seleccionados (prepare):** IAC-001, IAC-002, IAC-003, IAC-004, IAC-005, IAC-006, IAC-007, IAC-008, IAC-010, IAC-011, IAC-012
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** CFG-003, CFG-004, CFG-005, CFG-006, DPL-001, DPL-004, DPL-010, OPS-001, OPS-002, OPS-003, OPS-004, OPS-005, OPS-006, OPS-007, OPS-011, OPS-012, OPS-013, OPS-015
- consult: faltas 0 [], violações 78 [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-010, AUT-001, AUT-002, AUT-003, …]
- **causas:**
  - `DST-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação

### GC-04 — Módulo Terraform de rede + segredos
- oráculo: must-have 14, discutíveis 0, must-NOT 69 · prepare status `ready_for_codegen`, seleccionados 45
- **must-NOT seleccionados (prepare):** CNT-001, CNT-002, CNT-003, CNT-004, CNT-005, CNT-006, CNT-007, CNT-008, CNT-009, CNT-010, CNT-011
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** CFG-001, CFG-002, CFG-003, CFG-004, CFG-005, DPL-001, DPL-002, DPL-003, DPL-004, DPL-005, DPL-006, DPL-007, DPL-008, DPL-010, ENC-001, ENC-002, ENC-003, ENC-004, ENC-005, ENC-008

### GC-05 — Pipeline CI com build e push de imagem
- oráculo: must-have 19, discutíveis 0, must-NOT 62 · prepare status `needs_decomposition`, seleccionados 0
- **faltas (prepare):** CIC-001, CIC-002, CIC-003, CIC-004, CIC-005, CIC-006, CIC-007, CIC-008, CIC-009, DEP-001, DEP-002, DEP-003, CNT-002, CNT-007, CNT-008, DST-003, DST-004, DST-006, ENC-006
- consult: faltas 16 [CIC-001, CIC-002, CIC-003, CIC-004, CIC-005, CIC-006, CIC-007, CIC-008, CIC-009, DEP-001, DEP-002, DEP-003, …], violações 0 []
- **causas:**
  - `(caso inteiro)` → **mcp** — prepare devolveu needs_decomposition para uma tarefa legítima do oráculo — o scope gate travou antes de seleccionar; reasons: Pedido activaria 56 requisitos v0 — máximo permitido para codegen: 50.

### GC-06 — App com dados pessoais e overlay regulatório (AI Act)
- oráculo: must-have 16, discutíveis 0, must-NOT 69 · prepare status `ready_for_codegen`, seleccionados 10 · overlay obligations 14
- **faltas (prepare):** ENC-001, ENC-002, ENC-003, ENC-005, ENC-008, VAL-001, VAL-004, VAL-005, ACC-002, ACC-006, ERR-001, ERR-007, AUT-002, AUT-006
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** LOG-001, LOG-002, LOG-004, LOG-006, LOG-007, LOG-008, LOG-009, LOG-010
- **causas:**
  - `ENC-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-003` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-008` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ACC-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ACC-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-007` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `AUT-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `AUT-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
- lacuna registada no oráculo: minimização/consentimento/retenção de dados pessoais sem requisitos próprios (DAT-*/PRI-* eram ilustrativos)

### GC-07 — Agente AI com tool-calls e kill-switch
- oráculo: must-have 18, discutíveis 0, must-NOT 64 · prepare status `ready_for_codegen`, seleccionados 10
- **faltas (prepare):** REQ-AGN-001, REQ-AGN-002, REQ-AGN-003, REQ-AGN-004, ARC-014, ARC-015, OPS-011, OPS-012, OPS-013, OPS-014, DPL-010, DPL-011, DEP-011, DEP-013, DEP-014, AUT-006, ACC-002, ENC-006
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** LOG-001, LOG-002, LOG-003, LOG-004, LOG-005, LOG-006, LOG-007, LOG-008, LOG-009, LOG-010
- consult: faltas 14 [ARC-014, ARC-015, OPS-011, OPS-012, OPS-013, OPS-014, DPL-010, DPL-011, DEP-011, DEP-013, DEP-014, AUT-006, …], violações 0 []
- **causas:**
  - `REQ-AGN-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `REQ-AGN-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `REQ-AGN-003` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `REQ-AGN-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ARC-014` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ARC-015` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `OPS-011` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `OPS-012` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `OPS-013` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `OPS-014` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `DPL-010` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `DPL-011` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `DEP-011` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `DEP-013` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `DEP-014` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `AUT-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ACC-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação

### GC-08 — Frontend com sessões JWT — filtro de nível (L1)
- oráculo: must-have 35, discutíveis 0, must-NOT 136 · prepare status `ready_for_codegen`, seleccionados 18
- **faltas (prepare):** VAL-001, VAL-002, VAL-004, VAL-005, VAL-006, VAL-008, ERR-001, ERR-002, ERR-003, ERR-004, ENC-001, ENC-004, ENC-005, ENC-006, LOG-001, LOG-002, LOG-003, LOG-005
- **excesso (nem exigido nem proibido — a discussão vai estar aqui):** ACC-003
- **causas:**
  - `VAL-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `VAL-008` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-003` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ERR-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-004` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `ENC-006` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-001` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-002` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-003` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
  - `LOG-005` → **mcp** — aplicável ao nível e não seleccionado — composição/activação
- lacuna registada no oráculo: paradoxo SES-008: guidance JWT para L1 não existe — lead decide

### GC-09 — Alteração só de documentação (caso NEGATIVO)
- oráculo: must-have 0, discutíveis 0, must-NOT 0 · prepare status `needs_decomposition`, seleccionados 0

### GC-10 — Integração serviço-a-serviço com mTLS e mensageria
- oráculo: must-have 10, discutíveis 0, must-NOT 75 · prepare status `needs_decomposition`, seleccionados 0
- **faltas (prepare):** INT-001, INT-002, INT-003, INT-004, INT-005, INT-006, ENC-001, ENC-003, CFG-006, LOG-001
- **causas:**
  - `(caso inteiro)` → **mcp** — prepare devolveu needs_decomposition para uma tarefa legítima do oráculo — o scope gate travou antes de seleccionar; reasons: Pedido activaria 231 requisitos v0 — máximo permitido para codegen: 50.
- lacuna registada no oráculo: mensageria (poison messages, DLQ, replay) sem requisitos

## Leitura (Pontifex, 5 linhas)

1. **O scope gate é hoje o maior custo de selecção:** `prepare` devolve `needs_decomposition` em 4 tarefas legítimas do oráculo (GC-02 API, GC-05 CI, GC-10 mensageria; GC-09 é o único desejado) — cobertura 0 % por recusa, não por má selecção.
2. **Quando responde, activa categorias inteiras sem narrowing por tarefa:** GC-01 reproduz quantificado o achado do lead — AUT/ACC/SES/API entram por atacado (15 em excesso) e VAL/ERR/ENC/LOG ficam de fora porque «upload» não activa validação/crypto/logging.
3. **Duas falhas de activação graves e específicas:** GC-07 (mandate/kill-switch/tool-calls **não** activa `agents`/AGN — 0/18) e GC-06 (dados pessoais/AI Act não activa ENC/VAL — 2/16), ambas `mcp`/composição; o overlay em si funciona (14 obrigações AI Act ✓).
4. **`consult` com concerns certos é o melhor selector actual** (cobertura média alta, precisão-estrita ~95 %), mas paga em excesso (categoria inteira; GC-03 sem concern de containers: 133 em excesso) e o vocabulário não cobre containers/deploy/CI — confirma a necessidade da operação de selecção MP1 (baseline ∪ contexto ⊕ overlay) do dispatcher, lane d).
5. **O filtro de nível funciona** (GC-08: 0 violações L2+/L3, excesso 1) e o caso negativo passa; nenhuma divergência exigiu requisito inexistente no catálogo (0 causas `manual` — as lacunas de conteúdo do oráculo continuam qualitativas, para o Author) e 0 expectativas marcadas `oracle?`.

