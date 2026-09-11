#!/usr/bin/env python3
"""Decompose DualGauge ladder-probe token spend by class (context vs thinking vs output)."""
import json, glob, os

BASE = "/Users/pedrofarinha/DualGauge/BenchmarkingExperiments"
TASKS = ["25", "31", "91", "130", "135"]
CONDS = {
    "vanilla (A)":        f"{BASE}/final59_gen/python/f59-a",
    "full 0.10.1 (b)":    f"{BASE}/final59_gen/python/f59-skill",
    "standard":           f"{BASE}/ladder_gen/python/d5-standard",
    "minimal":            f"{BASE}/ladder_gen/python/d5-minimal",
    "ultrathin":          f"{BASE}/ladder_gen/python/d5-ultrathin",
}
# Opus 4.7 rates ($/Mtok) inferred from total_cost_usd fit: 5 / 6.25 / 0.5 / 25
R_IN, R_CW, R_CR, R_OUT = 5e-6, 6.25e-6, 0.5e-6, 25e-6

def parse(path):
    tin = cw = cr = out = think = turns = 0
    cost = None
    for line in open(path):
        line = line.strip()
        if not line:
            continue
        e = json.loads(line)
        if e["type"] == "stream_event" and e["event"]["type"] == "message_delta":
            u = e["event"].get("usage")
            if u and "output_tokens" in u:
                tin += u.get("input_tokens", 0)
                cw += u.get("cache_creation_input_tokens", 0)
                cr += u.get("cache_read_input_tokens", 0)
                out += u.get("output_tokens", 0)
                think += (u.get("output_tokens_details") or {}).get("thinking_tokens", 0)
                turns += 1
        elif e["type"] == "result":
            cost = e.get("total_cost_usd")
            ru = e.get("usage", {})
            # cross-check: prefer result totals if delta sum diverges
            if abs(ru.get("output_tokens", out) - out) > 5:
                tin, cw, cr, out = (ru.get("input_tokens", tin), ru.get("cache_creation_input_tokens", cw),
                                    ru.get("cache_read_input_tokens", cr), ru.get("output_tokens", out))
    return dict(tin=tin, cw=cw, cr=cr, out=out, think=think, turns=turns, cost=cost)

print(f"{'condição':18} {'task':>4} {'turns':>5} {'in':>6} {'cache_w':>8} {'cache_r':>8} {'output':>7} {'think':>6} {'$total':>7}")
agg = {}
for cond, root in CONDS.items():
    rows = []
    for t in TASKS:
        files = glob.glob(f"{root}/{t}/raw_outputs/*_events.jsonl")
        if not files:
            print(f"{cond:18} {t:>4}  MISSING")
            continue
        r = parse(sorted(files)[0])
        rows.append(r)
        print(f"{cond:18} {t:>4} {r['turns']:>5} {r['tin']:>6} {r['cw']:>8} {r['cr']:>8} {r['out']:>7} {r['think']:>6} {r['cost']:>7.3f}")
    n = len(rows)
    if n:
        m = {k: sum(r[k] for r in rows) / n for k in ("tin", "cw", "cr", "out", "think", "turns", "cost")}
        agg[cond] = m

print()
print(f"{'MÉDIA/task':18} {'turns':>5} {'in':>6} {'cache_w':>8} {'cache_r':>8} {'output':>7} {'think':>6} {'text':>6} {'$':>6}")
for cond, m in agg.items():
    print(f"{cond:18} {m['turns']:>5.1f} {m['tin']:>6.0f} {m['cw']:>8.0f} {m['cr']:>8.0f} {m['out']:>7.0f} {m['think']:>6.0f} {m['out']-m['think']:>6.0f} {m['cost']:>6.3f}")

print()
print("Decomposição do CUSTO médio/task ($ e % do total):")
print(f"{'condição':18} {'$in':>7} {'$cache_w':>9} {'$cache_r':>9} {'$output':>8} {'$modelo':>8} {'$medido':>8}")
for cond, m in agg.items():
    cin, ccw, ccr, cout = m["tin"]*R_IN, m["cw"]*R_CW, m["cr"]*R_CR, m["out"]*R_OUT
    tot = cin + ccw + ccr + cout
    print(f"{cond:18} {cin:>7.3f} {ccw:>9.3f} {ccr:>9.3f} {cout:>8.3f} {tot:>8.3f} {m['cost']:>8.3f}")
    print(f"{'':18} {cin/tot*100:>6.0f}% {ccw/tot*100:>8.0f}% {ccr/tot*100:>8.0f}% {cout/tot*100:>7.0f}%")
