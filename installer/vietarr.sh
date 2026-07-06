#!/usr/bin/env bash
set -Eeuo pipefail

VIETARR_HOME="${VIETARR_HOME:-/opt/vietarr}"
COMPOSE="${VIETARR_COMPOSE:-docker compose}"
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    exec sudo -E bash "$0" "$@"
  fi
  echo "ERROR: VietArr installer must run as root, and sudo is not available." >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage:
  vietarr install [--media-path <path>] [--non-interactive --config <file>]

Exit codes:
  0 verify pass toàn bộ
  2 cài xong nhưng có mục verify fail
  1 lỗi cài
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20
  fi
}

read_env_file() {
  local file="$1"
  [ -f "$file" ] || die "Config file not found: $file"
  set -a
  # shellcheck disable=SC1090
  . "$file"
  set +a
}

prompt_default() {
  local var="$1"
  local text="$2"
  local default="$3"
  local value
  read -r -p "$text [$default]: " value
  printf -v "$var" '%s' "${value:-$default}"
}

validate_media_path() {
  [ -d "$MEDIA_ROOT" ] || die "Media path does not exist: $MEDIA_ROOT"
  if [ ! -d "$MEDIA_ROOT/media" ] || [ ! -d "$MEDIA_ROOT/torrents" ]; then
    mkdir -p "$MEDIA_ROOT/media/movies" "$MEDIA_ROOT/media/tv" "$MEDIA_ROOT/torrents/movies" "$MEDIA_ROOT/torrents/tv" 2>/dev/null \
      || die "Cannot create TRaSH folders under $MEDIA_ROOT. Fix NFS/permission before install."
  fi

  local test_file="$MEDIA_ROOT/.vietarr-write-test"
  if [ "$(id -u)" = "1000" ]; then
    touch "$test_file" && rm -f "$test_file" || die "UID 1000 cannot write to $MEDIA_ROOT. Fix NFS/permission before install."
    return
  fi
  if command -v setpriv >/dev/null 2>&1 && setpriv --reuid 1000 --regid 1000 --clear-groups sh -c 'touch "$1" && rm -f "$1"' sh "$test_file" >/dev/null 2>&1; then
    return
  fi
  if command -v sudo >/dev/null 2>&1 && sudo -n -u '#1000' sh -c 'touch "$1" && rm -f "$1"' sh "$test_file" >/dev/null 2>&1; then
    return
  fi
  die "UID 1000 cannot write to $MEDIA_ROOT. Fix NFS/permission before install."
}

validate_domain_suffix() {
  case "$DOMAIN_SUFFIX" in
    *[[:space:]]*) die "DOMAIN_SUFFIX must not contain whitespace: $DOMAIN_SUFFIX" ;;
  esac
  case "$DOMAIN_SUFFIX" in
    *.arpa|*.lan) ;;
    *) echo "WARN: DOMAIN_SUFFIX should normally end with .arpa or .lan: $DOMAIN_SUFFIX" >&2 ;;
  esac
}

render_template() {
  local source="$1"
  local target="$2"
  sed \
    -e "s|{{MEDIA_ROOT}}|$MEDIA_ROOT|g" \
    -e "s|{{TZ}}|$TZ|g" \
    -e "s|{{DOMAIN_SUFFIX}}|$DOMAIN_SUFFIX|g" \
    "$source" > "$target"
}

write_env_once() {
  if [ -f "$VIETARR_HOME/.env" ]; then
    echo "Repair mode: existing $VIETARR_HOME/.env found; keeping it unchanged."
    return
  fi
  umask 077
  cat > "$VIETARR_HOME/.env" <<EOF
RADARR_API_KEY=
SONARR_API_KEY=
PROWLARR_API_KEY=
BAZARR_API_KEY=
QBIT_USER=$QBIT_USER
QBIT_PASS=$QBIT_PASS
TMDB_API_KEY=$TMDB_API_KEY
JWT_SECRET=$(random_secret)
WEBHOOK_SECRET=$(random_secret)
MEDIA_ROOT=$MEDIA_ROOT
DOMAIN_SUFFIX=$DOMAIN_SUFFIX
TZ=$TZ
EOF
  chmod 600 "$VIETARR_HOME/.env"
}

load_installed_env() {
  if [ -f "$VIETARR_HOME/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$VIETARR_HOME/.env"
    set +a
  fi
}

wait_compose_healthy() {
  local deadline=$((SECONDS + 180))
  local services="caddy core web qbittorrent prowlarr radarr sonarr bazarr flaresolverr recyclarr"
  while [ "$SECONDS" -lt "$deadline" ]; do
    local ok=1
    for service in $services; do
      local state
      state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "vietarr-$service" 2>/dev/null || true)"
      [ "$state" = "healthy" ] || ok=0
    done
    [ "$ok" -eq 1 ] && return 0
    sleep 3
  done
  return 1
}

rollback_with_logs() {
  echo "Container readiness failed; rolling back." >&2
  $COMPOSE ps >&2 || true
  $COMPOSE logs --tail=120 >&2 || true
  $COMPOSE down >&2 || true
}

