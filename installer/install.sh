#!/usr/bin/env bash
set -Eeuo pipefail

VIETARR_VERSION="${VIETARR_VERSION:-main}"
VIETARR_REPO="${VIETARR_REPO:-thiengbp/vietarr}"
VIETARR_RELEASE_BASE="${VIETARR_RELEASE_BASE:-https://raw.githubusercontent.com/$VIETARR_REPO/$VIETARR_VERSION/installer}"
VIETARR_INSTALLER_DIR="${VIETARR_INSTALLER_DIR:-/opt/vietarr/installer}"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

download() {
  local url="$1"
  local target="$2"
  if command -v curl >/dev/null 2>&1; then
    curl --retry 5 --retry-delay 2 --retry-all-errors -fsSL "$url" -o "$target"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$target" "$url"
    return
  fi
  die "Missing command: curl or wget"
}

verify_checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c vietarr.sh.sha256
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c vietarr.sh.sha256
    return
  fi
  die "Missing command: sha256sum or shasum"
}

install_payload() {
  local target="/usr/local/bin/vietarr"
  if [ "$(id -u)" -eq 0 ]; then
    mkdir -p "$VIETARR_INSTALLER_DIR"
    cp -R "$PWD"/. "$VIETARR_INSTALLER_DIR"/
    chmod +x "$VIETARR_INSTALLER_DIR/vietarr.sh" "$VIETARR_INSTALLER_DIR/verify.sh"
    ln -sf "$VIETARR_INSTALLER_DIR/vietarr.sh" "$target"
    return
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$VIETARR_INSTALLER_DIR"
    sudo cp -R "$PWD"/. "$VIETARR_INSTALLER_DIR"/
    sudo chmod +x "$VIETARR_INSTALLER_DIR/vietarr.sh" "$VIETARR_INSTALLER_DIR/verify.sh"
    sudo ln -sf "$VIETARR_INSTALLER_DIR/vietarr.sh" "$target"
    return
  fi
  die "Cannot install VietArr CLI because sudo is not available."
}

main() {
  need_cmd mktemp
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  mkdir -p "$tmp_dir/lib" "$tmp_dir/templates"
  download "$VIETARR_RELEASE_BASE/vietarr.sh" "$tmp_dir/vietarr.sh"
  download "$VIETARR_RELEASE_BASE/vietarr.sh.sha256" "$tmp_dir/vietarr.sh.sha256"
  download "$VIETARR_RELEASE_BASE/verify.sh" "$tmp_dir/verify.sh"
  download "$VIETARR_RELEASE_BASE/lib/wiring.mjs" "$tmp_dir/lib/wiring.mjs"
  download "$VIETARR_RELEASE_BASE/templates/Caddyfile.tpl" "$tmp_dir/templates/Caddyfile.tpl"
  download "$VIETARR_RELEASE_BASE/templates/docker-compose.yml.tpl" "$tmp_dir/templates/docker-compose.yml.tpl"
  download "$VIETARR_RELEASE_BASE/templates/recyclarr.yml.tpl" "$tmp_dir/templates/recyclarr.yml.tpl"

  cd "$tmp_dir"
  verify_checksum
  chmod +x vietarr.sh verify.sh
  install_payload
  exec bash "$VIETARR_INSTALLER_DIR/vietarr.sh" "$@"
}

main "$@"
