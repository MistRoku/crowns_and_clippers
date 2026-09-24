#!/usr/bin/env python3
"""
Convert one generated image (PNG bytes, any extension) into an optimised JPEG.
Usage: python3 tools/convert-one.py <file-relative-to-images> <w:h> <width> [bias]
bias: 0.0 keep top, 0.5 centre, 1.0 keep bottom (default 0.5)
Skips files that are already real JPEGs.
"""
import os
import sys

from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', 'images')


def crop_to_aspect(im, aspect, bias):
    w, h = im.size
    target = aspect[0] / aspect[1]
    current = w / h
    if abs(current - target) < 0.01:
        return im
    if current > target:
        new_w = int(h * target)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(w / target)
    top = max(0, min(int((h - new_h) * bias), h - new_h))
    return im.crop((0, top, w, top + new_h))


def main():
    rel, aspect_s, width_s = sys.argv[1], sys.argv[2], sys.argv[3]
    bias = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
    aspect = tuple(float(x) for x in aspect_s.split(':'))
    width = int(width_s)

    path = os.path.join(BASE, rel)
    im = Image.open(path)
    if im.format == 'JPEG':
        print(f'skip (already jpeg): {rel}')
        return
    im = im.convert('RGB')
    im = crop_to_aspect(im, aspect, bias)
    if im.size[0] > width:
        new_h = int(im.size[1] * width / im.size[0])
        im = im.resize((width, new_h), Image.LANCZOS)
    tmp = path + '.tmp.jpg'
    im.save(tmp, 'JPEG', quality=82, progressive=True, optimize=True)
    os.replace(tmp, path)
    print(f'ok: {rel} {im.size[0]}x{im.size[1]} {os.path.getsize(path)//1024} KB')


if __name__ == '__main__':
    main()
