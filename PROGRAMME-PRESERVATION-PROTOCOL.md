# PROGRAMME PRESERVATION PROTOCOL

**Version:** 1.0
**Effective date:** 17 April 2026
**Authority:** Pedro Farinha, programme lead
**Programme:** SbD-ToE / AppSec Core Research Programme (P0 DOI 10.17605/OSF.IO/7T849)
**Applicability:** all repositories of the programme, across all GitHub organizations
**Status:** mandatory reading for all human and AI agents operating on programme repositories

---

## 0. Mandatory attestation for AI agents

Any AI agent authorised to operate on a programme repository must, before making any change:

1. Read this protocol in full.
2. Read the `FREEZE-REGISTRY.md` file at the root of the repository being operated on.
3. Confirm in its working context that it understands which states are protected and which rules apply to the operation being undertaken.

An agent that modifies a programme repository without having read this protocol and the local registry is operating out of scope. Violations are grounds for reverting changes and suspending agent authorisation.

---

## 1. Purpose

This protocol exists to ensure that the scientific integrity of the SbD-ToE / AppSec Core research programme is preserved across repositories, agents, and time. Specifically, it guarantees that:

- Any state referenced by a published paper is permanently recoverable in the exact form referenced.
- The iterative narrative of the programme (Design Science Research cycles) is defensible against any peer review challenge because prior states are preserved in parallel with subsequent states.
- Reproducibility claims made in publications can be honoured by any third party with access to programme artifacts.
- Work by multiple agents — human and AI — across multiple repositories does not degrade the scientific record through incidental deletion, overwrite, or loss of provenance.

Violating this protocol does not just risk local repository problems. It risks invalidating the scientific defensibility of published work. This is why compliance is non-negotiable.

---

## 2. Principles

These principles govern all behaviour on programme repositories. When specific rules in later sections conflict with these principles, the principles take precedence.

**Principle 1 — Snapshot integrity.** Any state that has been referenced by a published paper, registered dataset, or public DOI is immutable. It must be recoverable bit-identical at any future time.

**Principle 2 — Append-only history.** Changes to programme artifacts happen by addition, not by overwrite. A new version co-exists with the previous version; the previous version remains retrievable by explicit version identifier.

**Principle 3 — Reproducibility chain.** Every published finding has an unbroken chain of backing: scripts used (identified by commit hash), input data (identified by content hash), output data (identified by content hash), runtime configuration (captured in manifest), decision thresholds (documented). No link in the chain may disappear.

**Principle 4 — Enforceable discipline.** Rules do not depend on agent goodwill alone. Infrastructure (branch protections, archive deposits, manifest checks) enforces discipline mechanically where possible, and detects violations rapidly where enforcement is not automatic.

**Principle 5 — Freeze events are permanent.** When a state is declared frozen — by paper publication, dataset registration, or explicit programme decision — the freeze is irreversible. Subsequent work produces new frozen states; it does not modify prior ones.

---

## 3. Tagging discipline

### 3.1 Required tags

Every programme repository must maintain annotated Git tags for the following states, for every state that applies to that repository:

- `paper-<id>-published` — state at the moment a paper referencing this repository was published (e.g. `p1-v0-published`, `p2-v0-published`).
- `paper-<id>-frozen` — state at the moment a paper was declared frozen (e.g. `p5-v0-frozen`).
- `paper-<id>-submitted-<venue>` — state at the moment a paper was submitted to a venue (e.g. `p4-rr-submitted-icsme2026`).
- `registration-<id>` — state at the moment of a formal registration event (e.g. `registration-h5aje-v1`).
- `dataset-<id>-released` — state at the moment a dataset was released with DOI (e.g. `dataset-figshare-32043771-released`).
- `corpus-<event>` — state at corpus freeze events (e.g. `corpus-v-freeze-pre-p4-stage2`).
- `apparatus-<event>` — state at apparatus freeze events.

Additional tags may be created for internal milestones, but the above categories are the minimum.

### 3.2 Tag protection rules

Tags in the categories listed in §3.1 are **permanently immutable**. Specifically:

