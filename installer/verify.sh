#!/usr/bin/env bash
set -Eeuo pipefail

VIETARR_HOME="${VIETARR_HOME:-/opt/vietarr}"
COMPOSE="${VIETARR_COMPOSE:-docker compose}"
REPORT="$VIETARR_HOME/install-report.txt"

cd "$VIETARR_HOME"
if [ -f "$VIETARR_HOME/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$VIETARR_HOME/.env"
  set +a
fi

pass_count=0
fail_count=0
hardlink_failed=0

line() {
  printf '%s\n' "$1" | tee -a "$REPORT"
}

record() {
  local name="$1"
  local status="$2"
  local detail="${3:-}"
  if [ "$status" = "PASS" ]; then
    pass_count=$((pass_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
  line "$status $name${detail:+ - $detail}"
}

: > "$REPORT"
chmod 600 "$REPORT"
line "VietArr install verify report"
line "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
line ""

MEDIA_ROOT="${MEDIA_ROOT:-/data}"
tmp_a="$MEDIA_ROOT/torrents/.vietarr-hardlink-a"
tmp_b="$MEDIA_ROOT/media/.vietarr-hardlink-b"
rm -f "$tmp_a" "$tmp_b"
if mkdir -p "$MEDIA_ROOT/torrents" "$MEDIA_ROOT/media" && printf test > "$tmp_a" && ln "$tmp_a" "$tmp_b"; then
  inode_a="$(stat -c '%i' "$tmp_a" 2>/dev/null || stat -f '%i' "$tmp_a")"
  inode_b="$(stat -c '%i' "$tmp_b" 2>/dev/null || stat -f '%i' "$tmp_b")"
  if [ "$inode_a" = "$inode_b" ]; then
    record "hardlink" "PASS" "inode=$inode_a"
  else
    hardlink_failed=1
    record "hardlink" "FAIL" "Radarr sẽ copy nhân đôi dung lượng"
  fi
else
  hardlink_failed=1
  record "hardlink" "FAIL" "Radarr sẽ copy nhân đôi dung lượng"
fi
rm -f "$tmp_a" "$tmp_b"

services="caddy qbittorrent prowlarr radarr sonarr bazarr flaresolverr recyclarr"
for service in $services; do
  state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "vietarr-$service" 2>/dev/null || true)"
  case "$state" in
    healthy|running|Running*|Up*) record "container:$service" "PASS" "$state" ;;
    *) record "container:$service" "FAIL" "$state" ;;
  esac
done

if $COMPOSE exec -T prowlarr sh -lc 'PKEY=$(sed -n "s:.*<ApiKey>\(.*\)</ApiKey>.*:\1:p" /config/config.xml); curl -fsS -H "X-Api-Key: $PKEY" http://127.0.0.1:9696/api/v1/applications >/tmp/vietarr-prowlarr-apps.json && grep -q "\"implementation\".*Radarr" /tmp/vietarr-prowlarr-apps.json && grep -q "\"implementation\".*Sonarr" /tmp/vietarr-prowlarr-apps.json' >/dev/null 2>&1; then
  record "Prowlarr↔Radarr/Sonarr" "PASS"
else
  record "Prowlarr↔Radarr/Sonarr" "FAIL"
fi

if $COMPOSE exec -T radarr sh -lc 'RKEY=$(sed -n "s:.*<ApiKey>\(.*\)</ApiKey>.*:\1:p" /config/config.xml); curl -fsS -H "X-Api-Key: $RKEY" http://127.0.0.1:7878/api/v3/downloadclient >/tmp/vietarr-radarr-dl.json && grep -q qBittorrent /tmp/vietarr-radarr-dl.json' >/dev/null 2>&1; then
  record "Radarr↔qBittorrent" "PASS"
else
  record "Radarr↔qBittorrent" "FAIL"
fi

if $COMPOSE exec -T sonarr sh -lc 'SKEY=$(sed -n "s:.*<ApiKey>\(.*\)</ApiKey>.*:\1:p" /config/config.xml); curl -fsS -H "X-Api-Key: $SKEY" http://127.0.0.1:8989/api/v3/downloadclient >/tmp/vietarr-sonarr-dl.json && grep -q qBittorrent /tmp/vietarr-sonarr-dl.json' >/dev/null 2>&1; then
  record "Sonarr↔qBittorrent" "PASS"
else
  record "Sonarr↔qBittorrent" "FAIL"
fi

line ""
line "Summary: PASS=$pass_count FAIL=$fail_count"

if [ "$fail_count" -gt 0 ]; then
  if [ "$hardlink_failed" -eq 1 ]; then
    exit 2
  fi
  exit 1
fi
