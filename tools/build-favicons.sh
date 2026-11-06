#!/usr/bin/env bash
# Rebuilds every tree favicon / app icon with TRANSPARENT rounded corners.
# The supplied PNGs sit on an opaque cream square, which Chrome shows as white corners in tabs.
# Usage: tools/build-favicons.sh <folder where WYWO-Bluebird-Tree-Favicon-Set.zip was extracted>
# Needs ImageMagick 6 ("convert").
set -euo pipefail
SRC="${1:?usage: $0 <extracted favicon set folder>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

# One shared outline mask. All six icons use the same rounded-square outline, so build it from the four whose
# artwork never touches the cream backdrop (colour flood-fill is reliable there) and reuse it for every theme.
# (A colour-keyed cut would eat the cream / silver areas inside Hazelnut and Beech.)
mask_of() { # $1 = 1024 source -> $2 = grayscale mask (white = icon)
  convert "$1" -alpha set -fuzz 11% -fill none \
    -draw 'matte 0,0 floodfill' -draw 'matte 1023,0 floodfill' -draw 'matte 0,1023 floodfill' -draw 'matte 1023,1023 floodfill' \
    -draw 'matte 3,512 floodfill' -draw 'matte 1020,512 floodfill' -draw 'matte 512,3 floodfill' -draw 'matte 512,1020 floodfill' \
    -alpha extract -threshold 50% -morphology Open Disk:7 -morphology Erode Disk:1.5 "$2"
}
for t in cedar pine maple linden; do mask_of "$SRC/themes/$t/wywo-$t-app-icon-1024.png" "$tmp/m_$t.png"; done
convert "$tmp"/m_cedar.png "$tmp"/m_pine.png "$tmp"/m_maple.png "$tmp"/m_linden.png -evaluate-sequence min -blur 0x1.4 -level 30%,70% "$tmp/mask.png"
bbox=$(convert "$tmp/mask.png" -threshold 50% -format '%@' info:)           # WxH+X+Y of the icon shape
bw=${bbox%%x*}; rest=${bbox#*x}; bh=${rest%%+*}; m=$(( bw > bh ? bw : bh ))

cut_out() { # $1 = 1024 source, $2 = output (square, transparent corners)
  convert "$1" -alpha off "$tmp/mask.png" -compose CopyOpacity -composite -compose Over -crop "$bbox" +repage \
    -background none -gravity center -extent "${m}x${m}" "$2"   # (reset compose: -extent would reuse CopyOpacity and wipe the colours)
}
size() { # $1 = square master, $2 = px, $3 = output
  local extra=(); [ "$2" -le 48 ] && extra=(-unsharp 0x0.6)
  convert "$1" -filter Lanczos -resize "${2}x${2}" "${extra[@]}" "$3"
}

for t in cedar pine maple hazelnut linden beech; do
  d="$ROOT/assets/icons/$t"; mkdir -p "$d"
  cut_out "$SRC/themes/$t/wywo-$t-app-icon-1024.png" "$tmp/$t.png"
  for s in 16 32 48; do size "$tmp/$t.png" $s "$d/favicon-$s.png"; done
  size "$tmp/$t.png" 192 "$d/icon-192.png"; size "$tmp/$t.png" 512 "$d/icon-512.png"
  convert "$d/favicon-16.png" "$d/favicon-32.png" "$d/favicon-48.png" "$d/favicon.ico"
  echo "✓ $t"
done
# Cedar is the site default
cp "$tmp/cedar.png" "$ROOT/assets/icons/cedar/app-icon-1024.png"
cp "$ROOT/assets/icons/cedar/favicon.ico" "$ROOT/favicon.ico"
cp "$ROOT/assets/icons/cedar/favicon-16.png" "$ROOT/favicon-16x16.png"
cp "$ROOT/assets/icons/cedar/favicon-32.png" "$ROOT/favicon-32x32.png"
cp "$ROOT/assets/icons/cedar/icon-192.png" "$ROOT/android-chrome-192x192.png"
cp "$ROOT/assets/icons/cedar/icon-512.png" "$ROOT/android-chrome-512x512.png"
echo "done (apple-touch-icon.png is left opaque on purpose: iOS applies its own rounded mask)"
