"""Subset the project copy of Montserrat (variable, OFL) to Latin + French glyphs, export WOFF2.

Source: assets-src/Montserrat.ttf (copied from the KIWIBYTE assets). Output: src/assets/fonts/.
Run: uv run --with fonttools --with brotli python scripts/make_fonts.py
"""
from pathlib import Path
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "Montserrat.ttf"
OUT = ROOT / "src" / "assets" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

font = TTFont(SRC)
print("axes:", [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes])
unicodes = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+0178,U+2010-2027,U+202F,U+2030-203A,U+20AC,U+2190-2193,U+2212,U+00D7"
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["kern", "liga", "tnum", "lnum", "case", "calt"]
opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(unicodes=subset.parse_unicodes(unicodes))
sub.subset(font)
dest = OUT / "montserrat-latin-var.woff2"
font.flavor = "woff2"
font.save(dest)
shutil.copy(ROOT / "assets-src" / "OFL-Montserrat.txt", ROOT / "public" / "OFL-Montserrat.txt")
print(dest.name, dest.stat().st_size, "bytes")
