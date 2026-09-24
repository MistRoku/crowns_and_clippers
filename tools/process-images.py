#!/usr/bin/env python3
"""
Post-processes AI-generated PNGs into web-optimised JPEGs.
Usage: python3 tools/process-images.py
Each spec: (source, destination, aspect (w,h), target width, vertical bias)
bias: 0.0 = crop keeps top, 0.5 = centre, 1.0 = keeps bottom
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'images')

SPECS = [
    ('hero-main.jpg',          'hero-main.jpg',          (16, 9), 1920, 0.45),
    ('interior.jpg',           'interior.jpg',           (3, 2),  1600, 0.5),
    ('tools.jpg',              'tools.jpg',              (3, 2),  1600, 0.5),
    ('exterior.jpg',           'exterior.jpg',           (3, 2),  1600, 0.5),
    ('gallery-1.jpg',          'gallery-1.jpg',          (1, 1),  1000, 0.5),
    ('gallery-2.jpg',          'gallery-2.jpg',          (1, 1),  1000, 0.5),
    ('gallery-3.jpg',          'gallery-3.jpg',          (1, 1),  1000, 0.5),
    ('og-image.jpg',           'og-image.jpg',           (1.91, 1), 1200, 0.5),
    ('barbers/marcus-reid.jpg',  'barbers/marcus-reid.jpg',  (4, 5), 900, 0.35),
    ('barbers/sofia-karim.jpg',  'barbers/sofia-karim.jpg',  (4, 5), 900, 0.35),
    ('barbers/danny-okafor.jpg', 'barbers/danny-okafor.jpg', (4, 5), 900, 0.35),
    ('barbers/tommy-vance.jpg',  'barbers/tommy-vance.jpg',  (4, 5), 900, 0.35),
]


def crop_to_aspect(im: Image.Image, aspect: tuple, bias: float) -> Image.Image:
    w, h = im.size
    target = aspect[0] / aspect[1]
    current = w / h
    if abs(current - target) < 0.01:
        return im
    if current > target:  # too wide -> crop sides
        new_w = int(h * target)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    # too tall -> crop top/bottom with bias
    new_h = int(w / target)
    top = int((h - new_h) * bias)
    top = max(0, min(top, h - new_h))
    return im.crop((0, top, w, top + new_h))


def process(src: str, dst: str, aspect: tuple, width: int, bias: float) -> None:
    src_path = os.path.join(BASE, src)
    if not os.path.exists(src_path):
        print(f'skip (missing): {src}')
        return
    im = Image.open(src_path)
    im = im.convert('RGB')
    im = crop_to_aspect(im, aspect, bias)
    if im.size[0] > width:
        new_h = int(im.size[1] * width / im.size[0])
        im = im.resize((width, new_h), Image.LANCZOS)
    dst_path = os.path.join(BASE, dst)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    tmp_path = dst_path + '.tmp.jpg'
    im.save(tmp_path, 'JPEG', quality=82, progressive=True, optimize=True)
    os.replace(tmp_path, dst_path)
    print(f'ok: {dst}  {im.size[0]}x{im.size[1]}  {os.path.getsize(dst_path)//1024} KB')


if __name__ == '__main__':
    for spec in SPECS:
        process(*spec)
