# Em curso (Pontifex) — 0.21.1 (fix do overlay) e 0.21.2 (tectos por custo projectado) — 2026-09-26

**Decisões do lead (2026-09-26, via Orchestrator):**
1. **0.21.1 só com o fix do overlay** (`fix/overlay-scope`). PR para `master` com bump 0.21.1, CHANGELOG em rascunho e a linha do
   FREEZE-REGISTRY que segue a tag. Merge, tag, publicação em `next` e o move de `latest` são actos do lead. Nota no PR: a 0.21.1 é
   a candidata natural para sair da 0.19.4 em `latest`.
2. **Tectos por custo projectado** (lista e standard; overlay e variância por requisito incluídos; acima do envelope →
   `needs_decomposition` com lotes) numa release **seguinte (0.21.2)**. Promessa primeiro, código depois, branch próprio a partir da 0.21.1.
3. Commit dos briefs e notas em `agentic/` (vão no PR da 0.21.1, só `agentic/`).

Brief do fix: `agentic/briefs/2026-09-26-pontifex-overlay-scope-fix.md`. Auditoria dos docs: `agentic/briefs/2026-09-26-pontifex-auditoria-docs-mcp-manual.md`.
