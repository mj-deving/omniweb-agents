#!/usr/bin/env python3
"""
Structural analyzer over /tmp/score100-audit/corpus.sqlite.

Produces a JSON report covering every dimension required by the audit:
  category, length bands, opening shape, evidence anchoring, contradiction shape,
  tone / certainty, snapshot-vs-thesis-vs-prediction, claim count, density,
  single-vs-multi-frame, voice archetype, named-entity presence,
  comparison/tension/surprise, context-free legibility, repetition patterns,
  category-specific differences, likely anti-patterns.

Reads the DB only. No network.
"""
import json, re, sqlite3, statistics, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_DB = Path("/tmp/score100-audit/corpus.sqlite")
DB = HERE / "corpus.sqlite" if (HERE / "corpus.sqlite").exists() else DEFAULT_DB
OUT = HERE / "analysis.json"

# ---------- helpers ----------

RE_DOLLAR = re.compile(r"\$[\d,]+(\.\d+)?[KMB]?\b")
RE_PCT    = re.compile(r"-?\d+(\.\d+)?%")
RE_NUM    = re.compile(r"\b\d[\d,]{0,12}(\.\d+)?\b")
RE_ASSET  = re.compile(r"\b(BTC|ETH|SOL|DOT|BNB|XRP|ADA|DOGE|MATIC|ARB|OP|AVAX|LINK|LTC|ATOM|UNI|TRX|TON|NEAR|APT|SUI|INJ|SEI|TIA|RNDR|FET|WIF|BONK|SHIB|PEPE|JUP|PYTH|FLOKI|GMT|FTM|ICP|LDO|MKR|AAVE|XMR|FIL|VET|ALGO|HBAR|MNT|KAS|FDUSD|USDT|USDC|TUSD|DAI|BUSD)\b")
RE_INST   = re.compile(r"\b(Fed|FOMC|ECB|BOJ|BOE|PBOC|Treasury|SEC|CFTC|DOJ|IMF|NATO|OFAC|BIS|FDIC|OPEC|Coinbase|Binance|Kraken|BlackRock|Fidelity|FRED|Cboe|VIX|DefiLlama|Polymarket|Kalshi|S&P|Nasdaq|Dow|Russell)\b")
RE_FRESH  = re.compile(r"\b(just|now|today|currently|right\s+now|moments\s+ago|within\s+the\s+last|over\s+the\s+past|minutes?\s+ago|hours?\s+ago|yesterday)\b", re.I)
RE_HEDGE  = re.compile(r"\b(may|might|could|suggests?|indicates?|appears?\s+to|seems?\s+to|likely|possibly|potentially|seemingly|perhaps)\b", re.I)
RE_DECL   = re.compile(r"\b(is|are|was|were|will|shows?|means?|proves?|confirms?|breaks?|diverges?|stalls?|signals|implies?|triggers|drives|pushes|closes)\b", re.I)
RE_QUEST  = re.compile(r"\?")
RE_CONTR  = re.compile(r"\b(but|yet|however|while|whereas|despite|although|though|even\s+though|vs\.?|versus|contradicts?|against|diverges?|in\s+contrast|surprisingly|unexpectedly|rather\s+than|instead\s+of|not\s+.{2,20}?\bbut)\b", re.I)
RE_COMPARE= re.compile(r"\b(vs\.?|versus|compared\s+to|relative\s+to|higher\s+than|lower\s+than|above|below|greater\s+than|less\s+than|diverges?|gap|spread)\b", re.I)
RE_CTA    = re.compile(r"\b(watch|expect|short|long|buy|sell|stop|enter|exit|hold|avoid|consider|position|de-risk|hedge|scale\s+in)\b", re.I)
RE_PRED   = re.compile(r"\b(predict|forecast|expect|project|target|will|going\s+to|by\s+\d|within\s+\d|above|below|in\s+\d+\s*(minutes?|hours?|days?|weeks?|months?))\b", re.I)
RE_FALSIF = re.compile(r"\b(invalid\s+if|falsif|unless|fails?\s+if|breaks?\s+down\s+if|confirmed\s+if)\b", re.I)
RE_REPORT = re.compile(r"\bagent_post\b|\bbet\b|\btweet\b|placed|registered|attested", re.I)

STOPWORDS = set("""a an the and or but if then so to of in on for at by with from as is are was were be been being have has had do does did not no this that these those it its their his her they them we us you your
""".split())

BOILERPLATE_PATTERNS = [
    re.compile(r"\bshield alert\b", re.I),
    re.compile(r"\bflagged for posting at abnormally high volume\b", re.I),
    re.compile(r"\bcheck recent tippers before rewarding\b", re.I),
    re.compile(r"\bunder surveillance\b", re.I),
]

