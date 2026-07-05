#!/usr/bin/env bash
set -Eeuo pipefail

VIETARR_VERSION="${VIETARR_VERSION:-v1.0.0}"
VIETARR_REPO="${VIETARR_REPO:-vietarr/vietarr}"
VIETARR_RELEASE_BASE="${VIETARR_RELEASE_BASE:-https://raw.githubusercontent.com/$VIETARR_REPO/$VIETARR_VERSION/installer}"

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
    curl -fsSL "$url" -o "$target"
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

main() {
  need_cmd mktemp
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  download "$VIETARR_RELEASE_BASE/vietarr.sh" "$tmp_dir/vietarr.sh"
  download "$VIETARR_RELEASE_BASE/vietarr.sh.sha256" "$tmp_dir/vietarr.sh.sha256"

  cd "$tmp_dir"
  verify_checksum
  chmod +x vietarr.sh
  exec bash "$tmp_dir/vietarr.sh" "$@"
}

main "$@"
