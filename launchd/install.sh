#!/bin/bash
# Install the weekly meal plan launchd job on macOS.
set -euo pipefail

PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.henry.dinners.weekly.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.henry.dinners.weekly.plist"

# Find docker binary path (Docker Desktop varies between Apple Silicon and Intel)
DOCKER_BIN="$(command -v docker || true)"
if [ -z "$DOCKER_BIN" ]; then
  echo "ERROR: docker not found in PATH. Open Docker Desktop and re-run." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

# Rewrite the plist with the real docker path discovered above, then install.
sed "s|/usr/local/bin/docker|$DOCKER_BIN|" "$PLIST_SRC" > "$PLIST_DST"

# Unload existing job if installed, then load fresh.
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo "Installed: $PLIST_DST"
echo "Docker path used: $DOCKER_BIN"
echo ""
echo "Job will run Mondays at 08:00 local time."
echo "Logs: /Users/henry/SW/dinners/logs/cron.{out,err}.log"
echo ""
echo "Manual trigger: launchctl kickstart -k gui/$(id -u)/com.henry.dinners.weekly"
echo "Uninstall:      launchctl unload $PLIST_DST && rm $PLIST_DST"
