# Phase B — 7-cat item extraction rule (schema-aware)

**Status:** active for Phase B+ downstream consumers
**Opened:** 2026-04-20
**Authority:** Phase B dispatcher 2026-04-20 (schema-divergence handling as requirement)
**Scope:** canonical extraction rule for reading Phase A 7-cat classifications across two schemas

---

## Problem

Phase A produced two authoring modes that converge on the same 7-cat taxonomy but differ in schema placement:

| Mode | Pilots | Schema location of category items |
|---|---|---|
| **Block 1 additive wrapper** | 11 iter-1-ready pilots (SSDF, SLSA, CWE, ASVS v5, ENISA, 3× OWASP MCP, MCP Official, SAMM, DSOMM) | `delta_2026_04_05_reclassification.items[]` |
| **Blocks 2-6 native authoring** | 16 pilots (EU + HIPAA, OWASP Top10 + Proactive + ASVS v4 + CAPEC, SAFECode × 3, PCI × 2, CIS v8.1.2, NIST) | `items[]` at schema root |

**Why both exist:** Block 1 re-classified existing iter-1 stubs under additive preservation (iter-1 fields must not be overwritten per dispatcher §7). Blocks 2-6 authored stubs from scratch (no iter-1 predecessor to preserve).

**Both converge on:** same 7-cat categories + same per-item field set (`gap_id`, `category`, `justification`, `evidence`, `manual_refinement_candidate`, `adjunct_candidate`).

## Canonical extraction rule

```python
def extract_7cat_items(stub_doc: dict) -> tuple[str, list[dict]]:
    """Return (pilot_id, list-of-7cat-items) regardless of schema mode.

    Block 1 stubs: items live at stub_doc['delta_2026_04_05_reclassification']['items']
    Blocks 2-6 stubs: items live at stub_doc['items']

    Detection: presence of 'delta_2026_04_05_reclassification' key signals Block 1 mode.
    """
    pilot_id = stub_doc["pilot_id"]
    if "delta_2026_04_05_reclassification" in stub_doc:
        items = stub_doc["delta_2026_04_05_reclassification"]["items"]
        mode = "block1_additive_wrapper"
    else:
        items = stub_doc["items"]
        mode = "block2plus_native"
    return pilot_id, items, mode


def extract_summary_counts(stub_doc: dict) -> dict[str, int]:
    """Return 7-cat summary counts regardless of schema mode."""
    if "delta_2026_04_05_reclassification" in stub_doc:
        return stub_doc["delta_2026_04_05_reclassification"]["summary_counts"]
    return stub_doc["summary_counts"]
```

## Per-item fields (guaranteed present in both modes)

| Field | Type | Semantics |
|---|---|---|
| `gap_id` | string | Unique id: `<pilot_id>__<source_object_id>` |
| `source_object_id_ref` (Block 1) / `source_object_id` (Blocks 2-6) | string | Source-side identifier reference |
| `category` | string | One of 9 allowed categories (7 real + 2 admin) |
| `justification` | string | Why this category |
| `evidence` | string | What iter-1 state was compared |
| `manual_refinement_candidate` | bool | Phase C Manual-refinement flag |
| `adjunct_candidate` | bool | ACR process flag |

## Per-item fields (mode-specific)

**Block 1 additive wrapper** may include:
- `note_v1_vs_v0` — documents v0→v1 promotion effects on the re-read

**Blocks 2-6 native** may include:
- `iter1_primary_core_anchor_id` — CO anchor per iter-1 instance_mapping
- `iter1_landing_strength` — strong / bounded / none / topic_mapped
- `iter1_domain_first_resolution` — DOMAIN_WINS / CONFIRMED / ONLY / KEYWORD_FALLBACK / UNMAPPED
- `iter1_normalization_status` — mapped / out_of_scope / unmapped / topic_mapped (CIS only)
- `source_title` — human-readable title

Downstream consumers should not assume presence of mode-specific fields without null-check.

## Source-object-id field normalization

Block 1 uses `source_object_id_ref` inside the wrapper item (points to iter-1 items[] entry). Blocks 2-6 use `source_object_id` directly. Both semantically identify the source-side item. Normalizing accessor:

```python
def item_source_id(item: dict) -> str:
    return item.get("source_object_id") or item["source_object_id_ref"]
```

## Categories allowed (both modes)

The full 9-label set, in order:
1. `claim_gap`
2. `content_gap`
3. `comparison_gap`
4. `scope_boundary`
5. `overlay_repair`
6. `traceability_repair`
7. `adjunct_creation_candidate`

Plus administrative:
- `not_a_gap`
- `not_in_7cat`

Referenced as `categories_allowed` field in every Phase-A-authored stub.

## Backward compatibility

If Phase D or later re-authors any Block 1 stub natively (replacing the additive wrapper with a native `items[]`), the extraction rule still works — `delta_2026_04_05_reclassification` key absence triggers the Blocks-2-6 path, and iter-1 fields may or may not be preserved depending on Phase D decision.

If a future version migrates Block 1 to native schema, preserve iter-1 content in a separate key (e.g., `iter1_original_items`) rather than deleting it, per preservation discipline.

## Scripts using this rule in Phase B

- `data/quality_protocol/scripts/build_gap_rollup_round_1.py` — produces `data/p2v2_phase_a_rollups/gap_rollup_round_1.json`
- `data/quality_protocol/scripts/build_heatmap_27x10.py` — produces heat-map outputs

Both scripts embed the extraction functions above and validate the union count (sum per-pilot matches Phase A consolidation total of 3,562).
