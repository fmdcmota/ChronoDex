"""
A2-r2-3 spike: find where a reference photo's view sits inside a wider generated scene, so Then/Now can crop the scene
to the same framing. Owner: Agent 2. Spike (Pillow + numpy), not used by src/.

Method: multi-scale search. The reference's real middle band (Agent 5's photo is padded with blurred sides) is
reduced to an edge map; for each scale of the scene, the best-correlating position is found by brute force on small
edge maps. The best (scale, x, y) gives the crop rectangle of the scene that matches the whole reference frame.

Usage: python -I align.py <reference.jpg> <scene.jpg> [band_from band_to]  ->  prints the crop as fractions and saves
       out/align-check.jpg (reference | aligned crop | blend).
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

def edges(img, w):
    h = round(img.height * w / img.width)
    g = np.asarray(img.convert('L').resize((w, h), Image.BILINEAR), dtype=np.float32)
    gx = np.zeros_like(g); gy = np.zeros_like(g)
    gx[:, 1:-1] = g[:, 2:] - g[:, :-2]
    gy[1:-1, :] = g[2:, :] - g[:-2, :]
    e = np.hypot(gx, gy)
    e = np.asarray(Image.fromarray(np.clip(e, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32)
    return e

def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d else 0.0

def main():
    ref = Image.open(sys.argv[1]).convert('RGB')
    scene = Image.open(sys.argv[2]).convert('RGB')
    bf, bt = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (0.0, 1.0)
    # Template: the reference's real band, at a fixed small width.
    TW = 48
    band = ref.crop((round(bf * ref.width), 0, round(bt * ref.width), ref.height))
    tmpl = edges(band, TW)
    th, tw = tmpl.shape
    best = (-2, None)
    # The reference frame inside the scene: try frame widths from 25 % to 100 % of the scene width.
    for frac in np.linspace(0.25, 1.0, 31):
        frame_w_px = scene.width * frac                       # reference frame width in scene pixels
        band_w_px = frame_w_px * (bt - bf)                     # the band's width in scene pixels
        scale_w = round(scene.width * TW / band_w_px)          # scene resized so the band is TW wide
        if scale_w < tw:
            continue
        s = edges(scene, scale_w)
        sh, sw = s.shape
        for y in range(0, sh - th + 1):
            for x in range(0, sw - tw + 1):
                c = ncc(tmpl, s[y:y + th, x:x + tw])
                if c > best[0]:
                    best = (c, (frac, x / sw, y / sh, scale_w))
    score, (frac, bx, by, scale_w) = best
    # Convert the band's position back to the whole reference frame's rectangle in the scene (fractions).
    left = bx - bf * frac
    top = by
    width = frac
    height = frac * (scene.width / scene.height) * (ref.height / ref.width)
    print(f'score {score:.3f}  crop of scene (fractions): left {left:.3f} top {top:.3f} width {width:.3f} height {height:.3f}')
    box = (round(left * scene.width), round(top * scene.height), round((left + width) * scene.width), round((top + height) * scene.height))
    crop = scene.crop(box).resize(ref.size)
    W = 600; H = round(ref.height * W / ref.width)
    sheet = Image.new('RGB', (W * 3 + 20, H), 'white')
    sheet.paste(ref.resize((W, H)), (0, 0)); sheet.paste(crop.resize((W, H)), (W + 10, 0))
    sheet.paste(Image.blend(ref, crop, 0.5).resize((W, H)), (2 * W + 20, 0))
    sheet.save('out/align-check.jpg', quality=85)

main()
