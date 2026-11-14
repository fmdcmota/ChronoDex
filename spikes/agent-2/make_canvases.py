"""
A2-03 helper: build the layout canvases for the panorama bake-off. Owner: Agent 2 (Studio). MASTER.md 5.4.

Throwaway spike tool (Pillow). No network calls. Writes into out/:
  pano-layout-2x1.png   2048x1024 grey equirectangular grid: the "this is the shape I want" reference for route (b1).
  pano-outpaint-2x1.png the scene pasted at the centre of a 2:1 grey canvas, horizon on the equator, for route (b2).
  pano-outpaint-21x9.png the scene pasted at the centre of a 21:9 grey canvas, for route (c).

Why the scene covers a third of the width: a phone photo spans roughly 65-75 degrees horizontally, which would be
only ~20% of a 360-degree image and lose most of its detail at the model's output size. A third (120 degrees)
over-stretches it a little but keeps the landmark readable when the viewer opens facing it.

Usage: python -I make_canvases.py [scene.jpg] [horizon_fraction]
  horizon_fraction: where the horizon sits in the scene, from the top (0.69 for input/test.jpg, measured by eye).
"""
import sys
from PIL import Image, ImageDraw

SCENE_PATH = sys.argv[1] if len(sys.argv) > 1 else 'out/scene-1880-pro.jpg'
HORIZON_FRACTION = float(sys.argv[2]) if len(sys.argv) > 2 else 0.69
GREY = (128, 128, 128)
SCENE_WIDTH_FRACTION = 1 / 3


def layout_grid(width_px: int, height_px: int) -> Image.Image:
    """Grey canvas with meridians every 30 degrees and parallels every 30 degrees; the equator drawn thicker."""
    img = Image.new('RGB', (width_px, height_px), GREY)
    draw = ImageDraw.Draw(img)
    for lon_deg in range(0, 361, 30):
        x = round(lon_deg / 360 * (width_px - 1))
        draw.line([(x, 0), (x, height_px)], fill=(160, 160, 160), width=2)
    for lat_deg in range(-60, 61, 30):
        y = round((90 - lat_deg) / 180 * (height_px - 1))
        draw.line([(0, y), (width_px, y)], fill=(200, 200, 200) if lat_deg == 0 else (160, 160, 160), width=4 if lat_deg == 0 else 2)
    return img


def outpaint_canvas(scene: Image.Image, width_px: int, height_px: int) -> Image.Image:
    """Grey canvas with the scene centred horizontally and its horizon on the canvas's vertical centre."""
    img = Image.new('RGB', (width_px, height_px), GREY)
    scene_w = round(width_px * SCENE_WIDTH_FRACTION)
    scene_h = round(scene_w * scene.height / scene.width)
    resized = scene.resize((scene_w, scene_h), Image.LANCZOS)
    left = (width_px - scene_w) // 2
    top = round(height_px / 2 - HORIZON_FRACTION * scene_h)
    img.paste(resized, (left, top))
    return img


def main() -> None:
    """Write all three canvases."""
    scene = Image.open(SCENE_PATH).convert('RGB')
    layout_grid(2048, 1024).save('out/pano-layout-2x1.png')
    outpaint_canvas(scene, 2048, 1024).save('out/pano-outpaint-2x1.png')
    outpaint_canvas(scene, 2016, 864).save('out/pano-outpaint-21x9.png')
    print('wrote out/pano-layout-2x1.png, out/pano-outpaint-2x1.png, out/pano-outpaint-21x9.png')


if __name__ == '__main__':
    main()
