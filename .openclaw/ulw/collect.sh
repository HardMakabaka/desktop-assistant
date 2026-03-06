#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ART_DIR="${1:-}"

if [[ -z "${ART_DIR}" ]]; then
  echo "usage: collect.sh <artifacts-dir>" >&2
  exit 2
fi

mkdir -p "${ART_DIR}"

{
  echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "project_root=${ROOT}"
  echo "uname=$(uname -a)"
} >"${ART_DIR}/meta.txt"

{
  echo "# git status -sb"
  git -C "${ROOT}" status -sb
  echo
  echo "# recent commits"
  git -C "${ROOT}" log -n 20 --oneline --decorate
} >"${ART_DIR}/git.txt" || true

{
  echo "# versions"
  node -v || true
  npm -v || true
  echo
  echo "# package version"
  node -p "require('${ROOT}/package.json').version" || true
} >"${ART_DIR}/node.txt" || true

# lightweight tree snapshot
{
  echo "# src"
  find "${ROOT}/src" -maxdepth 4 -type f 2>/dev/null | sed "s|^${ROOT}/||" | sort
  echo
  echo "# backlog/tasks"
  find "${ROOT}/backlog/tasks" -maxdepth 2 -type f 2>/dev/null | sed "s|^${ROOT}/||" | sort
} >"${ART_DIR}/tree.txt" || true
