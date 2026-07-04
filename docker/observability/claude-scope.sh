#!/usr/bin/env bash
# claude-scope.sh — запустить Claude Code с OTEL-телеметрией под заданным скоупом.
#
#   ./claude-scope.sh main                 # architect
#   ./claude-scope.sh remote               # owner-remote → packages/web/runtime/remote
#   ./claude-scope.sh ui                   # owner-ui → packages/web/kit/ui (web/* prefer)
#   ./claude-scope.sh canvas-ui            # owner-canvas-ui → packages/canvas/ui (qualified)
#
# Канон (2026-06-22): scope = leaf-имя пакета без "web-" префикса (либо 'main' = architect).
# Скрипт валидирует scope ДО запуска claude (fail-fast). Невалидный → exit 1 со списком.
# Identity-banner инжектится SessionStart-хуком scope-identity.mjs.
set -euo pipefail

scope="${1:?usage: claude-scope.sh <scope> [--claude-args...]}"
shift || true

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
resolve_script="${dir}/.claude/hooks/scope-resolve.mjs"

if [ ! -f "$resolve_script" ]; then
  echo "[claude-scope] ERROR: $resolve_script not found" >&2
  exit 2
fi

# Fail-fast валидация.
if ! resolved="$(node "$resolve_script" "$scope" 2>&1)"; then
  echo "[claude-scope] $resolved" >&2
  exit 1
fi

# Распарсить JSON для баннера (best-effort).
banner="scope=${scope}"
pkg_name=""
if command -v node >/dev/null 2>&1; then
  pkg_name="$(node -e "const r=JSON.parse(process.argv[1]); process.stdout.write(r.packageName||'')" "$resolved" 2>/dev/null || true)"
  rel_path="$(node -e "const r=JSON.parse(process.argv[1]); process.stdout.write(r.relativePath||'')" "$resolved" 2>/dev/null || true)"
  kind="$(node -e "const r=JSON.parse(process.argv[1]); process.stdout.write(r.kind||'')" "$resolved" 2>/dev/null || true)"
  if [ "$kind" = "main" ]; then
    banner="scope=main (architect)"
  elif [ -n "$pkg_name" ]; then
    banner="scope=${scope} → ${rel_path} (${pkg_name})"
  fi
fi

attrs="scope=${scope}"
[ -n "$pkg_name" ] && attrs="${attrs},package=${pkg_name}"

export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_RESOURCE_ATTRIBUTES="${attrs}"
# Скоуп для governance/identity-хуков (OTEL_* в subprocess/hooks не пробрасывается).
export CAPSULE_SCOPE="${scope}"
export OTEL_METRIC_EXPORT_INTERVAL=10000
export OTEL_LOGS_EXPORT_INTERVAL=5000
# Логировать текст промптов и детали тулзов (команды, tool_name) — всё локально.
export OTEL_LOG_USER_PROMPTS=1
export OTEL_LOG_TOOL_DETAILS=1

# Модель (2026-07-04, решение user): owner-сессии — Opus; main (architect) —
# модель не трогаем (Fable запинен в глобальном ~/.claude/settings.json).
# Перебиваем глобальный пин дважды (флаг + env); явный --model в аргументах уважается.
model_args=()
if [ "$scope" != "main" ]; then
  has_model=0
  for a in "$@"; do [ "$a" = "--model" ] && has_model=1; done
  if [ "$has_model" -eq 0 ]; then
    export ANTHROPIC_MODEL=opus
    model_args=(--model opus)
    echo "[claude-scope] owner-model: opus (перебивает глобальный пин Fable; main остаётся на своей)"
  fi
fi

echo "[observability] ${banner} -> otel-collector :4317"
exec claude "${model_args[@]}" "$@"
