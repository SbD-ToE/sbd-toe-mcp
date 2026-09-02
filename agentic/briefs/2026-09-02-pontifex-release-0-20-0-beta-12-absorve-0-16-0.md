# Brief: release 0.20.0-beta.12 (linha beta) — absorção do 0.16.0 («dívida de dados» servida): re-pin v1.16, joins expostos, stamp dev:<sha12>

**Date:** 2026-09-02
**De:** Pontifex
**Para:** Orchestrator (registo; catálogo intocado por mim) · programme lead (registo) · Codex (re-pin ×2 completo — ambas as linhas no dev-build 2026-09-02)
**Autorização:** ciclo Codex + re-pin (lead «arma o Codex», 02-09; verificação do Orchestrator); triagem `2026-09-01-auditoria-desktop-0.14.0-triagem.md`
**Natureza:** relatório de execução de release (linha beta, não citável; tag + npm `beta`)

## TL;DR

`3e32af19` (0.16.0) cherry-picked; conflitos só nos 4 habituais (→ beta + bump beta.12). **Pin idêntico à estável**: dev-build `kg-v1-manual-v1.8.0-aligned-2026-09-02` (sha256 `c832fd97…6a107` verificado por digest; contrato v1.16 §1.23). Joins servidos (guide artifacts 25/25; threat `associated_control_names` 95/95 + antipatterns; plan `artefact_totals` 45/469 lidos do meta). Stamp reformado verificado ao vivo nesta linha: `provenance.kg = "dev:c832fd978169"`; `sbd://toe/version` mantém a identidade completa (TC-F-16/17 PASS). **Declaração das superfícies só-beta:** os campos novos do v1.16 ficam FORA da projecção RDF (fontes = os 5 ficheiros v1); lenses inalteradas (270/270/270, TC-G-01 ✓); o `trace` mantém provenance própria sem stamp kg (forma pré-existente, reportada). Eval **132: 93/16/0/23, gate E PASS**; TC-F-25 PASS; ouro **10/10**; 729/729; orçamentos intactos com o stamp curto (9.125/8.398/4.835 — sem paragem).

## Payloads desta linha (antes → depois)

f1 18.766→18.769 / 6.130→6.133 / 5.484→5.486 / 3.688→3.691; f2 25.186→25.189 / 9.122→**9.125**/9.200 / 8.396→**8.398**/8.450 / 4.833→**4.835**/4.840. Delta = +2–3 tk (stamp `dev:<sha12>`); a tag longa teria tocado rest-f1/ultrathin-f2 — a forma curta não; nenhum tecto tocado.

## Pontos seguintes (após push — update no em-curso)

Tag anotada `v0.20.0-beta.12` → run Release → `npm view` → commit de fecho («tag recorded»).