def categorize_length(n):
    if n < 80: return "<80"
    if n < 150: return "80-149"
    if n < 220: return "150-219"
    if n < 320: return "220-319"
    if n < 500: return "320-499"
    if n < 900: return "500-899"
    return "900+"

def opening_shape(txt):
    # First ~60 chars define opening
    open_ = txt.strip()[:80]
    if open_.startswith("<agent_post>"):
        open_ = open_[len("<agent_post>"):]
    open_ = open_.strip()
    if not open_: return "empty"
    # classify heuristically
    first_word = open_.split()[0] if open_.split() else ""
    if RE_ASSET.match(open_) or re.match(r"^\$?[A-Z]{2,5}\b", open_): return "asset-or-ticker-first"
    if re.match(r"^[\"\']?[A-Z][a-z]+\s+(at|of|is|was|breaks?|just|now|climbs?|falls?)", open_): return "subject-verb-value"
    if re.match(r"^[\d\$]", open_): return "number-first"
    if RE_QUEST.search(open_): return "question-open"
    if re.match(r"^(Placed|Registered|Attested|Tipped|Bet)\b", open_): return "action-report"
    if re.match(r"^(Note|Note:|Thread|In short|Summary|Context)", open_): return "meta-frame"
    if re.match(r"^(The|A|An)\s+", open_): return "definite-article"
    return "other"

def evidence_anchor(txt):
    has_dollar = bool(RE_DOLLAR.search(txt))
    has_pct = bool(RE_PCT.search(txt))
    has_num = bool(RE_NUM.search(txt))
    has_inst = bool(RE_INST.search(txt))
    has_asset = bool(RE_ASSET.search(txt))
    has_time = bool(RE_FRESH.search(txt))
    score = sum([has_dollar, has_pct, has_num, has_inst, has_asset, has_time])
    if score >= 4: return "dense-anchored"
    if has_dollar or has_pct: return "numeric-anchored"
    if has_asset or has_inst: return "named-only"
    if has_num: return "vague-numeric"
    return "unanchored"

def contradiction_shape(txt):
    contr_hits = len(RE_CONTR.findall(txt))
    compare_hits = len(RE_COMPARE.findall(txt))
    if contr_hits == 0 and compare_hits == 0: return "descriptive-no-tension"
    if contr_hits == 1 and compare_hits <= 2: return "single-tension"
    if contr_hits >= 2 or compare_hits >= 3: return "multi-chain"
    return "soft-tension"

def tone_certainty(txt):
    hedge = len(RE_HEDGE.findall(txt))
    decl = len(RE_DECL.findall(txt))
    if RE_QUEST.search(txt): return "interrogative"
    if hedge >= 2 and decl <= 1: return "hedged"
    if decl >= 2 and hedge == 0: return "declarative"
    if decl >= 1 and hedge == 1: return "mixed"
    return "neutral"

def shape_class(txt, category):
    if RE_REPORT.search(txt) and len(txt) < 200: return "report"
    if category == "PREDICTION" or RE_PRED.search(txt): return "prediction"
    if RE_CTA.search(txt) and ("buy" in txt.lower() or "sell" in txt.lower() or "position" in txt.lower()): return "call-to-action"
    if RE_CONTR.search(txt) and len(txt) >= 150: return "thesis"
    if len(txt) < 180 and not RE_CONTR.search(txt): return "snapshot"
    return "thesis"

def count_claims(txt):
    # proxy: count sentence-like clauses with a declarative verb or comparison
    sents = re.split(r"(?<=[.!?])\s+|\s—\s|\s–\s|;\s", txt)
    c = 0
    for s in sents:
        if RE_DECL.search(s) or RE_COMPARE.search(s) or RE_PRED.search(s):
            c += 1
    return c

def density(txt):
    if not txt: return 0.0
    # proxy: unique content-word ratio
    words = re.findall(r"[A-Za-z$%\d\.\-]+", txt.lower())
    content = [w for w in words if w not in STOPWORDS and len(w) > 1]
    if not content: return 0.0
    return len(set(content)) / max(1, len(content))

def frame_count(txt):
    # proxy: count distinct asset/institution mentions
    names = set(re.findall(RE_ASSET, txt) + re.findall(RE_INST, txt))
    # plus unique metric types
    metrics = 0
    if RE_PCT.search(txt): metrics += 1
    if RE_DOLLAR.search(txt): metrics += 1
    return max(1, len(names) + metrics)

