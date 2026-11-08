"""Create a 3-second, single-photo cinematic push-in for the home hero.

Requires opencv-python, numpy, Pillow, and imageio-ffmpeg.
The camera move crops and scales the source photograph without changing its
architecture or adding scene elements. The final frame is also saved as poster.
"""

from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "hero-courtyard-SRTjYwHV.jpg"
OUTPUT_DIR = ROOT / "media"
VIDEO = OUTPUT_DIR / "ranawat-hero-cinematic.mp4"
POSTER = OUTPUT_DIR / "ranawat-hero-final.jpg"
WIDTH, HEIGHT, FPS, DURATION = 3840, 2160, 24, 3


def smoothstep(value: float) -> float:
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def camera_at(seconds: float) -> tuple[float, float, float]:
    # One continuous dolly/orbit that settles on its last composition.
    push = smoothstep(seconds / 2.25)
    return 1.0 + 0.11 * push, 960.0 + 54.0 * push, 544.0 - 4.0 * push


def render_frame(source: np.ndarray, seconds: float) -> np.ndarray:
    zoom, center_x, center_y = camera_at(seconds)
    crop_w, crop_h = 1920.0 / zoom, 1080.0 / zoom
    x1 = int(round(center_x - crop_w / 2.0))
    y1 = int(round(center_y - crop_h / 2.0))
    x1 = min(max(0, x1), source.shape[1] - int(crop_w))
    y1 = min(max(0, y1), source.shape[0] - int(crop_h))
    crop = source[y1:y1 + int(round(crop_h)), x1:x1 + int(round(crop_w))]
    frame = cv2.resize(crop, (WIDTH, HEIGHT), interpolation=cv2.INTER_CUBIC)

    # A restrained ivory/gold grade preserves the original late-afternoon light.
    graded = frame.astype(np.float32)
    graded = (graded - 127.5) * 1.025 + 127.5
    graded[:, :, 2] *= 1.018  # warm red channel (BGR input)
    graded[:, :, 0] *= 0.982  # soften cool blue
    return np.clip(graded, 0, 255).astype(np.uint8)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = cv2.imread(str(SOURCE), cv2.IMREAD_COLOR)
    if source is None:
        raise FileNotFoundError(SOURCE)

    last_frame = render_frame(source, DURATION - 1 / FPS)
    Image.fromarray(cv2.cvtColor(last_frame, cv2.COLOR_BGR2RGB)).save(
        POSTER, quality=91, optimize=True, progressive=True
    )

    writer = imageio_ffmpeg.write_frames(
        str(VIDEO),
        (WIDTH, HEIGHT),
        pix_fmt_in="rgb24",
        fps=FPS,
        quality=None,
        codec="libx264",
        macro_block_size=1,
        output_params=["-crf", "17", "-preset", "slow", "-movflags", "+faststart"],
    )
    writer.send(None)
    try:
        for index in range(FPS * DURATION):
            frame = render_frame(source, index / FPS)
            writer.send(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).tobytes())
    finally:
        writer.close()

    print(f"Created {VIDEO} ({WIDTH}x{HEIGHT}, {FPS} fps, {DURATION}s)")
    print(f"Created final-frame poster {POSTER}")


if __name__ == "__main__":
    main()
