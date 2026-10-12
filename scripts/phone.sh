#!/usr/bin/env bash
# Vera Dev on Shawn's phone: the dev client for this worktree's native code,
# loading JavaScript from this worktree's Metro over the Mac's Wi-Fi (the
# phone has to be on the same network). JavaScript changes hot-reload with no build; a native
# build happens only when this fingerprint has no dev client yet.
#
#   scripts/phone.sh [--android] <command>     (iPhone without --android)
#
#   up       build the dev client if needed, start Metro, print the links
#   link     print the links and QR codes again
#   status   the dev client for this fingerprint, Metro, and the Wi-Fi address
#   down     stop serving the phone; Metro stops unless a simulator uses it
#   main     the install link for main's dev client (building it if needed)
#   list     every cached dev client, marking main's
#
# Dev clients are EAS `development` builds (ad hoc, with the notification
# extension), built locally once per fingerprint and cached in
# ~/Library/Caches/vera, so every worktree reuses them. Their install pages
# are on bunny.net (scripts/install-page.sh).
#
# The phone holds one Vera Dev at a time, normally main's dev client, which
# serves every worktree that hasn't changed native code. A worktree that
# has gets its own dev client; once Shawn is done with it, `main` gives him
# main's back. So does it after an internal build (releases). Main's
# fingerprint comes from a checkout of origin/main kept in the cache.
set -euo pipefail

PLATFORM=ios
if [ "${1:-}" = "--android" ]; then
  PLATFORM=android
  shift
fi

ROOT="$(git rev-parse --show-toplevel)"
MOBILE="$ROOT/apps/mobile"
STATE_DIR="$ROOT/.cache/sim"
CACHE="$HOME/Library/Caches/vera/phone-dev-client-$PLATFORM"
MAIN_CHECKOUT="$HOME/Library/Caches/vera/main-checkout"
RELEASE_XCODE="/Applications/Xcode-27.app/Contents/Developer"
SCHEME="vera-dev"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
mkdir -p "$STATE_DIR" "$CACHE"
# shellcheck source=lib/metro.sh
. "$ROOT/scripts/lib/metro.sh"

# The runtime the `development` profile builds (eas.json sets the dev
# variant, already exported, and the notification extension), for this
# checkout or the one at $1.
fingerprint() {
  (cd "${1:-$ROOT}/apps/mobile" && VERA_NOTIFICATION_EXTENSION=1 pnpm exec expo-updates fingerprint:generate --platform "$PLATFORM" </dev/null 2>/dev/null) |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))'
}

# Main's fingerprint, recorded per origin/main commit in $CACHE/main. A new
# commit moves the cached checkout to it and installs its dependencies, which
# the fingerprint reads. Run it in a subshell: the trap is its own.
main_fingerprint() {
  local commit record="$CACHE/main" lock="$MAIN_CHECKOUT.lock" hash
  git -C "$ROOT" fetch -q origin main
  commit="$(git -C "$ROOT" rev-parse origin/main)"
  if [ -f "$record" ] && [ "$(cut -d' ' -f1 "$record")" = "$commit" ]; then
    cut -d' ' -f2 "$record"
    return
  fi
  until mkdir "$lock" 2>/dev/null; do
    echo "another worktree is updating main's checkout; waiting" >&2
    sleep 5
  done
  # shellcheck disable=SC2064 # the path now: lock is local
  trap "rmdir '$lock' 2>/dev/null || true" EXIT
  echo "checking main's native fingerprint (${commit:0:9})" >&2
  if [ -d "$MAIN_CHECKOUT" ]; then
    git -C "$MAIN_CHECKOUT" checkout -q --detach "$commit"
  else
    git -C "$ROOT" worktree add -q --detach "$MAIN_CHECKOUT" "$commit"
  fi
  (cd "$MAIN_CHECKOUT" && pnpm install --frozen-lockfile --silent </dev/null) >&2
  hash="$(fingerprint "$MAIN_CHECKOUT")"
  echo "$commit $hash" >"$record"
  echo "$hash"
}

