#!/bin/bash
# Smart Vercel ignore script — only build when the specific project's files changed.
# Exit 0 = SKIP build (no changes for this project)
# Exit 1 = BUILD (changes detected for this project)

echo ">>> Vercel ignore check"
echo ">>> CWD: $(pwd)"
echo ">>> Commit: ${VERCEL_GIT_COMMIT_SHA:-unknown}"
echo ">>> Previous: ${VERCEL_GIT_PREVIOUS_SHA:-unknown}"

# Determine which project this is.
# 1) Try the Vercel-set project name env var
# 2) Fall back to basename of CWD (works when Root Directory is set)
if [ -n "$VERCEL_PROJECT_NAME" ]; then
  APP_DIR="$VERCEL_PROJECT_NAME"
else
  APP_DIR=$(basename "$(pwd)")
fi
echo ">>> App dir: $APP_DIR"

# Map known project names to their source paths (relative to repo root)
case "$APP_DIR" in
  gulfcoastcharters)       CHECK_PATHS="apps/gulfcoastcharters" ;;
  progno)                  CHECK_PATHS="apps/progno" ;;
  alpha-hunter)            CHECK_PATHS="apps/alpha-hunter" ;;
  popthepopcorn)           CHECK_PATHS="apps/popthepopcorn" ;;
  wheretovacation)         CHECK_PATHS="apps/wheretovacation" ;;
  smokersrights)           CHECK_PATHS="apps/smokersrights" ;;
  trailervegas)            CHECK_PATHS="apps/trailervegas" ;;
  launchpad)               CHECK_PATHS="apps/launchpad" ;;
  *)
    echo ">>> Unknown project '$APP_DIR' — BUILDING (safe default)"
    exit 1
    ;;
esac

echo ">>> Checking paths: $CHECK_PATHS"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
echo ">>> Repo root: $REPO_ROOT"

# Use VERCEL_GIT_PREVIOUS_SHA if available (reliable on shallow clones)
# Fall back to HEAD^ which may fail on first deploy or shallow clone
if [ -n "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  BASE_SHA="$VERCEL_GIT_PREVIOUS_SHA"
else
  BASE_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD^ 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo ">>> No previous commit found — BUILDING (first deploy)"
    exit 1
  fi
fi

echo ">>> Comparing $BASE_SHA..HEAD"

git -C "$REPO_ROOT" diff --quiet "$BASE_SHA" HEAD -- $CHECK_PATHS 2>/dev/null
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo ">>> No changes in $CHECK_PATHS — SKIPPING build"
  exit 0
else
  echo ">>> Changes detected in $CHECK_PATHS — BUILDING"
  exit 1
fi
