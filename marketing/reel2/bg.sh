#!/usr/bin/env bash
# Hintergrund fürs Baustellen-Reel: schneidet die Mixkit-Clips (clips/<id>.mp4, siehe QUELLEN.md)
# ins Hochformat und schreibt 510 Einzelbilder nach bg/f_0001.jpg … (17 s × 30 fps).
# Aufruf im Ordner marketing/reel2:  bash bg.sh
set -euo pipefail
cd "$(dirname "$0")"
rm -rf bg && mkdir -p bg
GRADE="eq=contrast=1.06:saturation=1.08:gamma=0.98,colorbalance=rs=.03:bs=-.03:rm=.02:bm=-.02"
n=1
seg() { # clip start(s) frames centerX(0..1) slow(1=normal,1.25=Zeitlupe für 24-fps-Clips)
  local id=$1 ss=$2 fr=$3 cx=$4 sl=$5
  ffmpeg -loglevel error -y -ss "$ss" -i "clips/$id.mp4" -an \
    -vf "setpts=(PTS-STARTPTS)*$sl,fps=30,crop=trunc(ih*9/16/2)*2:ih:max(0\,min(iw-ow\,iw*$cx-ow/2)):0,scale=1080:1920:flags=lanczos,$GRADE" \
    -frames:v "$fr" -q:v 2 -start_number "$n" bg/f_%04d.jpg
  n=$((n + fr))
}
seg 1459  0.5 90 0.60 1.25   # A 0–3 s     Holzrahmen-Haus
seg 1457  0.3 90 0.33 1.25   # B 3–6 s     Ziegel
seg 1437  0.5 90 0.42 1.25   # C 6–9 s     Pläne in der Hand
seg 1442  0.3 90 0.47 1.25   # D 9–12 s    Telefonat vor dem Gerüst (Person rechts)
seg 1457  4.5 12 0.62 1.25   # E Budget.
seg 1437  9.5 12 0.55 1.25   # E Rechnungen.
seg 42333 3.0 12 0.50 1.25   # E Zeitplan.
seg 1436  6.0 12 0.45 1.25   # E Aufgaben.
seg 4125  8.0 12 0.70 1      # E Bautagebuch.
seg 1459  6.0 12 0.45 1.25   # E + viele weitere
seg 3971  1.5 78 0.30 1.25   # F 14,4–17 s Sonnenuntergang hinter dem Rohbau
echo "Bilder: $((n - 1))"
