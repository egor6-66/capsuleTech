#!/usr/bin/env bash
# claude-scope.sh — запустить Claude Code с OTEL-телеметрией под заданным скоупом.
#
#   ./claude-scope.sh web-ui "@capsuletech/web-ui"
#   ./claude-scope.sh web-core            # package опционален
#
# События/метрики инстанса полетят в локальный collector :4317 с меткой
# scope=<...>, фильтруемой в Grafana (http://localhost:3300).
# Запускать в ОТДЕЛЬНОМ терминале на каждый параллельный инстанс.
set -euo pipefail

scope="${1:?usage: claude-scope.sh <scope> [package] [--claude-args...]}"
package="${2:-}"
shift || true
[ -n "$package" ] && shift || true

attrs="scope=${scope}"
[ -n "$package" ] && attrs="${attrs},package=${package}"

export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_RESOURCE_ATTRIBUTES="${attrs}"
# Скоуп для governance-хуков (OTEL_* в subprocess/hooks не пробрасывается).
export CAPSULE_SCOPE="${scope}"
export OTEL_METRIC_EXPORT_INTERVAL=10000
export OTEL_LOGS_EXPORT_INTERVAL=5000
# Логировать текст промптов и детали тулзов (команды, tool_name) — всё локально.
export OTEL_LOG_USER_PROMPTS=1
export OTEL_LOG_TOOL_DETAILS=1

echo "[observability] ${attrs} -> otel-collector :4317"
exec claude "$@"
