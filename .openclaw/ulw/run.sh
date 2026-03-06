#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TODO_FILE="${ROOT}/.openclaw/TODO.md"
PROMPT_FILE="${ROOT}/.openclaw/ulw/prompt.md"
RUNS_FILE="${ROOT}/.openclaw/ulw/RUNS.md"
LOCK_FILE="${ROOT}/.openclaw/ulw.lock"

mkdir -p "${ROOT}/.openclaw/ulw"

if [[ ! -f "${TODO_FILE}" ]]; then
  echo "ULW: missing TODO file at ${TODO_FILE}; refusing to run." >&2
  exit 3
fi
if [[ ! -f "${PROMPT_FILE}" ]]; then
  echo "ULW: missing prompt file at ${PROMPT_FILE}; refusing to run." >&2
  exit 3
fi

# Single-run lock to prevent overlapping executions.
exec 9>>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "ULW: lock busy; skipping this run." >&2
  exit 0
fi

# Context confirmation gate.
if command -v rg >/dev/null 2>&1; then
  MATCH_PAUSED=(rg -n "^\s*paused:\s*true\s*$" "${TODO_FILE}")
  MATCH_DISABLED=(rg -n "^\s*enabled:\s*false\s*$" "${TODO_FILE}")
else
  MATCH_PAUSED=(grep -nE "^\s*paused:\s*true\s*$" "${TODO_FILE}")
  MATCH_DISABLED=(grep -nE "^\s*enabled:\s*false\s*$" "${TODO_FILE}")
fi

if "${MATCH_PAUSED[@]}" >/dev/null 2>&1; then
  echo "ULW: paused=true; skipping this run." >&2
  exit 0
fi
if "${MATCH_DISABLED[@]}" >/dev/null 2>&1; then
  echo "ULW: enabled=false; skipping this run." >&2
  exit 0
fi

if ! git -C "${ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ULW: project root is not a git repo: ${ROOT}" >&2
  exit 5
fi

# Parse repo policy from TODO (best-effort; defaults keep it safe).
BASE_BRANCH="main"
WORKING_BRANCH="ulw/desktop-assistant-auto"

if command -v rg >/dev/null 2>&1; then
  BASE_BRANCH_LINE="$(rg -n "^\s*base_branch:\s*\S+\s*$" "${TODO_FILE}" -m 1 || true)"
  WORKING_BRANCH_LINE="$(rg -n "^\s*working_branch:\s*\S+\s*$" "${TODO_FILE}" -m 1 || true)"
else
  BASE_BRANCH_LINE="$(grep -nE "^\s*base_branch:\s*\S+\s*$" "${TODO_FILE}" | head -n 1 || true)"
  WORKING_BRANCH_LINE="$(grep -nE "^\s*working_branch:\s*\S+\s*$" "${TODO_FILE}" | head -n 1 || true)"
fi

if [[ -n "${BASE_BRANCH_LINE}" ]]; then
  BASE_BRANCH="${BASE_BRANCH_LINE##*:}"
  BASE_BRANCH="${BASE_BRANCH#base_branch:}"
  BASE_BRANCH="${BASE_BRANCH//[[:space:]]/}"
fi
if [[ -n "${WORKING_BRANCH_LINE}" ]]; then
  WORKING_BRANCH="${WORKING_BRANCH_LINE##*:}"
  WORKING_BRANCH="${WORKING_BRANCH#working_branch:}"
  WORKING_BRANCH="${WORKING_BRANCH//[[:space:]]/}"
fi

# Ensure we're not working on base branch directly.
# We avoid destructive resets; just create/track the working branch if needed.
git -C "${ROOT}" fetch origin "${BASE_BRANCH}" >/dev/null 2>&1 || true

if git -C "${ROOT}" show-ref --verify --quiet "refs/heads/${WORKING_BRANCH}"; then
  git -C "${ROOT}" checkout "${WORKING_BRANCH}" >/dev/null
elif git -C "${ROOT}" show-ref --verify --quiet "refs/remotes/origin/${WORKING_BRANCH}"; then
  git -C "${ROOT}" checkout -b "${WORKING_BRANCH}" --track "origin/${WORKING_BRANCH}" >/dev/null
else
  git -C "${ROOT}" checkout -b "${WORKING_BRANCH}" "origin/${BASE_BRANCH}" >/dev/null
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ART_DIR="${ROOT}/.openclaw/ulw/artifacts/${TS}"
mkdir -p "${ART_DIR}"

"${ROOT}/.openclaw/ulw/collect.sh" "${ART_DIR}" || true

