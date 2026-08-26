#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <tag> <release-sha>" >&2
  exit 64
fi

release_tag="$1"
release_sha="$2"

git cat-file -e "${release_sha}^{commit}"
git \
  -c 'user.name=github-actions[bot]' \
  -c 'user.email=41898282+github-actions[bot]@users.noreply.github.com' \
  tag -a "$release_tag" -m "Release $release_tag" "$release_sha"
