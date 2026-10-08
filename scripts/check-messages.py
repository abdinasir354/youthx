"""Verify every literal translation key used in src/ exists in both messages files.

Usage:  python scripts/check-messages.py
"""
import json
import pathlib
import re
import sys

msgs = {loc: json.load(open(f"src/messages/{loc}.json", encoding="utf-8")) for loc in ("so", "en")}


def has(d, path):
    for part in path.split("."):
        if not isinstance(d, dict) or part not in d:
            return False
        d = d[part]
    return True


def flat(d, prefix=""):
    out = set()
    for k, v in d.items():
        out |= flat(v, f"{prefix}{k}.") if isinstance(v, dict) else {f"{prefix}{k}"}
    return out


DECL = re.compile(r'const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*(?:"([\w.]*)")?\s*\)')
missing = set()
for f in pathlib.Path("src").rglob("*.tsx"):
    src = f.read_text(encoding="utf-8")
    decls = [(m.start(), m.group(1), m.group(2) or "") for m in DECL.finditer(src)]
    for var in {d[1] for d in decls}:
        for use in re.finditer(r"\b" + var + r'\(\s*"([\w.]+)"', src):
            # nearest declaration of this variable above the usage (components are sequential)
            before = [d for d in decls if d[1] == var and d[0] < use.start()]
            if not before:
                continue
            ns = before[-1][2]
            full = f"{ns}.{use.group(1)}" if ns else use.group(1)
            for loc, d in msgs.items():
                if not has(d, full):
                    missing.add(f"{loc}: {full}  ({f})")

diff = flat(msgs["so"]) ^ flat(msgs["en"])
for m in sorted(missing):
    print("MISSING", m)
for k in sorted(diff):
    print("ONLY IN ONE LANGUAGE", k)
if not missing and not diff:
    print("All translation keys OK")
sys.exit(1 if missing or diff else 0)