def voice_archetype(txt):
    t = txt.lower()
    if "<agent_post>" in txt or RE_REPORT.search(txt) and "placed" in t: return "agentic-report"
    if any(w in t for w in ["expect","watch","my take","my view","imo","i think"]): return "human-voice"
    if RE_HEDGE.search(txt) and not RE_CTA.search(txt) and len(txt) > 180: return "clinical"
    if any(w in t for w in ["truth is", "the reality","no one is talking","narrative","hype"]): return "polemical"
    if len(txt) > 260 and RE_DECL.search(txt): return "narrative"
    return "neutral"

def named_entity_present(txt):
    return {
        "asset": bool(RE_ASSET.search(txt)),
        "institution": bool(RE_INST.search(txt)),
        "dollar": bool(RE_DOLLAR.search(txt)),
        "percent": bool(RE_PCT.search(txt)),
        "timestamp": bool(RE_FRESH.search(txt)),
    }

def legibility_no_context(txt):
    # Must have: named entity + numeric anchor + a verb/claim
    has_name = bool(RE_ASSET.search(txt) or RE_INST.search(txt))
    has_num = bool(RE_DOLLAR.search(txt) or RE_PCT.search(txt) or RE_NUM.search(txt))
    has_verb = bool(RE_DECL.search(txt))
    return has_name and has_num and has_verb

def repetition_ngrams(texts, n=4, top=15):
    counts = Counter()
    for t in texts:
        words = re.findall(r"[A-Za-z']+", t.lower())
        for i in range(len(words) - n + 1):
            gram = tuple(words[i:i+n])
            counts[gram] += 1
    return counts.most_common(top)

def is_human_writable(txt):
    t = strip_tags(txt or "")
    if not t:
        return False
    return not any(pattern.search(t) for pattern in BOILERPLATE_PATTERNS)

def strip_tags(t):
    return re.sub(r"<[^>]+>", "", t).strip()

# ---------- analysis ----------

def safe_length_stats(texts):
    lens = sorted(len(t) for t in texts)
    if not lens: return {"min":0,"p25":0,"median":0,"p75":0,"max":0}
    def q(p):
        if len(lens)==1: return lens[0]
        idx = int(p*(len(lens)-1))
        return lens[idx]
    return {"min":lens[0],"p25":q(0.25),"median":q(0.5),"p75":q(0.75),"max":lens[-1]}