{
  echo
  echo "## ${TS}"
  echo
  echo "Branch: ${WORKING_BRANCH} (base: ${BASE_BRANCH})"
  echo "Artifacts: ${ART_DIR}"
} >>"${RUNS_FILE}"

HEAD_BEFORE="$(git -C "${ROOT}" rev-parse HEAD)"

# Drive implementation via OpenCode. The prompt file enforces: implement one TASK, run verify, update backlog, and auto-commit.
set +e
opencode run "$(cat "${PROMPT_FILE}")" \
  --dir "${ROOT}" \
  --title "ULW desktop-assistant ${TS}" \
  --model "RCode_OpenAI/gpt-5.2" \
  --file "${TODO_FILE}" \
  --file "${PROMPT_FILE}" \
  --file "${RUNS_FILE}" \
  --file "${ART_DIR}/meta.txt" \
  --file "${ART_DIR}/git.txt" \
  --file "${ART_DIR}/node.txt" \
  --file "${ART_DIR}/tree.txt" \
  2>&1 | tee "${ART_DIR}/opencode.log"
OC_RC=${PIPESTATUS[0]}
set -e

if [[ ${OC_RC} -ne 0 ]]; then
  echo "ULW: opencode failed rc=${OC_RC}" >&2
  exit ${OC_RC}
fi

HEAD_AFTER="$(git -C "${ROOT}" rev-parse HEAD)"

# If OpenCode made changes but failed to commit, we still try to commit to satisfy the "auto commit" requirement.
if [[ "${HEAD_AFTER}" == "${HEAD_BEFORE}" ]]; then
  if [[ -n "$(git -C "${ROOT}" status --porcelain)" ]]; then
    TASK_ID=""
    # Try to infer TASK id from modified backlog task specs.
    MOD_TASK_FILE="$(git -C "${ROOT}" diff --name-only | (command -v rg >/dev/null 2>&1 && rg '^backlog/tasks/.*\.md$' -m 1 || grep -E '^backlog/tasks/.*\.md$' | head -n 1) || true)"
    if [[ -n "${MOD_TASK_FILE}" ]]; then
      if command -v rg >/dev/null 2>&1; then
        TASK_ID_LINE="$(rg -n '^id:\s*' "${ROOT}/${MOD_TASK_FILE}" -m 1 2>/dev/null || true)"
      else
        TASK_ID_LINE="$(grep -nE '^id:\s*' "${ROOT}/${MOD_TASK_FILE}" | head -n 1 2>/dev/null || true)"
      fi
      TASK_ID="${TASK_ID_LINE#*:}"
      TASK_ID="${TASK_ID#id:}"
      TASK_ID="${TASK_ID//[[:space:]]/}"
    fi
    if [[ -n "${TASK_ID}" ]]; then
      npm -s run auto:commit -- "chore(ulw): ${TASK_ID} progress ${TS}"
    else
      npm -s run auto:commit -- "chore(ulw): automated backlog progress ${TS}"
    fi
    HEAD_AFTER="$(git -C "${ROOT}" rev-parse HEAD)"
  fi
fi

# Push any new commits. Keep the run green even if push/PR creation fails.
if [[ "${HEAD_AFTER}" != "${HEAD_BEFORE}" ]]; then
  if git -C "${ROOT}" rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    git -C "${ROOT}" push || echo "ULW: git push failed; commit left locally." >&2
  else
    git -C "${ROOT}" push -u origin "${WORKING_BRANCH}" || echo "ULW: git push (set upstream) failed; commit left locally." >&2
  fi

  if command -v gh >/dev/null 2>&1; then
    # gh pr view doesn't support --head on some versions; use pr list for head-branch detection.
    PR_URL="$(gh pr list --head "${WORKING_BRANCH}" --base "${BASE_BRANCH}" --state open --json url --limit 1 --jq '.[0].url' 2>/dev/null || true)"
    if [[ -n "${PR_URL}" ]]; then
      echo "ULW: PR exists: ${PR_URL}"
    else
      PR_URL="$(gh pr create --draft --base "${BASE_BRANCH}" --head "${WORKING_BRANCH}" \
        --title "ULW: backlog progress (${TS})" \
        --body "Automated scheduled run.\n\nArtifacts: ${ART_DIR}\n" \
        2>/dev/null || true)"
      if [[ -n "${PR_URL}" ]]; then
        echo "ULW: PR created: ${PR_URL}"
      else
        echo "ULW: gh pr create failed; please create PR manually." >&2
      fi
    fi
  fi
fi

echo "ULW: completed successfully."