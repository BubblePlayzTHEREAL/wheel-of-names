#!/usr/bin/env bash
# Build the static site and publish it to the gh-pages branch
# (served by GitHub Pages at bubbleplayzthereal.github.io/wheel-of-names/).
#
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/deploy-pages.sh
set -euo pipefail

REPO="BubblePlayzTHEREAL/wheel-of-names"
: "${GITHUB_TOKEN:?Set GITHUB_TOKEN to a PAT with repo scope}"

npm ci --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npm run build
touch out/.nojekyll

WORK=$(mktemp -d)
cp -r out/. "$WORK/"
cd "$WORK"
git init -q -b gh-pages
git config user.name "BubblePlayzTHEREAL"
git config user.email "bubblelind@gmail.com"
git add -A
git commit -qm "Publish static build $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -qf "https://$GITHUB_TOKEN@github.com/$REPO.git" gh-pages:gh-pages
echo "Published to https://bubbleplayzthereal.github.io/wheel-of-names/"