def main(cohort_threshold=90):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cohort = cur.execute(
        "SELECT * FROM posts WHERE score >= ? ORDER BY ts_ms DESC", (cohort_threshold,)
    ).fetchall()
    score100 = [r for r in cohort if r["score"] == 100]
    human_writable_cohort = [r for r in cohort if is_human_writable(r["text"] or "")]
    human_writable_score100 = [r for r in score100 if is_human_writable(r["text"] or "")]
    n = len(cohort); n100 = len(score100)

    def dist(fn, rows):
        c = Counter(fn(r) for r in rows)
        total = sum(c.values()) or 1
        return {k: {"n": v, "pct": round(100*v/total, 1)} for k, v in c.most_common()}

    def dimension_stats(rows):
        texts = [strip_tags(r["text"] or "") for r in rows]
        cats  = [r["category"] or "?" for r in rows]
        return {
            "n": len(rows),
            "category":          Counter(cats).most_common(),
            "length_band":       Counter(categorize_length(len(t)) for t in texts).most_common(),
            "length_stats":      safe_length_stats(texts),
            "opening_shape":     Counter(opening_shape(t) for t in texts).most_common(),
            "evidence_anchor":   Counter(evidence_anchor(t) for t in texts).most_common(),
            "contradiction":     Counter(contradiction_shape(t) for t in texts).most_common(),
            "tone_certainty":    Counter(tone_certainty(t) for t in texts).most_common(),
            "shape_class":       Counter(shape_class(t, c) for t,c in zip(texts, cats)).most_common(),
            "claims_median":     statistics.median([count_claims(t) for t in texts] or [0]),
            "density_median":    round(statistics.median([density(t) for t in texts] or [0]), 3),
            "frames_median":     statistics.median([frame_count(t) for t in texts] or [0]),
            "voice_archetype":   Counter(voice_archetype(t) for t in texts).most_common(),
            "named_entity_rates":{
                "asset_pct":       round(100*sum(1 for t in texts if RE_ASSET.search(t))/max(1,len(texts)),1),
                "institution_pct": round(100*sum(1 for t in texts if RE_INST.search(t))/max(1,len(texts)),1),
                "dollar_pct":      round(100*sum(1 for t in texts if RE_DOLLAR.search(t))/max(1,len(texts)),1),
                "percent_pct":     round(100*sum(1 for t in texts if RE_PCT.search(t))/max(1,len(texts)),1),
                "timestamp_pct":   round(100*sum(1 for t in texts if RE_FRESH.search(t))/max(1,len(texts)),1),
            },
            "comparison_pct":     round(100*sum(1 for t in texts if RE_COMPARE.search(t))/max(1,len(texts)),1),
            "contradiction_marker_pct": round(100*sum(1 for t in texts if RE_CONTR.search(t))/max(1,len(texts)),1),
            "legibility_pct":     round(100*sum(1 for t in texts if legibility_no_context(t))/max(1,len(texts)),1),
            "has_attest_pct":     round(100*sum(1 for r in rows if r["has_attest"])/max(1,len(rows)),1),
            "source_count_median":statistics.median([r["source_count"] or 0 for r in rows] or [0]),
            "reply_to_pct":       round(100*sum(1 for r in rows if r["reply_to"])/max(1,len(rows)),1),
            "agree_median":       statistics.median([r["agree"] or 0 for r in rows] or [0]),
            "disagree_median":    statistics.median([r["disagree"] or 0 for r in rows] or [0]),
        }

    by_cat = {}
    cats_present = set(r["category"] or "?" for r in cohort)
    for cat in sorted(cats_present):
        rows_c = [r for r in cohort if (r["category"] or "?") == cat]
        by_cat[cat] = dimension_stats(rows_c)

    human_writable_by_cat = {}
    human_writable_cats = set(r["category"] or "?" for r in human_writable_cohort)
    for cat in sorted(human_writable_cats):
        rows_c = [r for r in human_writable_cohort if (r["category"] or "?") == cat]
        human_writable_by_cat[cat] = dimension_stats(rows_c)

    all_texts_100 = [strip_tags(r["text"] or "") for r in score100]
    all_texts_cohort = [strip_tags(r["text"] or "") for r in cohort]
    human_writable_texts_100 = [strip_tags(r["text"] or "") for r in human_writable_score100]
    human_writable_texts_cohort = [strip_tags(r["text"] or "") for r in human_writable_cohort]

    excluded_examples = []
    for r in score100:
        text = strip_tags(r["text"] or "")
        if is_human_writable(text):
            continue
        excluded_examples.append({
            "tx": r["tx_hash"][:16],
            "cat": r["category"],
            "score": r["score"],
            "text": text[:240],
        })
        if len(excluded_examples) >= 5:
            break

    representative_100 = []
    for r in human_writable_score100[:30]:
        representative_100.append({
            "tx": r["tx_hash"][:16],
            "cat": r["category"],
            "score": r["score"],
            "len": r["text_len"],
            "agree": r["agree"],
            "disagree": r["disagree"],
            "reply_count": r["reply_count"],
            "text": strip_tags(r["text"] or "")[:500],
        })

    report = {
        "cohort_threshold": cohort_threshold,
        "cohort_size": n,
        "score_100_size": n100,
        "block_range": (min((r["block_number"] or 0) for r in cohort), max((r["block_number"] or 0) for r in cohort)) if cohort else None,
        "ts_range_ms":  (min((r["ts_ms"] or 0) for r in cohort), max((r["ts_ms"] or 0) for r in cohort)) if cohort else None,
        "overall": dimension_stats(cohort),
        "score_100_only": dimension_stats(score100),
        "human_writable_filter": {
            "patterns": [pattern.pattern for pattern in BOILERPLATE_PATTERNS],
            "excluded_score_ge_90": n - len(human_writable_cohort),
            "excluded_score_100": n100 - len(human_writable_score100),
            "excluded_examples": excluded_examples,
        },
        "overall_human_writable": dimension_stats(human_writable_cohort),
        "score_100_human_writable": dimension_stats(human_writable_score100),
        "by_category_ge90": by_cat,
        "by_category_ge90_human_writable": human_writable_by_cat,
        "top_4grams_score_ge_90": [
            {"gram": " ".join(g), "n": c} for g, c in repetition_ngrams(all_texts_cohort, n=4, top=20)
        ],
        "top_4grams_score_100": [
            {"gram": " ".join(g), "n": c} for g, c in repetition_ngrams(all_texts_100, n=4, top=20)
        ],
        "top_4grams_score_ge_90_human_writable": [
            {"gram": " ".join(g), "n": c} for g, c in repetition_ngrams(human_writable_texts_cohort, n=4, top=20)
        ],
        "top_4grams_score_100_human_writable": [
            {"gram": " ".join(g), "n": c} for g, c in repetition_ngrams(human_writable_texts_100, n=4, top=20)
        ],
        "representative_score_100": representative_100,
    }
    OUT.write_text(json.dumps(report, indent=2, default=str))
    print(f"wrote {OUT} cohort={n} score100={n100} human_writable_score100={len(human_writable_score100)}")

if __name__ == "__main__":
    main()
