"""Generate a 52-card deck in the same layout as the Vecteezy sheet.

Faces use the app's cream card background (#F7F1E3).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/Users/shahidkhalil/Desktop/bhabi thulla/assets/game/cards")
W, H = 420, 588
FACE = (247, 241, 227, 255)  # #F7F1E3
EDGE = (186, 176, 156, 255)
RED = (196, 30, 58, 255)
BLACK = (22, 22, 22, 255)
SKIN = (243, 214, 184, 255)
GOLD = (212, 168, 74, 255)
ROBE_RED = (176, 42, 48, 255)
ROBE_BLACK = (36, 36, 40, 255)

FONT_RANK = ImageFont.truetype(
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf", 62
)
FONT_RANK_SM = ImageFont.truetype(
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf", 52
)
FONT_SUIT = ImageFont.truetype("/System/Library/Fonts/Apple Symbols.ttf", 36)
SUIT_CHAR = {"hearts": "♥", "diamonds": "♦", "clubs": "♣", "spades": "♠"}
FONT_COURT = ImageFont.truetype(
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf", 54
)

RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
SUITS = ["spades", "hearts", "diamonds", "clubs"]


def suit_color(suit: str):
    return RED if suit in ("hearts", "diamonds") else BLACK


def rounded_mask(w, h, r):
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return mask


def new_card():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    plate = Image.new("RGBA", (W, H), FACE)
    draw = ImageDraw.Draw(plate)
    draw.rounded_rectangle((2, 2, W - 3, H - 3), 28, outline=EDGE, width=3)
    plate.putalpha(rounded_mask(W, H, 28))
    img.alpha_composite(plate)
    return img


def draw_heart(d, cx, cy, s, fill):
    r = s * 0.34
    d.ellipse((cx - s * 0.72, cy - s * 0.55, cx + s * 0.02, cy + s * 0.22), fill=fill)
    d.ellipse((cx - s * 0.02, cy - s * 0.55, cx + s * 0.72, cy + s * 0.22), fill=fill)
    d.polygon(
        [
            (cx - s * 0.68, cy - s * 0.02),
            (cx + s * 0.68, cy - s * 0.02),
            (cx, cy + s * 0.78),
        ],
        fill=fill,
    )


def draw_diamond(d, cx, cy, s, fill):
    d.polygon(
        [
            (cx, cy - s * 0.82),
            (cx + s * 0.58, cy),
            (cx, cy + s * 0.82),
            (cx - s * 0.58, cy),
        ],
        fill=fill,
    )


def draw_club(d, cx, cy, s, fill):
    r = s * 0.30
    d.ellipse((cx - r, cy - s * 0.72, cx + r, cy - s * 0.72 + r * 2), fill=fill)
    d.ellipse((cx - s * 0.58, cy - s * 0.22, cx - s * 0.58 + r * 2, cy - s * 0.22 + r * 2), fill=fill)
    d.ellipse((cx + s * 0.58 - r * 2, cy - s * 0.22, cx + s * 0.58, cy - s * 0.22 + r * 2), fill=fill)
    d.polygon(
        [
            (cx - s * 0.16, cy + s * 0.05),
            (cx + s * 0.16, cy + s * 0.05),
            (cx + s * 0.28, cy + s * 0.72),
            (cx - s * 0.28, cy + s * 0.72),
        ],
        fill=fill,
    )


def draw_spade(d, cx, cy, s, fill):
    # Inverted heart body plus stem.
    d.polygon(
        [
            (cx, cy - s * 0.78),
            (cx + s * 0.68, cy + s * 0.08),
            (cx - s * 0.68, cy + s * 0.08),
        ],
        fill=fill,
    )
    r = s * 0.34
    d.ellipse((cx - s * 0.72, cy - s * 0.18, cx + s * 0.02, cy + s * 0.55), fill=fill)
    d.ellipse((cx - s * 0.02, cy - s * 0.18, cx + s * 0.72, cy + s * 0.55), fill=fill)
    d.polygon(
        [
            (cx - s * 0.16, cy + s * 0.28),
            (cx + s * 0.16, cy + s * 0.28),
            (cx + s * 0.28, cy + s * 0.78),
            (cx - s * 0.28, cy + s * 0.78),
        ],
        fill=fill,
    )


def paint_suit(img, suit, cx, cy, size, flip=False):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fill = suit_color(suit)
    if suit == "hearts":
        draw_heart(d, cx, cy, size, fill)
    elif suit == "diamonds":
        draw_diamond(d, cx, cy, size, fill)
    elif suit == "clubs":
        draw_club(d, cx, cy, size, fill)
    else:
        draw_spade(d, cx, cy, size, fill)
    if flip:
        crop = layer.crop((cx - size, cy - size, cx + size, cy + size))
        crop = crop.rotate(180)
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        layer.paste(crop, (int(cx - size), int(cy - size)), crop)
    img.alpha_composite(layer)


def text_size(font, text):
    box = font.getbbox(text)
    return box[2] - box[0], box[3] - box[1]


def draw_suit_at(target, suit, cx, cy, size):
    layer = Image.new("RGBA", target.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fill = suit_color(suit)
    if suit == "hearts":
        draw_heart(d, cx, cy, size, fill)
    elif suit == "diamonds":
        draw_diamond(d, cx, cy, size, fill)
    elif suit == "clubs":
        draw_club(d, cx, cy, size, fill)
    else:
        draw_spade(d, cx, cy, size, fill)
    target.alpha_composite(layer)


def draw_index(img, rank, suit, corner):
    color = suit_color(suit)
    font = FONT_RANK_SM if rank == "10" else FONT_RANK
    tw, th = text_size(font, rank)
    block_w = max(tw, 48) + 8
    block_h = th + 46
    block = Image.new("RGBA", (block_w, block_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(block)
    d.text(((block_w - tw) / 2, 0), rank, font=font, fill=color)
    draw_suit_at(block, suit, block_w / 2, th + 22, 16)
    if corner == "br":
        block = block.rotate(180, expand=True)
        img.alpha_composite(block, (W - block.width - 18, H - block.height - 14))
    else:
        img.alpha_composite(block, (18, 14))


def pip_centers(rank):
    L, C, R = 0.30, 0.50, 0.70
    rows = {
        "t": 0.24,
        "tu": 0.34,
        "m": 0.50,
        "bd": 0.66,
        "b": 0.76,
    }
    if rank == "A":
        return [(C, 0.52, False, 118)]
    if rank == "2":
        return [(C, rows["t"], False, 52), (C, rows["b"], True, 52)]
    if rank == "3":
        return [
            (C, rows["t"], False, 48),
            (C, rows["m"], False, 48),
            (C, rows["b"], True, 48),
        ]
    if rank == "4":
        return [
            (L, rows["t"], False, 46),
            (R, rows["t"], False, 46),
            (L, rows["b"], True, 46),
            (R, rows["b"], True, 46),
        ]
    if rank == "5":
        return [
            (L, rows["t"], False, 44),
            (R, rows["t"], False, 44),
            (C, rows["m"], False, 44),
            (L, rows["b"], True, 44),
            (R, rows["b"], True, 44),
        ]
    if rank == "6":
        return [
            (L, rows["t"], False, 42),
            (R, rows["t"], False, 42),
            (L, rows["m"], False, 42),
            (R, rows["m"], False, 42),
            (L, rows["b"], True, 42),
            (R, rows["b"], True, 42),
        ]
    if rank == "7":
        return [
            (L, rows["t"], False, 38),
            (R, rows["t"], False, 38),
            (C, rows["tu"], False, 38),
            (L, rows["m"], False, 38),
            (R, rows["m"], False, 38),
            (L, rows["b"], True, 38),
            (R, rows["b"], True, 38),
        ]
    if rank == "8":
        return [
            (L, rows["t"], False, 36),
            (R, rows["t"], False, 36),
            (C, rows["tu"], False, 36),
            (L, rows["m"], False, 36),
            (R, rows["m"], False, 36),
            (C, rows["bd"], True, 36),
            (L, rows["b"], True, 36),
            (R, rows["b"], True, 36),
        ]
    if rank == "9":
        return [
            (L, 0.22, False, 34),
            (R, 0.22, False, 34),
            (L, 0.38, False, 34),
            (R, 0.38, False, 34),
            (C, 0.50, False, 34),
            (L, 0.62, True, 34),
            (R, 0.62, True, 34),
            (L, 0.78, True, 34),
            (R, 0.78, True, 34),
        ]
    # 10
    return [
        (L, 0.22, False, 32),
        (R, 0.22, False, 32),
        (C, 0.30, False, 32),
        (L, 0.40, False, 32),
        (R, 0.40, False, 32),
        (L, 0.60, True, 32),
        (R, 0.60, True, 32),
        (C, 0.70, True, 32),
        (L, 0.78, True, 32),
        (R, 0.78, True, 32),
    ]


def draw_pip_card(suit, rank):
    img = new_card()
    draw_index(img, rank, suit, "tl")
    draw_index(img, rank, suit, "br")
    for x, y, flip, size in pip_centers(rank):
        paint_suit(img, suit, int(W * x), int(H * y), size, flip)
    return img


def draw_half_figure(rank, color, robe):
    """Top half of a face card, later mirrored for the bottom."""
    layer = Image.new("RGBA", (W, H // 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = W // 2
    # robe
    d.rounded_rectangle((118, 150, W - 118, H // 2), 8, fill=robe)
    d.rectangle((150, 168, W - 150, H // 2), fill=GOLD)
    d.rectangle((162, 178, W - 162, H // 2), fill=robe)
    # face
    d.ellipse((cx - 46, 78, cx + 46, 168), fill=SKIN)
    d.arc((cx - 28, 118, cx - 4, 142), 20, 160, fill=BLACK, width=3)
    d.arc((cx + 4, 118, cx + 28, 142), 20, 160, fill=BLACK, width=3)
    d.arc((cx - 16, 136, cx + 16, 158), 10, 170, fill=BLACK, width=3)
    if rank == "K":
        d.polygon(
            [
                (cx - 52, 96),
                (cx - 34, 42),
                (cx - 16, 86),
                (cx, 36),
                (cx + 16, 86),
                (cx + 34, 42),
                (cx + 52, 96),
            ],
            fill=GOLD,
        )
    elif rank == "Q":
        d.arc((cx - 50, 48, cx + 50, 110), 200, 340, fill=GOLD, width=8)
        d.ellipse((cx - 8, 40, cx + 8, 56), fill=GOLD)
    else:
        d.pieslice((cx - 54, 58, cx + 54, 130), 200, 340, fill=robe)
        d.rectangle((cx - 54, 86, cx + 54, 104), fill=GOLD)
    # small rank on the robe
    tw, th = text_size(FONT_COURT, rank)
    d.text((cx - tw / 2, 196), rank, font=FONT_COURT, fill=FACE)
    return layer


def draw_court(suit, rank):
    img = new_card()
    color = suit_color(suit)
    robe = ROBE_RED if suit in ("hearts", "diamonds") else ROBE_BLACK
    draw_index(img, rank, suit, "tl")
    draw_index(img, rank, suit, "br")
    top = draw_half_figure(rank, color, robe)
    img.alpha_composite(top, (0, 36))
    bottom = top.rotate(180)
    img.alpha_composite(bottom, (0, H // 2 - 8))
    # suit pips beside the two heads
    paint_suit(img, suit, W - 78, 168, 28, False)
    paint_suit(img, suit, 78, H - 168, 28, True)
    return img


def main():
    for suit in SUITS:
        folder = ROOT / suit
        folder.mkdir(parents=True, exist_ok=True)
        for rank in RANKS:
            img = draw_court(suit, rank) if rank in ("J", "Q", "K") else draw_pip_card(suit, rank)
            img.save(folder / f"{rank}.png", "PNG", optimize=True)
    print("wrote", 52, "cards")


if __name__ == "__main__":
    main()