# The Mac's address on the local network: the default route's interface,
# else Wi-Fi. A plain private IP, because iOS's App Transport Security
# allows plain HTTP to local network addresses (NSAllowsLocalNetworking) but
# blocks it to tailnet (100.x) ones.
address() {
  local iface ip
  iface="$(route -n get default 2>/dev/null | awk '/interface:/ { print $2 }')"
  ip="$(ipconfig getifaddr "${iface:-en0}" 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || true)"
  if [ -z "$ip" ]; then
    echo "this Mac has no local network address; connect it to the phone's Wi-Fi" >&2
    exit 1
  fi
  echo "$ip"
}

build_ios() {
  # The App Store Connect key signs without an Apple ID (README "Apple
  # credentials"); release Xcode matches the internal and store builds.
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.appstoreconnect/vera.env"
  set +a
  (
    cd "$MOBILE"
    if [ -d "$RELEASE_XCODE" ]; then export DEVELOPER_DIR="$RELEASE_XCODE"; fi
    # CocoaPods comes from rbenv, which only login shells set up.
    PATH="/opt/homebrew/bin:$HOME/.rbenv/shims:$PATH" eas build -p ios --profile development --local \
      --non-interactive --output "$1" </dev/null
  )
}

build_android() {
  (cd "$MOBILE" && JAVA_HOME="$(/usr/libexec/java_home -v 17)" \
    eas build -p android --profile development --local --non-interactive --output "$1" </dev/null)
}

# Sets CLIENT_DIR to this fingerprint's dev client, building it unless a
# worktree already did. Sets BUILT when this run made it.
ensure_client() {
  local hash lock artifact
  hash="$(fingerprint)"
  CLIENT_DIR="$CACHE/$hash"
  BUILT=""
  if [ -f "$CLIENT_DIR/install-url" ]; then
    # Install pages over 30 days old are deleted (scripts/install-page.sh);
    # upload the cached build again if this one's is gone.
    if ! curl -fsSI "$(cat "$CLIENT_DIR/install-url")" >/dev/null 2>&1; then
      echo "the install page expired; uploading the cached dev client again"
      "$ROOT/scripts/install-page.sh" "$CLIENT_DIR/vera-dev.$([ "$PLATFORM" = ios ] && echo ipa || echo apk)" \
        "dev-client/$PLATFORM/$hash" "Dev client for native fingerprint ${hash:0:12}." >"$CLIENT_DIR/install-url"
    fi
    return
  fi
  lock="$CLIENT_DIR.lock"
  until mkdir "$lock" 2>/dev/null; do
    echo "another worktree is building this dev client; waiting"
    sleep 15
    [ -f "$CLIENT_DIR/install-url" ] && return
  done
  trap 'rmdir "$lock" 2>/dev/null || true' EXIT
  mkdir -p "$CLIENT_DIR.partial"
  artifact="$CLIENT_DIR.partial/vera-dev.$([ "$PLATFORM" = ios ] && echo ipa || echo apk)"
  # EAS writes the artifact only when the build succeeds, so one left by a
  # failed upload is complete.
  if [ ! -f "$artifact" ]; then
    echo "building the $PLATFORM dev client for fingerprint $hash (native code changed, or the first one); about 15 minutes"
    "build_$PLATFORM" "$artifact"
  fi
  "$ROOT/scripts/install-page.sh" "$artifact" "dev-client/$PLATFORM/$hash" \
    "Dev client for native fingerprint ${hash:0:12}." >"$CLIENT_DIR.partial/install-url"
  git -C "$ROOT" rev-parse HEAD >"$CLIENT_DIR.partial/commit"
  rm -rf "$CLIENT_DIR"
  mv "$CLIENT_DIR.partial" "$CLIENT_DIR"
  rmdir "$lock"
  trap - EXIT
  BUILT=1
}

open_url() {
  echo "$SCHEME://expo-development-client/?url=$(node -p 'encodeURIComponent(process.argv[1])' "http://$(address):$PORT")"
}

links() {
  load_metro
  local install open
  install="$(cat "$CLIENT_DIR/install-url")"
  open="$(open_url)"
  "$ROOT/scripts/qr.sh" "$install" "$STATE_DIR/phone-$PLATFORM-install.png" >/dev/null
  "$ROOT/scripts/qr.sh" "$open" "$STATE_DIR/phone-$PLATFORM-open.png" >/dev/null
  echo "install:  $install"
  echo "          $STATE_DIR/phone-$PLATFORM-install.png"
  echo "open:     $open"
  echo "          $STATE_DIR/phone-$PLATFORM-open.png"
}

