#!/usr/bin/env sh
set -eu

source_dir="${1:-}"
target_dir="${2:-}"

[ -n "$source_dir" ] || {
  echo "Missing custom definition source directory" >&2
  exit 1
}
[ -n "$target_dir" ] || {
  echo "Missing custom definition target directory" >&2
  exit 1
}
[ -d "$source_dir" ] || exit 0

mkdir -p "$target_dir"
for source in "$source_dir"/*.yml "$source_dir"/*.yaml; do
  [ -f "$source" ] || continue
  if [ "$(sed -n '1p' "$source")" != "# Managed by VietArr" ]; then
    echo "WARN: Skipping unmanaged custom definition: $source" >&2
    continue
  fi
  target="$target_dir/$(basename "$source")"
  if [ -f "$target" ] && [ "$(sed -n '1p' "$target")" != "# Managed by VietArr" ]; then
    echo "WARN: Keeping user-managed Prowlarr definition unchanged: $target" >&2
    continue
  fi
  if [ -f "$target" ] && cmp -s "$source" "$target"; then
    continue
  fi
  install -m 0644 "$source" "$target"
  echo "Installed Prowlarr custom definition: $(basename "$target")"
done
