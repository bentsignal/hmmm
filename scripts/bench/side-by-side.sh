#!/usr/bin/env zsh
# Videos of the React Native list and the native one doing the same thing in
# the same conversation, side by side (left: React Native, right: native):
#
#   scripts/bench/side-by-side.sh [--android] [fling burst react hold]
#
# - fling: veraDev.list().fling (constant speed on the UI thread) for 6 s.
# - burst: 40 messages from the bots over 8 s (dev:burst).
# - react: a 👍 on the newest message and off again (veraDev.conversation()).
# - hold: a long press on the newest message, then closing the menu. The
#   one scenario a test driver touches the screen for: BENCH_AD is the
#   agent-device command for this device, BENCH_HOLD the point to hold,
#   BENCH_CLOSE a point on the blurred backdrop that closes the menu.
#
# Needs BENCH_GROUP (see head-to-head.sh). Writes
# .cache/evidence/h2h-<scenario>.mp4. Hold the heavy-work lock: recording
# takes the Mac's time.
set -u
cd "$(dirname "$0")/../.."
FLAG=()
[[ ${1:-} == --android ]] && { FLAG=(--android); shift; }
SCENARIOS=(${@:-fling burst react hold})
GROUP=${BENCH_GROUP:?set BENCH_GROUP to the conversation}
PREFIX=h2h${FLAG:+-android}
E=.cache/evidence

sim() { scripts/sim.sh $FLAG "$@"; }
js() { sim eval "$1" 2>/dev/null | tail -1; }
say() {
  (cd services/backend && npx convex run dev:say "{\"conversationId\":\"$GROUP\",\"username\":\"$1\",\"body\":\"$2\"}" >/dev/null 2>&1)
}

open_fresh() {
  local list=$1
  sim relaunch >/dev/null 2>&1; sleep 8
  js "veraDev.nativeList($([[ $list == native ]] && echo true || echo false))" >/dev/null
  sim relaunch >/dev/null 2>&1; sleep 8
  sim open "/conversation/$GROUP" >/dev/null; sleep 8
}

scenario_fling() {
  js "void veraDev.list().fling(5500, 6000)" >/dev/null; sleep 7
}
scenario_burst() {
  (cd services/backend && npx convex run dev:burst "{\"conversationId\":\"$GROUP\",\"count\":40,\"seconds\":8,\"label\":\"Burst\"}" >/dev/null 2>&1)
  sleep 10
}
scenario_react() {
  js "veraDev.conversation().react(\"$TARGET\", \"\u{1F44D}\")" >/dev/null; sleep 2.5
  js "veraDev.conversation().react(\"$TARGET\", \"\u{1F44D}\")" >/dev/null; sleep 2.5
}
scenario_hold() {
  ${=BENCH_AD:?set BENCH_AD} longpress ${=BENCH_HOLD:?set BENCH_HOLD} 700 >/dev/null 2>&1; sleep 2
  ${=BENCH_AD} click ${=BENCH_CLOSE:?set BENCH_CLOSE} >/dev/null 2>&1; sleep 2
}

for scenario in $SCENARIOS; do
  for list in rn native; do
    open_fresh $list
    if [[ $scenario == react || $scenario == hold ]]; then
      TARGET="$scenario me ($list) $(date +%H%M%S)"
      say maya "$TARGET"; sleep 4
    fi
    sim record "$PREFIX-$scenario-$list" >/dev/null; sleep 0.5
    scenario_$scenario
    sim stop >/dev/null
  done
  ffmpeg -loglevel error -y -i "$E/$PREFIX-$scenario-rn.mp4" -i "$E/$PREFIX-$scenario-native.mp4" \
    -filter_complex "[0]fps=30,scale=-2:1200,pad=iw+16:ih:0:0:red[a];[1]fps=30,scale=-2:1200[b];[a][b]hstack=shortest=1,format=yuv420p" \
    "$E/$PREFIX-$scenario.mp4" && echo "$E/$PREFIX-$scenario.mp4"
done
