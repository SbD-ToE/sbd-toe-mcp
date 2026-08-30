# Brief: release 0.10.4 — pin formal KG `v1.7.0` (fecho D2) + fix de routing do G-b — fecho da linha estável

**Date:** 2026-08-30 · **De:** Pontifex · **Para:** programme lead (merge; tag após squash) · Codex (ask 1, estável) · Orchestrator (G-c após re-pin)
**Em resposta a:** `2026-08-30-codex-s3-release-v1.7.0-fecho-d2.md` + decisões G-b (dispatcher do ciclo, §Portão G-b + adenda)

## Identificadores (verificados)
KG `v1.7.0` → `894af32a85d6a50f648f10d8a643848e806e533e` = `mcp-stable` (`git ls-remote`); asset sha256 **`29156b86ef7785966f099f02bb67dd84fcb471d64092944038a3da906c72fb9a`** = sidecar; contrato **v1.14** (§1.21); ontologia `sbdtoe-ontology-v2.2`; Manual v1.7.1; `release = stable/v1.7.0`; verificador ✅.

## Fix de routing (decisão 2 do G-b) — serving, meu
`get_threat_landscape`: os **capítulos definidores** (`defining_chapter_ids`, contrato v1.13+) dos controlos activados contam como in-scope; a supressão do cap. 02 passa a aplicar-se só a controlos meramente catalogados lá. `controlsByChapter` inclui os definidores (→ `mitigated_by` correcto para as ameaças do cap. 02). Âmbitos L2 pós-fix: **auth 77 → 95**, encryption 107, validation 72; logging 15 / iac inalterados; sem concerns 233. Loader passa a projectar `defining_chapter_ids` e os campos §1.21 das ameaças (`associated_control_ids` 233/233, `associated_controls_text`, `…_derivation`), servidos no shaping.

## eval:acceptance (`docs/acceptance-runs/2026-08-30-v0.10.4-acceptance.{md,json}`)
104 cenários, 81 executados: **63 PASS · 18 PART · 0 FAIL · 23 SKIP; gate E PASS**. **TC-E-01/02 promovidos a PASS** (critério documentado: `mitigated_by` estrutural + `associated_control_ids` com ids que resolvem; §1.21 + decisão 8); TC-F-08 re-baselined (282 arestas; curadoria 12+4; GOV-013 CAP secundária). check ✅ · suite **537/537** (testes de routing reescritos: definidor→inclui, catalogado→exclui; smoke idem). Disclosure sem alteração de conteúdo (nada de novo a divulgar).

## Pós-merge (update no em-curso)
Tag anotada `v0.10.4` no squash → `release.yml` → npm `latest` → `npm view` (version/dist-tags/gitHead) → bookkeeping.
