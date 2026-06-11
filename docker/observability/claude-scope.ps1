# claude-scope.ps1 — запустить Claude Code с OTEL-телеметрией под заданным скоупом.
#
#   .\claude-scope.ps1 -Scope web-ui -Package "@capsuletech/web-ui"
#   .\claude-scope.ps1 -Scope web-core            # package опционален
#
# Все события/метрики инстанса полетят в локальный collector :4317 с меткой
# scope=<...>, по которой их видно/фильтруемо в Grafana (http://localhost:3300).
# Запускать в ОТДЕЛЬНОМ терминале на каждый параллельный инстанс.
param(
  [Parameter(Mandatory = $true)][string]$Scope,
  [string]$Package = "",
  [Parameter(ValueFromRemainingArguments = $true)]$ClaudeArgs
)

$attrs = "scope=$Scope"
if ($Package) { $attrs += ",package=$Package" }

$env:CLAUDE_CODE_ENABLE_TELEMETRY = "1"
$env:OTEL_METRICS_EXPORTER        = "otlp"
$env:OTEL_LOGS_EXPORTER           = "otlp"
$env:OTEL_EXPORTER_OTLP_PROTOCOL  = "grpc"
$env:OTEL_EXPORTER_OTLP_ENDPOINT  = "http://localhost:4317"
$env:OTEL_RESOURCE_ATTRIBUTES     = $attrs
# Скоуп для governance-хуков (OTEL_* в subprocess/hooks не пробрасывается).
$env:CAPSULE_SCOPE                = $Scope
$env:OTEL_METRIC_EXPORT_INTERVAL  = "10000"
$env:OTEL_LOGS_EXPORT_INTERVAL    = "5000"
# Логировать текст промптов и детали тулзов (команды, tool_name) — всё локально.
$env:OTEL_LOG_USER_PROMPTS        = "1"
$env:OTEL_LOG_TOOL_DETAILS        = "1"

Write-Host "[observability] scope=$Scope$(if ($Package) { " package=$Package" }) -> otel-collector :4317" -ForegroundColor Cyan
claude @ClaudeArgs
