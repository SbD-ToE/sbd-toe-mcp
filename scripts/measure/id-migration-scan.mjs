/**
 * 0.22.0 — varrimento da migração de ids (KG v2.0.0, contrato v2.0).
 *
 * uso: node scripts/measure/id-migration-scan.mjs <id_migrations.jsonl> [out.json]
 *   <id_migrations.jsonl> = data/publish/indexes/id_migrations.jsonl do artefacto verificado do KG v2.0.0.
 *
 * Procura cada `old_id` do mapa em TODOS os ficheiros versionados fora de data/ (ouros, oráculos, fixtures,
 * snapshots, cenários de acceptance, scripts, docs), com correspondência de token exacta. Cada ocorrência é um
 * caso a migrar, com antes → depois; um `new_id: null` (retirado) é declarado, nunca apagado em silêncio.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const mapPath = process.argv[2];
if (!mapPath) { console.error("uso: node scripts/measure/id-migration-scan.mjs <id_migrations.jsonl> [out.json]"); process.exit(2); }
const rows = readFileSync(mapPath, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const files = execFileSync("git", ["ls-files"], { encoding: "utf-8" }).split("\n").filter((f) => f && !f.startsWith("data/") && !/\.(png|jpg|zip)$/.test(f));
const texts = new Map(files.map((f) => { try { return [f, readFileSync(f, "utf-8")]; } catch { return [f, ""]; } }));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const byKind = {};
const hits = [];
for (const r of rows) {
  byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  const re = new RegExp(`(?<![\\w:-])${esc(r.old_id)}(?![\\w:-])`);
  for (const [f, t] of texts) if (re.test(t)) hits.push({ kind: r.kind, old_id: r.old_id, new_id: r.new_id, cause: r.cause, file: f });
}
const out = { map: mapPath, entries: rows.length, by_kind: byKind, files_scanned: files.length, hits };
console.log(`mapa: ${rows.length} entradas ${JSON.stringify(byKind)} · ficheiros varridos: ${files.length} · ocorrências de ids antigos: ${hits.length}`);
for (const h of hits.slice(0, 50)) console.log(`  ${h.file}: ${h.kind} ${h.old_id} → ${h.new_id ?? "RETIRADO"}`);
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(out, null, 1) + "\n");