install_command() {
  local non_interactive=0
  local config_file=""
  MEDIA_ROOT="${MEDIA_ROOT:-}"
  TZ="${TZ:-Asia/Ho_Chi_Minh}"
  DOMAIN_SUFFIX="${DOMAIN_SUFFIX:-home.arpa}"
  TMDB_API_KEY="${TMDB_API_KEY:-}"
  QBIT_USER="${QBIT_USER:-admin}"
  QBIT_PASS="${QBIT_PASS:-}"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --media-path) MEDIA_ROOT="$2"; shift 2 ;;
      --non-interactive) non_interactive=1; shift ;;
      --config) config_file="$2"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      *) die "Unknown argument: $1" ;;
    esac
  done

  [ -z "$config_file" ] || read_env_file "$config_file"

  need_cmd docker

  if [ "$non_interactive" -eq 0 ]; then
    prompt_default MEDIA_ROOT "Media root path" "${MEDIA_ROOT:-/mnt/media/data}"
    prompt_default TZ "Timezone" "$TZ"
    prompt_default DOMAIN_SUFFIX "Internal domain suffix" "$DOMAIN_SUFFIX"
    prompt_default TMDB_API_KEY "TMDB API key (saved for later blocks)" "$TMDB_API_KEY"
    prompt_default QBIT_USER "qBittorrent username" "$QBIT_USER"
    if [ -z "$QBIT_PASS" ]; then
      read -r -s -p "qBittorrent password (blank = random): " QBIT_PASS
      printf '\n'
    fi
  fi

  [ -n "$MEDIA_ROOT" ] || die "MEDIA_ROOT is required"
  [ -n "$TZ" ] || die "TZ is required"
  [ -n "$DOMAIN_SUFFIX" ] || die "DOMAIN_SUFFIX is required"
  [ -n "$QBIT_USER" ] || die "QBIT_USER is required"
  [ -n "$QBIT_PASS" ] || QBIT_PASS="$(random_secret)"

  validate_domain_suffix
  validate_media_path

  mkdir -p "$VIETARR_HOME/appdata"/{core,qbittorrent,prowlarr,radarr,sonarr,bazarr,recyclarr}
  chown -R 1000:1000 "$VIETARR_HOME" 2>/dev/null || true
  chown -R 1000:1000 "$VIETARR_HOME/appdata/recyclarr" 2>/dev/null || true
  write_env_once
  load_installed_env

  render_template "$SCRIPT_DIR/templates/docker-compose.yml.tpl" "$VIETARR_HOME/docker-compose.yml"
  render_template "$SCRIPT_DIR/templates/Caddyfile.tpl" "$VIETARR_HOME/Caddyfile"
  render_template "$SCRIPT_DIR/templates/recyclarr.yml.tpl" "$VIETARR_HOME/appdata/recyclarr/recyclarr.yml"
  chown -R 1000:1000 "$VIETARR_HOME" 2>/dev/null || true
  chown -R 1000:1000 "$VIETARR_HOME/appdata/recyclarr" 2>/dev/null || true

  cd "$VIETARR_HOME"
  $COMPOSE up -d
  if ! wait_compose_healthy; then
    rollback_with_logs
    exit 1
  fi

  local qbit_bootstrap_env="$VIETARR_HOME/.qbit-bootstrap.env"
  QBIT_BOOTSTRAP_PASS="$(docker logs vietarr-qbittorrent 2>&1 | sed -n 's/.*temporary password is provided for this session: //p' | tail -1)"
  umask 077
  printf 'QBIT_BOOTSTRAP_PASS=%s\n' "$QBIT_BOOTSTRAP_PASS" > "$qbit_bootstrap_env"
  chmod 600 "$qbit_bootstrap_env"
  docker run --rm \
    --network vietarr \
    --env-file "$VIETARR_HOME/.env" \
    --env-file "$qbit_bootstrap_env" \
    -e VIETARR_HOME="$VIETARR_HOME" \
    -v "$VIETARR_HOME:$VIETARR_HOME" \
    -v "$SCRIPT_DIR/lib/wiring.mjs:/tmp/wiring.mjs:ro" \
    node:22-alpine node /tmp/wiring.mjs
  rm -f "$qbit_bootstrap_env"
  $COMPOSE restart core web
  $COMPOSE restart bazarr
  if ! wait_compose_healthy; then
    rollback_with_logs
    exit 1
  fi

  load_installed_env
  render_template "$SCRIPT_DIR/templates/recyclarr.yml.tpl" "$VIETARR_HOME/appdata/recyclarr/recyclarr.yml"
  chown -R 1000:1000 "$VIETARR_HOME/appdata/recyclarr" 2>/dev/null || true
  $COMPOSE run --rm --entrypoint recyclarr recyclarr sync

  VIETARR_HOME="$VIETARR_HOME" VIETARR_COMPOSE="$COMPOSE" "$SCRIPT_DIR/verify.sh"
}

case "${1:-}" in
  install) shift; install_command "$@" ;;
  -h|--help|"") usage ;;
  *) die "Unknown command: $1" ;;
esac
