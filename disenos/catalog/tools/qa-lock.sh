#!/usr/bin/env bash
# qa-lock.sh — serialise catalog QA probes across parallel sessions.
#
# WHY: the QA "flakiness" is CONTENTION, not random crashes. Measured 2026-08-08: ~70 headless chrome
# processes on 16 cores (load 54.9) with 7 sessions each firing their own probe. Chrome's startup then
# exceeds the probe's WebSocket wait and node dies on an unsettled top-level await (the exit-13
# signature). Retrying under that load makes it worse: every retry queues one more chrome.
# This wrapper takes an exclusive flock so runs QUEUE instead of competing.
#
# OPT-IN. It does not modify verify-catalog-asset.mjs, probe-state.mjs, hole-probe.mjs or
# audit-asset.mjs. Wrap the invocation instead:
#
#   disenos/catalog/tools/qa-lock.sh node disenos/catalog/tools/verify-catalog-asset.mjs hvac/caldera
#   SHOT_DIR=/tmp/shots disenos/catalog/tools/qa-lock.sh node disenos/catalog/tools/probe-state.mjs \
#       puertas/torniquete btnOpen
#
# CONTRACT (matches the probes' own semantics — a wrapper that broke these would be worse than none):
#   · stdout is passed through UNTOUCHED. The probes print JSON there and callers pipe it, so every
#     message this script emits goes to stderr.
#   · the wrapped command's exit code is returned VERBATIM (0 = pass, 1 = real asset failure).
#   · if the lock cannot be acquired in time, exit 2 = INCONCLUSIVE — never 1. Nothing was measured,
#     so it must not read as a broken asset. Same rule the probes' preflight already follows.
#
# Env:
#   QA_LOCK_FILE     shared lock path            (default /tmp/catalog-qa.lock)
#   QA_LOCK_TIMEOUT  seconds to wait for the lock (default 900; 0 = wait forever)
#   QA_LOCK_QUIET    set to 1 to silence the waiting notice on stderr
#
# Wrap ONE probe invocation, not a whole sweep: holding the lock for a 90-asset run starves every peer.

set -uo pipefail

LOCK_FILE="${QA_LOCK_FILE:-/tmp/catalog-qa.lock}"
LOCK_TIMEOUT="${QA_LOCK_TIMEOUT:-900}"

if [ "$#" -eq 0 ]; then
  echo "usage: qa-lock.sh <command> [args...]" >&2
  echo "       wraps one catalog QA probe invocation in an exclusive flock" >&2
  exit 2
fi

if ! command -v flock >/dev/null 2>&1; then
  # No flock: run unserialised rather than block the caller, but say so. Losing serialisation is a
  # performance problem; refusing to run would be a correctness problem for the caller's gate.
  echo "qa-lock: flock no disponible — se ejecuta SIN serializar" >&2
  "$@"
  exit $?
fi

# Create the lock file world-writable-ish so any session on this machine can share it.
if [ ! -e "$LOCK_FILE" ]; then
  ( umask 000; : > "$LOCK_FILE" ) 2>/dev/null || true
fi

exec {LOCK_FD}>"$LOCK_FILE" || { echo "qa-lock: no se pudo abrir $LOCK_FILE — sin serializar" >&2; "$@"; exit $?; }

if [ "$LOCK_TIMEOUT" = "0" ]; then
  FLOCK_ARGS=(-x "$LOCK_FD")
else
  FLOCK_ARGS=(-x -w "$LOCK_TIMEOUT" "$LOCK_FD")
fi

# Non-blocking first try, so the common uncontended case prints nothing at all.
if ! flock -n -x "$LOCK_FD" 2>/dev/null; then
  [ "${QA_LOCK_QUIET:-0}" = "1" ] || \
    echo "qa-lock: esperando el turno de QA (otra sesión tiene $LOCK_FILE)…" >&2
  if ! flock "${FLOCK_ARGS[@]}"; then
    echo "qa-lock: no se obtuvo el lock en ${LOCK_TIMEOUT}s." >&2
    echo "NO es un veredicto sobre el asset — no se midió nada." >&2
    exit 2
  fi
fi

"$@"
status=$?
# flock releases on fd close / process exit; nothing to unlock explicitly.
exit $status
