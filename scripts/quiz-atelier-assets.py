"""Rebuild QZ5A derivatives from the current Quiz assets/ masters.
Run from the repository root with Python and Pillow (authoring tool only).
No source crop, background removal, skin filtering or source-master writes.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Quiz assets"
OUTPUT = ROOT / "public/assets/quiz/atelier"
MANIFEST = ROOT / "src/quiz/atelierAssets.ts"


def image_url(stem, width, extension):
    return f"/assets/quiz/atelier/{stem}-{width}.{extension}"


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    portraits = {}
    scenes = {}
    names = [f"astra-{name}.png" for name in ["celebrate", "encouraging", "focused", "intro", "pleased", "trying", "welcome"]]
    names += ["atelier-night-desktop.png", "atelier-night-mobile.png"]
    for source in [SOURCE / name for name in names]:
        image = Image.open(source)
        portrait = source.stem.startswith("astra-")
        desktop = "desktop" in source.stem
        widths = [240, 420, 840] if portrait else [1280, 2048] if desktop else [780, 941]
        formats = ["webp", "png"] if portrait else ["webp", "jpg"]
        sizes = {}
        for width in widths:
            height = round(image.height * width / image.width)
            frame = image.resize((width, height), Image.Resampling.LANCZOS)
            for extension in formats:
                if extension == "png" and width == 840:
                    continue
                target = OUTPUT / f"{source.stem}-{width}.{extension}"
                if extension == "webp":
                    frame.save(target, quality=83 if source.stem == "astra-encouraging" and width == 840 else 85, method=6, exact=True)
                elif extension == "jpg":
                    frame.convert("RGB").save(target, quality=84, optimize=True, progressive=True)
                else:
                    frame.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                                   dither=Image.Dither.FLOYDSTEINBERG).save(target, optimize=True)
                sizes[f"{width}{extension}"] = target.stat().st_size
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if portrait:
            name = source.stem.removeprefix("astra-")
            portraits[name] = {
                "mobileSrc": image_url(source.stem, 240, "png"),
                "mobileWebp": image_url(source.stem, 240, "webp"),
                "src": image_url(source.stem, 420, "png"),
                "srcSet": ", ".join(f"{image_url(source.stem, width, 'png')} {width}w" for width in [240, 420]),
                "webp": image_url(source.stem, 420, "webp"),
                "webpSrcSet": ", ".join(f"{image_url(source.stem, width, 'webp')} {width}w" for width in widths),
                "width": 420, "height": 560, "alpha": True,
                "sourceWidth": image.width, "sourceHeight": image.height, "sourceSha256": digest,
                "anchor": {"x": 50, "y": 50, "scale": 0.98,
                           "offsetY": -0.5 if name in ["trying", "welcome"] else 0},
                "eyeAnchor": {"x": 49, "y": 40 if name in ["focused", "welcome", "trying"] else 39},
                "bytes": sizes,
            }
        else:
            name = "desktop" if desktop else "mobile"
            scenes[name] = {
                "src": image_url(source.stem, widths[-1], "jpg"),
                "srcSet": ", ".join(f"{image_url(source.stem, width, 'jpg')} {width}w" for width in widths),
                "webp": image_url(source.stem, widths[-1], "webp"),
                "webpSrcSet": ", ".join(f"{image_url(source.stem, width, 'webp')} {width}w" for width in widths),
                "width": image.width, "height": image.height, "alpha": False,
                "anchor": {"x": 50, "y": 50}, "sourceSha256": digest, "bytes": sizes,
            }
    text = "// QZ5A. Derived from the current polished masters in Quiz assets/. Keep originals intact.\n"
    text += "export const ATELIER_PORTRAITS = " + json.dumps(portraits, indent=2) + " as const;\n"
    text += "export type AtelierExpression = keyof typeof ATELIER_PORTRAITS;\n"
    text += "export const ATELIER_SCENES = " + json.dumps(scenes, indent=2) + " as const;\n"
    MANIFEST.write_text(text, encoding="utf-8", newline="\n")
    print("Wrote atelier derivatives and typed manifest.")


if __name__ == "__main__":
    build()