up() {
  local main own=""
  address >/dev/null
  # Offline or mid-conflict, serve anyway and say main's is unknown.
  main="$(main_fingerprint)" || main=""
  ensure_client
  ensure_metro
  [ -z "$main" ] || [ "$(basename "$CLIENT_DIR")" = "$main" ] || own=1
  printf 'PLATFORM=%s\nOWN_CLIENT=%s\n' "$PLATFORM" "$own" >"$STATE_DIR/phone-$PLATFORM"
  if [ -z "$main" ]; then
    echo "couldn't check main's native fingerprint: if Vera Dev on the phone isn't this worktree's dev client, install it first"
  elif [ -n "$own" ]; then
    echo "this worktree's native code differs from main's, so it has its own dev client: Shawn installs it from the install link first, and gets main's back afterwards (scripts/phone.sh main)"
  elif [ -n "$BUILT" ]; then
    echo "new dev client for main's native code: Shawn installs it from the install link first; it's main's dev client from now on"
  else
    echo "this worktree uses main's dev client: if Vera Dev on the phone is main's current dev client, only the open link is needed; otherwise (an internal build, an older dev client, or another worktree's) install it first"
  fi
  links
}

# This checkout's dev client and its install link, without Metro (`main`
# runs it in main's checkout).
client() {
  ensure_client
  "$ROOT/scripts/qr.sh" "$(cat "$CLIENT_DIR/install-url")" "$STATE_DIR/phone-$PLATFORM-install.png" >/dev/null
  echo "install:  $(cat "$CLIENT_DIR/install-url")"
  echo "          $STATE_DIR/phone-$PLATFORM-install.png"
}

main_client() {
  local main
  main="$(main_fingerprint)"
  echo "main's dev client (fingerprint ${main:0:12}):"
  # From inside it: the script finds its checkout from the working directory.
  (cd "$MAIN_CHECKOUT" && scripts/phone.sh $([ "$PLATFORM" = android ] && echo --android) client)
}

list() {
  local main dir
  main="$(main_fingerprint)"
  for dir in "$CACHE"/*/; do
    dir="${dir%/}"
    [ -f "$dir/install-url" ] || continue
    printf '%s  built from %s  %s%s\n' "$(basename "$dir" | cut -c1-12)" \
      "$(cut -c1-9 "$dir/commit")" "$(cat "$dir/install-url")" \
      "$([ "$(basename "$dir")" = "$main" ] && echo "  (main)")"
  done
}

status() {
  local hash
  hash="$(fingerprint)"
  CLIENT_DIR="$CACHE/$hash"
  echo "fingerprint: $hash"
  if [ -f "$CLIENT_DIR/install-url" ]; then
    echo "dev client: $(cat "$CLIENT_DIR/install-url") (built from $(cut -c1-9 "$CLIENT_DIR/commit"))"
  else
    echo "dev client: none for this fingerprint; up builds one"
  fi
  load_metro
  echo "metro: ${PORT:-none} ($(metro_running && echo running || echo stopped))"
  echo "serving the phone: $([ -f "$STATE_DIR/phone-$PLATFORM" ] && echo yes || echo no)"
  echo "Wi-Fi address: $(address) (the phone must be on the same network)"
  "$ROOT/scripts/backend.sh" status
}

down() {
  local OWN_CLIENT=""
  # shellcheck disable=SC1090
  [ -f "$STATE_DIR/phone-$PLATFORM" ] && . "$STATE_DIR/phone-$PLATFORM"
  rm -f "$STATE_DIR/phone-$PLATFORM"
  echo "stopped serving the $PLATFORM phone"
  release_metro
  if [ -n "$OWN_CLIENT" ]; then
    echo "Vera Dev on the phone is this worktree's dev client; give Shawn main's back:"
    main_client
  fi
}

command="${1:-status}"
shift || true
case "$command" in
  up) up ;;
  link)
    CLIENT_DIR="$CACHE/$(fingerprint)"
    [ -f "$CLIENT_DIR/install-url" ] || {
      echo "no dev client for this fingerprint; run scripts/phone.sh up" >&2
      exit 1
    }
    load_metro
    metro_running || {
      echo "Metro is not running; run scripts/phone.sh up" >&2
      exit 1
    }
    links
    ;;
  status) status ;;
  down) down ;;
  main) main_client ;;
  client) client ;;
  list) list ;;
  *)
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
