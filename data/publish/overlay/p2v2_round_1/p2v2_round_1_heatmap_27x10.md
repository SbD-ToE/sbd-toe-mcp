# Heat-map 27×10 — AppSec Core v0 slice pressure distribution

**Generated:** 2026-04-20 (Phase B)
**Source:** Phase A classified items (3,562) × 27 canonical pilots
**Slices (v0):** 10 primary slices (TMR, ATB, IAT, SCBI, TSV, IVF, ITS, RPR, SLG, SPC).
**Extraction rule:** `method/phase-b-7cat-extraction-rule.md`

## Pressure matrix

| Pilot | TMR | ATB | IAT | SCBI | TSV | IVF | ITS | RPR | SLG | SPC | Adj(v1) | OOS | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `asvs_v4_0_2` | 4 | 11 | 102 | 24 | 12 | 32 | 16 | 5 | 23 | 51 | · | 6 | 286 |
| `asvs_v5_0_0` | 5 | 41 | 125 | · | · | 62 | 27 | · | 13 | 16 | · | 154 | 443 |
| `capec_v3_9` | · | 10 | 130 | 66 | 2 | 120 | 76 | 10 | · | 118 | · | 27 | 559 |
| `cis_controls_v8_1_2` | 16 | 7 | 25 | 13 | 15 | 3 | 5 | 4 | 23 | 5 | · | 55 | 171 |
| `cwe_software_development_view_v4_19_1` | · | 25 | 51 | 1 | · | 38 | 10 | 1 | 4 | 13 | · | 257 | 400 |
| `enisa_multilayer_ai_cybersecurity_practices_2023` | 2 | 2 | · | · | · | · | · | · | · | · | · | 2 | 6 |
| `eu_cra` | 1 | · | · | 1 | 1 | · | · | · | 1 | · | · | 5 | 9 |
| `eu_dora` | 7 | 1 | · | 2 | 5 | · | 1 | 2 | 4 | 1 | · | 1 | 24 |
| `eu_nis2` | 1 | 1 | · | · | 1 | · | · | · | 1 | · | · | · | 4 |
| `eu_rgpd` | 1 | · | · | · | 1 | · | · | · | 1 | 3 | · | · | 6 |
| `hipaa_security_rule` | 4 | · | 4 | 2 | 1 | 1 | · | · | 2 | 1 | · | 7 | 22 |
| `mcp_official_security_foundations_2025` | · | · | 10 | · | · | 1 | 1 | · | · | · | · | 2 | 14 |
| `nist_sp800_53_rev5` | 27 | 155 | 177 | 138 | 50 | 24 | 91 | 46 | 104 | 57 | · | 327 | 1196 |
| `owasp_dsomm` | 1 | · | · | 4 | 5 | · | · | 2 | 2 | · | 1 | 4 | 19 |
| `owasp_mcp_secure_server_development_v1_0` | · | 1 | 1 | 1 | 1 | 1 | · | · | 1 | 1 | · | 4 | 11 |
| `owasp_mcp_third_party_servers_v1_0` | · | · | 1 | 2 | · | 2 | 2 | · | · | · | · | 2 | 9 |
| `owasp_mcp_top_10_v0_1_2025_beta` | · | · | 3 | 2 | · | 3 | 1 | · | 1 | · | · | 1 | 11 |
| `owasp_proactive_controls_2018` | 1 | · | 2 | 1 | · | 4 | · | · | 1 | 1 | · | · | 10 |
| `owasp_samm_v2_1` | 1 | 2 | · | 1 | 3 | · | · | 1 | 1 | · | 2 | 4 | 15 |
| `owasp_top_10_2021` | · | 1 | 2 | 2 | · | 1 | 1 | 1 | 1 | 1 | · | · | 10 |
| `pci_dss_v4_0_1` | 33 | 20 | 43 | 13 | 17 | 19 | · | 12 | 23 | 25 | · | 12 | 217 |
| `pci_sslc_v1_1` | 9 | · | · | 2 | 9 | · | · | 6 | · | 2 | · | · | 28 |
| `safecode_agile_2012` | 4 | · | · | 8 | 13 | · | 2 | 2 | · | · | · | · | 29 |
| `safecode_fpssd_2018` | 4 | 1 | 1 | 2 | 5 | 2 | · | · | 1 | 1 | · | · | 17 |
| `safecode_sic_2010` | · | · | · | 9 | 1 | · | 1 | 1 | · | · | · | · | 12 |
| `slsa_spec_v1_0_build_track` | · | · | · | 12 | 2 | · | · | · | · | · | · | · | 14 |
| `ssdf_sp800_218_v1_1` | 4 | 2 | 1 | 5 | 5 | 1 | · | 1 | · | · | · | 1 | 20 |
| **Σ column** | 125 | 280 | 678 | 311 | 149 | 314 | 234 | 94 | 207 | 296 | 3 | — | **3562** |

## Column totals — where pressure concentrates

| Slice | Items | % of v0-mapped |
|---|---:|---:|
| **ACO-TMR** | 125 | 4.7% |
| **ACO-ATB** | 280 | 10.4% |
| **ACO-IAT** | 678 | 25.2% |
| **ACO-SCBI** | 311 | 11.6% |
| **ACO-TSV** | 149 | 5.5% |
| **ACO-IVF** | 314 | 11.7% |
| **ACO-ITS** | 234 | 8.7% |
| **ACO-RPR** | 94 | 3.5% |
| **ACO-SLG** | 207 | 7.7% |
| **ACO-SPC** | 296 | 11.0% |
| *Adjunct (v1 CBI+SRQ)* | 3 | — |

## Notes

- Cell values count Phase A 7-cat-classified items (3,562 total) at stub granularity, not raw instance_mapping (3,957). Block 1 T3 pilots (SSDF, SAMM, DSOMM) classify at practice/subdimension level.
- OOS column aggregates: (a) 7-cat `scope_boundary` items, (b) 7-cat `not_in_7cat` items, (c) any classified items whose iter-1 CO anchor cannot be resolved.
- Adjunct column counts items mapped to v1 adjunct slices (ACO-CBI for ACR-001, ACO-SRQ for ACR-002). Low value reflects that validated-adjunct-backed items in SAMM/DSOMM have iter-1 primary_core_anchor pointing to adjunct-side entity IDs but those entity IDs may be represented in v1 as TMR/ATB slice entities rather than separate CBI/SRQ slices.
- Adjacent observation (post-Phase-A): the 35 `adjunct_creation_candidate` items flagged in Block 1 represent prospective ACR-003+ candidates; their iter-1 landing may be in various v0 slices (not ACO-CBI/SRQ) — the adjunct candidacy signal is separate from the per-slice pressure signal.
