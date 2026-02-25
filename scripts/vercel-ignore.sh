#!/bin/bash
# Smart Vercel ignore script — only build when the specific project's files changed.
# Exit 0 = SKIP build (no changes for this project)
# Exit 1 = BUILD (changes detected for this project)
#
# Vercel sets VERCEL_GIT_COMMIT_REF and the Root Directory per project.
# We use the Root Directory (available as the cwd) to determine which app this is.

echo ">>> Vercel ignore check"
echo ">>> CWD: $(pwd)"
echo ">>> Commit: ${VERCEL_GIT_COMMIT_SHA:-unknown}"

# Get the root directory relative to repo root
# Vercel sets the working directory to the project's Root Directory
# We need to figure out which app folder we're in
APP_DIR=$(basename "$(pwd)")
echo ">>> App dir: $APP_DIR"

# Map known project dirs to their source paths (relative to repo root)
# These are the paths we check for changes
case "$APP_DIR" in
  gulfcoastcharters)
    CHECK_PATHS="apps/gulfcoastcharters"
    ;;
  wheretovacation)
    CHECK_PATHS="apps/wheretovacation"
    ;;
  progno)
    CHECK_PATHS="apps/progno"
    ;;
  alpha-hunter)
    CHECK_PATHS="apps/alpha-hunter"
    ;;
  popthepopcorn)
    CHECK_PATHS="apps/popthepopcorn"
    ;;
  *)
    # Unknown project — check everything except IPTVviewer (old behavior)
    echo ">>> Unknown project, checking all files"
    git diff --quiet HEAD^ HEAD -- . ':!apps/IPTVviewer' 2>/dev/null
    exit $?
    ;;
esac

echo ">>> Checking paths: $CHECK_PATHS"

# Also check shared config files that affect all projects
SHARED_PATHS="package.json vercel.json tsconfig.json"

# Check if any relevant files changed between this commit and the previous
git diff --quiet HEAD^ HEAD -- $CHECK_PATHS $SHARED_PATHS 2>/dev/null
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo ">>> No changes in $CHECK_PATHS — SKIPPING build"
  exit 0
else
  echo ">>> Changes detected in $CHECK_PATHS — BUILDING"
  exit 1
fi
