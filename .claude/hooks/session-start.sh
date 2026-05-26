#!/bin/bash
# Ensures the Superpowers plugin marketplace is fetched on fresh Claude Code
# on the web containers. The project-scope settings.json declares the
# marketplace + enabled plugin, but the marketplace clone lives in the
# ephemeral user home (~/.claude/plugins/marketplaces) and needs to be
# (re)cloned each session.
set -euo pipefail

# Only run in the remote/web sandbox. Local users manage their own plugins.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

MARKETPLACE="superpowers-dev"
MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/$MARKETPLACE"

if [ -d "$MARKETPLACE_DIR/.git" ]; then
  exit 0
fi

claude plugin marketplace update "$MARKETPLACE" >/dev/null 2>&1 || \
  claude plugin marketplace add obra/superpowers --scope project >/dev/null 2>&1 || true
