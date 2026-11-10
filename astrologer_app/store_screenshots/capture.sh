#!/usr/bin/env bash
# Capture raw store screenshots from an iOS simulator.
#   store_screenshots/capture.sh <app_dir> <simulator_udid> <out_dir> [flutter run args...]
# Runs <app_dir>/store_screenshots/main.dart and saves one PNG per "@@SHOT <name>" line.
set -uo pipefail

APP_DIR=$1; UDID=$2; OUT=$3; shift 3  # remaining args go to flutter run
mkdir -p "$OUT"
LOG="$OUT/run.log"

status_bar() {
  xcrun simctl status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiMode active \
    --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
}

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
status_bar

cd "$APP_DIR"
: > "$LOG"
flutter run -d "$UDID" -t store_screenshots/main.dart --debug "$@" > "$LOG" 2>&1 &
RUN_PID=$!

seen=0
while kill -0 "$RUN_PID" 2>/dev/null; do
  shots=$(grep -o '@@SHOT .*' "$LOG" | sed 's/@@SHOT //')
  count=$(printf '%s\n' "$shots" | grep -c . || true)
  if [ "$count" -gt "$seen" ]; then
    for name in $(printf '%s\n' "$shots" | tail -n $((count - seen))); do
      status_bar
      xcrun simctl io "$UDID" screenshot --type=png "$OUT/$name.png" >/dev/null 2>&1
      echo "captured $name"
    done
    seen=$count
  fi
  grep -q '@@DONE' "$LOG" && break
  grep -qE 'Error launching|Could not build|Lost connection' "$LOG" && { grep -E 'Error|rror:' "$LOG" | head -5; break; }
  sleep 0.5
done

grep -hoE '@@(FAIL|NOTAP|NOFIELD) .*' "$LOG" | sort -u
kill "$RUN_PID" 2>/dev/null
wait "$RUN_PID" 2>/dev/null
echo "done -> $OUT"
