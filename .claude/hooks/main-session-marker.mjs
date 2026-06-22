#!/usr/bin/env node
// main-session-marker.mjs — SessionStart hook: writes main session_id to a marker file.
//
// Subagents (Agent tool) run with their OWN session_id. SessionStart fires only for
// the main interactive session, never for subagents. We capture that session_id once
// at session start; git-gate.mjs reads it on every PreToolUse and allows write-ops
// only when input.session_id === marker (i.e. caller is the main session).
//
// Effect: main session gets full git access; spawned subagents stay gated by DENY_RULES.
//
// Contract (Claude Code SessionStart):
//   stdin  = JSON { session_id, transcript_path, cwd, source, hook_event_name }
//   stdout = {} (silent)
//   exit 0 always (fail-open).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

function silent() {
  process.stdout.write('{}');
  process.exit(0);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    silent();
    return;
  }

  const sessionId = input.session_id;
  const cwd = input.cwd || process.cwd();
  if (!sessionId) {
    silent();
    return;
  }

  const marker = join(cwd, '.claude', '.main-session-id');
  try {
    mkdirSync(dirname(marker), { recursive: true });
    writeFileSync(marker, String(sessionId), 'utf8');
  } catch {
    /* fail-open */
  }

  silent();
}

try {
  main();
} catch {
  silent();
}
