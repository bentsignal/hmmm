#!/usr/bin/env zsh
# The native message list against the React Native one, in the real app, on
# the same conversation, with the same driver (.plans/native-message-list.md):
#
#   scripts/bench/head-to-head.sh [--android] [fling|burst|all]
#
# For each list (the React Native one, then the native one), it flips the
# switch (veraDev.nativeList), restarts the app, opens the conversation at
# its newest message, and runs:
#
# - fling: a constant-speed scroll toward older messages on the UI thread
#   (veraDev.list().fling: Reanimated's scrollTo each frame for the React
#   Native list, the binary's benchFling on the display link for the native
#   one), BENCH_SPEED points a second for BENCH_MS, through older pages.
# - burst: BENCH_BURST messages from the bots over BENCH_BURST_SECONDS
#   (dev:burst), at the bottom.
#
# Each reports the UI thread's frames (scripts/sim.sh frames), the
# JavaScript thread's stalls over 50 ms (veraDev.stalls), and for the fling
# how far it got and how long it waited at the oldest message. No test
# driver touches the screen while it measures.
#
# Needs the device up and signed in, BENCH_GROUP set to the conversation
# (a seeded busy group: devBusy:seed), and a production bundle for numbers
# that mean anything (VERA_METRO_PROFILE=1 scripts/sim.sh up). Hold the
# heavy-work lock while it runs. Results go to .cache/bench/<run>.jsonl.
set -u
cd "$(dirname "$0")/../.."
FLAG=()
[[ ${1:-} == --android ]] && { FLAG=(--android); shift; }
WHAT=${1:-all}
GROUP=${BENCH_GROUP:?set BENCH_GROUP to the conversation}
SPEED=${BENCH_SPEED:-5500}
MS=${BENCH_MS:-10000}
BURST=${BENCH_BURST:-150}
BURST_SECONDS=${BENCH_BURST_SECONDS:-15}
RUN=.cache/bench/$(date +%Y%m%d-%H%M%S)-${FLAG:+android-}${WHAT}.jsonl
mkdir -p .cache/bench

sim() { scripts/sim.sh $FLAG "$@"; }
js() { sim eval "$1" 2>/dev/null | tail -1; }

open_fresh() {
  local list=$1
  sim relaunch >/dev/null 2>&1; sleep 8
  local shown=$(js "veraDev.nativeList($([[ $list == native ]] && echo true || echo false))" | tr -d '"')
  if [[ $shown != $list ]]; then echo "wanted the $list list, got $shown" >&2; return 1; fi
  sim relaunch >/dev/null 2>&1; sleep 8
  sim open "/conversation/$GROUP" >/dev/null; sleep 8
}

record() {
  local list=$1 scenario=$2 frames=$3 stalls=$4 extra=${5:-null}
  local line="{\"list\":\"$list\",\"scenario\":\"$scenario\",\"frames\":$frames,\"stalls\":$stalls,\"fling\":$extra}"
  echo $line | tee -a $RUN
}

fling() {
  local list=$1
  open_fresh $list || return
  js 'globalThis.veraFling = undefined; veraDev.stalls.start()' >/dev/null
  sim frames start >/dev/null
  js "void veraDev.list().fling($SPEED, $MS).then((result) => { globalThis.veraFling = result; })" >/dev/null
  sleep $(( MS / 1000 + 2 ))
  local frames=$(sim frames stop | grep -m1 '^{')
  local stalls=$(js 'JSON.stringify(veraDev.stalls.stop())' | sed 's/^"//; s/"$//; s/\\"/"/g')
  local result=$(js 'JSON.stringify(globalThis.veraFling ?? null)' | sed 's/^"//; s/"$//; s/\\"/"/g')
  record $list fling "${frames:-null}" "${stalls:-null}" "${result:-null}"
}

burst() {
  local list=$1
  open_fresh $list || return
  js 'veraDev.stalls.start()' >/dev/null
  sim frames start >/dev/null
  (cd services/backend && npx convex run dev:burst "{\"conversationId\":\"$GROUP\",\"count\":$BURST,\"seconds\":$BURST_SECONDS,\"label\":\"Burst\"}" >/dev/null 2>&1)
  sleep $(( BURST_SECONDS + 3 ))
  local frames=$(sim frames stop | grep -m1 '^{')
  local stalls=$(js 'JSON.stringify(veraDev.stalls.stop())' | sed 's/^"//; s/"$//; s/\\"/"/g')
  record $list burst "${frames:-null}" "${stalls:-null}"
}

for list in rn native; do
  [[ $WHAT == fling || $WHAT == all ]] && fling $list
  [[ $WHAT == burst || $WHAT == all ]] && burst $list
done
echo "results: $RUN"
