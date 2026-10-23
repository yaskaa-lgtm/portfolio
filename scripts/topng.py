"""Re-encode screenshots as real PNG files (content matches extension) before viewing.

Usage: python scripts/topng.py <file-or-glob>... -> writes <dir>/png/<name>.png
Optional: --sheet out.png builds a 2-column contact sheet (half size) of the inputs.
"""
import glob
import sys
from pathlib import Path

from PIL import Image

args = sys.argv[1:]
sheet = None
if "--sheet" in args:
    i = args.index("--sheet")
    sheet = args[i + 1]
    del args[i : i + 2]
files = sorted({f for a in args for f in glob.glob(a)})
outs = []
for f in files:
    p = Path(f)
    dst = p.parent / "png" / (p.stem + ".png")
    dst.parent.mkdir(exist_ok=True)
    Image.open(p).convert("RGB").save(dst, "PNG")
    outs.append(dst)
if sheet:
    ims = [Image.open(o) for o in outs]
    scale = 0.5 if ims[0].width > 800 else 0.6
    ims = [im.resize((int(im.width * scale), int(im.height * scale))) for im in ims]
    cols = 2 if ims[0].width > 500 else 4
    w, h = ims[0].width, max(im.height for im in ims)
    rows = (len(ims) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (255, 0, 255))
    for k, im in enumerate(ims):
        canvas.paste(im, ((k % cols) * (w + 6), (k // cols) * (h + 6)))
    Image.open  # noqa
    canvas.convert("RGB").save(sheet, "PNG")
    outs.append(Path(sheet))
for o in outs:
    with open(o, "rb") as fh:
        assert fh.read(8) == b"\x89PNG\r\n\x1a\n", o
print("\n".join(str(o) for o in outs))
