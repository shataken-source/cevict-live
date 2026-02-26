#!/bin/bash
# Delegate to the repo-root vercel-ignore script
exec bash "$(git rev-parse --show-toplevel 2>/dev/null || echo '../..')/scripts/vercel-ignore.sh"
