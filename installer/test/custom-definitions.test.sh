#!/usr/bin/env sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

source_dir="$tmp_dir/source"
target_dir="$tmp_dir/target"
mkdir -p "$source_dir" "$target_dir"

printf '%s\n' '# Managed by VietArr' 'id: vietarr-test' > "$source_dir/vietarr-test.yml"
sh "$root_dir/lib/install-definitions.sh" "$source_dir" "$target_dir"
cmp -s "$source_dir/vietarr-test.yml" "$target_dir/vietarr-test.yml"

chmod 0600 "$target_dir/vietarr-test.yml"
sh "$root_dir/lib/install-definitions.sh" "$source_dir" "$target_dir"
mode="$(stat -f %Lp "$target_dir/vietarr-test.yml" 2>/dev/null || stat -c %a "$target_dir/vietarr-test.yml")"
[ "$mode" = "600" ]

printf '%s\n' '# User managed' 'id: keep-me' > "$target_dir/user.yml"
printf '%s\n' '# Managed by VietArr' 'id: replace-me' > "$source_dir/user.yml"
sh "$root_dir/lib/install-definitions.sh" "$source_dir" "$target_dir"
grep -q '^id: keep-me$' "$target_dir/user.yml"

echo "CUSTOM DEFINITIONS PASS"