- No tag may be deleted. Ever.
- No tag may be moved to a different commit. Ever.
- Branch protection rules in GitHub or equivalent platform must prevent force-push that would affect tags.
- If a tag was created in error, the correction is made by creating a new tag with corrected name; the erroneous tag is preserved with a note in `FREEZE-REGISTRY.md` explaining the error.

### 3.3 Tag creation authority

Tags may be created by any authorised agent. Tag creation is recorded in `FREEZE-REGISTRY.md` with:
- Tag name
- Commit hash
- Date of creation
- Creator (human name or AI agent identifier)
- Reason (paper, registration, milestone, freeze event)
- External references (DOIs, paper titles)

### 3.4 Annotated, not lightweight

All programme tags must be annotated Git tags (`git tag -a`), not lightweight tags. Annotated tags carry metadata (author, date, message) that lightweight tags do not.

---

## 4. Archiving discipline

### 4.1 Two-service rule

Any state that is referenced by a published paper must be archived in at least two independent archival services. Git tags alone are insufficient — repositories can be deleted, organisations can be closed, GitHub can change policy.

Accepted archival services for the programme:

- **figshare** (https://figshare.com) — DOI-minting, permanent archive, currently in use
- **B2SHARE** (https://b2share.eudat.eu) — European research data repository, currently in use
- **Zenodo** (https://zenodo.org) — CERN-backed, DOI-minting (pending account unblock for this programme)
- **OSF components with registrations** (https://osf.io) — immutable registration mechanism
- **Internet Archive** (https://archive.org) — secondary, not primary

The two-service minimum must include at least one DOI-minting service. Internet Archive alone is not sufficient because it does not mint DOIs.

### 4.2 Archive bundle contents

An archive deposit corresponding to a programme freeze event must contain:

- Complete repository state at the tagged commit (source code, data, documentation, manifests)
- The `FREEZE-REGISTRY.md` as of the freeze
- The commit hash and tag name being archived
- A `MANIFEST.json` or equivalent file listing all archived items with SHA-256 hashes
- A human-readable `README.md` describing the archive bundle, its scientific context, and citation guidance

Archive bundles should be produced by a deterministic script wherever possible, not manually assembled, to reduce risk of omission.

### 4.3 Archive registration

Each archive deposit produces a DOI (or equivalent permanent identifier). The DOI is recorded in:

- The repository's `FREEZE-REGISTRY.md`
- The programme-level registry (§6)
- The `CITATION.cff` of the repository, if applicable

---

## 5. `FREEZE-REGISTRY.md` specification

Every programme repository must contain a file named `FREEZE-REGISTRY.md` at its root. This file is the local source of truth for the repository's published and frozen states.

### 5.1 Required sections

```markdown
# FREEZE REGISTRY — <repository name>

**Repository:** <full name and URL>
**Part of programme:** SbD-ToE / AppSec Core (P0 DOI 10.17605/OSF.IO/7T849)
**Governed by:** PROGRAMME-PRESERVATION-PROTOCOL.md v<version>
**Last updated:** <date>

## Published states

| Tag | Commit | Date | Paper/event | DOI | Archives |
|---|---|---|---|---|---|
| p1-v0-published | <hash> | <date> | P1 v0, AppSec Core normalized ontology | 10.17605/OSF.IO/WG8PV | figshare:<doi>, b2share:<doi> |
| ... | ... | ... | ... | ... | ... |

## Frozen states

| Tag | Commit | Date | Description | Freeze reason | Archives |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

## Protected tags

The following tags are permanently immutable per PROGRAMME-PRESERVATION-PROTOCOL.md §3.2:

- <tag name 1>
- <tag name 2>
- ...

## Current working state

**Current branch:** <branch name>
**Most recent published state:** <tag>
**Expected next freeze event:** <description, or "none scheduled">

## Cross-references

This repository is referenced by:
- <Paper ID> (<DOI>) at tag <tag name>
- ...

This repository depends on:
- <Other repository> at tag <tag name>
- ...

## Change log for this registry

| Date | Change | Author |
|---|---|---|
| ... | ... | ... |
```

### 5.2 Registry maintenance

The `FREEZE-REGISTRY.md` is itself under version control. Changes to it are reviewed like any other change. The registry must be updated in the same commit or pull request that creates a new tag or archive deposit — never separately, never deferred.

### 5.3 Registry as authoritative

When any conflict arises between what the registry says and what an agent believes to be true, **the registry is authoritative**. Agents must not act on assumptions about repository state; they must read the registry.

---

## 6. Programme-level registry

A programme-level registry exists at the OSF P0 component (DOI 10.17605/OSF.IO/7T849) and/or a dedicated coordination location. This registry tracks the programme as a whole, across all repositories.

### 6.1 Required content

- List of all programme repositories with their GitHub URLs and current governance status
- List of all published papers with DOIs and the repository states they reference
- List of all freeze events with dates, tags, archive DOIs
- List of all authorised agents with scope and rule applicability

### 6.2 Update discipline

The programme-level registry is updated whenever a new paper is published, a new freeze event occurs, a new repository is added to the programme, or an agent's authorisation changes. Updates are Pedro Farinha's authority unless explicitly delegated.

### 6.3 Consistency with local registries

Each local `FREEZE-REGISTRY.md` must be consistent with the programme-level registry. If they diverge, the programme-level registry prevails and the local registry is corrected.

---

## 7. Agent operating rules

These rules apply to all AI agents and all human collaborators operating on programme repositories.

**Rule 1 — Read before acting.** Before any modification to a programme repository, read this protocol and the repository's `FREEZE-REGISTRY.md`. Without this reading, no modification is authorised.

**Rule 2 — Respect tag immutability.** Never delete a tag. Never force-push that would affect a tag. Never move a tag to a different commit. Tags listed as protected in `FREEZE-REGISTRY.md` are immutable without exception.

**Rule 3 — Never modify published state.** State at a published tag is the scientific record. If a correction is needed, produce a new state (new commit, new tag if warranted) and document the correction path in the registry. Do not rewrite history.

**Rule 4 — Identify inputs and outputs by hash or tag.** When producing output (code, data, documents), refer to inputs by commit hash or tag name, not by "current" or "latest". Outputs that reference "current" will be ambiguous in 6 months.

**Rule 5 — Update the registry in the same commit.** When creating a tag, producing an archive deposit, or doing anything that affects the state that the registry declares, update `FREEZE-REGISTRY.md` in the same commit or pull request. Never separately, never deferred.

**Rule 6 — Require human authorisation for freeze events.** An agent may not unilaterally declare a state as frozen in the sense that triggers paper publication commitments. Freeze events are programme-level decisions made by Pedro Farinha. An agent may propose a freeze; it cannot execute one.

**Rule 7 — Two-service archive rule.** If an agent is authorised to deposit archives on behalf of the programme, the deposit must go to at least two independent archival services per §4.1.

**Rule 8 — Document violations of any of these rules immediately.** If an agent discovers that a rule has been violated (by itself or by another agent), it must document the violation in `FREEZE-REGISTRY.md` under a "Violations detected" section and flag it for human review. Hiding violations compounds them.

**Rule 9 — No deletions without explicit authorisation.** `git rm`, file deletions that affect any tagged state's reachable history, and operations that remove data are not permitted without explicit human authorisation documented in the registry.

**Rule 10 — Escalate ambiguity.** If an operation's compliance with this protocol is unclear, the agent stops, documents the ambiguity, and requests human guidance. Do not proceed on best-guess interpretation.

---

## 8. Retroactive application

This protocol is established on 17 April 2026. Programme work predates this protocol. Retroactive application is required for existing published states.

### 8.1 Immediate retroactive tasks

For each critical-tier programme repository, the following must be completed within four weeks of this protocol's effective date:

1. Identify all published states (papers referencing this repository) and create `paper-<id>-published` tags pointing to the appropriate historical commits.
2. Identify all frozen states (P5 frozen, registrations, dataset releases) and create corresponding tags.
3. Create the `FREEZE-REGISTRY.md` for the repository with complete historical record.
4. Verify that archive deposits exist for each published state; where deposits are missing or single-service, remediate.
5. Enable branch protection rules that prevent tag deletion and force-push.

### 8.2 Historical uncertainty

If a historical state cannot be identified with certainty (e.g. the exact commit that corresponded to a paper publication is ambiguous), the uncertainty must be documented in the registry. A best-effort tag is created with a note stating "approximate state, exact commit could not be recovered with certainty — see [note]". Honest documentation of uncertainty is better than fabricated precision.

### 8.3 Retroactive archive deposits

If a published state lacks the two-service archive minimum, a retroactive archive deposit is made. The deposit DOI is registered, with a note stating the deposit date is later than the original publication date.

---

## 9. Violation detection and remediation

### 9.1 Detection mechanisms

Violations are detected through:

- Branch protection rules preventing tag deletion at infrastructure level
- Periodic audits comparing `FREEZE-REGISTRY.md` against Git history
- Agent self-reporting per Rule 8
- External notification (e.g. reviewer discovers unreproducibility)

### 9.2 Severity classes

**Class A — irreversible scientific damage.** Protected tag deleted without recoverable backup; published state no longer reproducible. Immediate escalation to programme lead. May require paper retraction or correction.

**Class B — reversible integrity breach.** Registry diverges from actual state; tag naming inconsistency; archive deposit missing. Remediation within one week; no scientific damage if remediated promptly.

**Class C — discipline drift.** Rule not followed but no material consequence (e.g. agent modified without reading registry, but modification happened to be safe). Documented, corrected going forward.

### 9.3 Remediation authority

Class A remediation: programme lead authority, possibly requiring external support (e.g. GitHub support for force-recovery of deleted history).

Class B remediation: any authorised agent, documented in registry.

Class C remediation: agent self-corrects, documents in registry, continues.

---

## 10. Protocol amendment

### 10.1 Amendment authority

This protocol is amended by the programme lead (Pedro Farinha). Amendments produce a new version number (1.1, 1.2, etc. for additive changes; 2.0 for structural changes).

### 10.2 Amendment propagation

When this protocol is amended:

1. Updated `PROGRAMME-PRESERVATION-PROTOCOL.md` is distributed to all programme repositories.
2. Each repository's `FREEZE-REGISTRY.md` is updated to declare governance by the new protocol version.
3. Programme-level registry records the amendment.
4. All agents must re-read the updated protocol before next operation.

### 10.3 Backward compatibility

Amendments preserve backward validity of states recorded under previous protocol versions. A state tagged under protocol v1.0 remains validly tagged if protocol v1.1 changes tagging conventions — the prior state uses prior conventions and this is documented.

---

## 11. Version and attestation

**This protocol:** version 1.0, effective 17 April 2026

**Authoritative location:** programme-level registry at OSF P0 component (DOI 10.17605/OSF.IO/7T849). The copy at each repository's root must match the authoritative version at the time of the most recent repository commit.

**Attestation requirement for agents:** by operating on a programme repository, an agent attests that it has read this protocol and understands its obligations. There is no separate sign-off step — the attestation is implicit in the act of operating, and violations of rules revealed after the fact are treated as breaches of attested commitment.

---

## Appendix A — File checklist per programme repository

Every programme repository must contain at its root:

- [ ] `PROGRAMME-PRESERVATION-PROTOCOL.md` (this file, current version)
- [ ] `FREEZE-REGISTRY.md` (local registry per §5)
- [ ] `README.md` (repository-specific documentation, referring to this protocol and the registry)
- [ ] `CITATION.cff` where applicable (repositories referenced by papers)
- [ ] License file

Branch protection on the default branch must:

- [ ] Prevent force-push
- [ ] Prevent tag deletion
- [ ] Require pull request review for changes to `FREEZE-REGISTRY.md` and `PROGRAMME-PRESERVATION-PROTOCOL.md`

---

## Appendix B — Quick reference for agents

Before any modification:
1. Read this protocol (complete)
2. Read the repository's `FREEZE-REGISTRY.md`
3. Confirm no protected state is affected

During modification:
4. Update `FREEZE-REGISTRY.md` in the same commit as any state-affecting change
5. Never delete tags, never force-push affecting tags
6. Identify all inputs and outputs by commit hash or tag

After modification:
7. Verify `FREEZE-REGISTRY.md` consistency
8. Escalate any ambiguity encountered

Freeze events:
9. Do not unilaterally declare freezes
10. Deposit to two independent archival services, one DOI-minting

---

**End of protocol. Version 1.0 effective 17 April 2026.**
