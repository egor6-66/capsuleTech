# claude-scope.ps1 — запустить Claude Code с OTEL-телеметрией под заданным скоупом.
#
#   .\claude-scope.ps1 -Scope main                # architect
#   .\claude-scope.ps1 -Scope remote              # owner-remote → packages/web/runtime/remote
#   .\claude-scope.ps1 -Scope ui                  # owner-ui → packages/web/kit/ui (web/* prefer)
#   .\claude-scope.ps1 -Scope canvas-ui           # owner-canvas-ui → packages/canvas/ui (qualified)
#
# Канон (2026-06-22): scope = leaf-имя пакета без "web-" префикса (либо 'main' = architect).
# Скрипт валидирует scope ДО запуска claude (fail-fast). Невалидный scope → exit 1
# со списком доступных. Identity-banner инжектится SessionStart-хуком `scope-identity.mjs`.
#
# Все события/метрики инстанса полетят в локальный collector :4317 с меткой
# scope=<...>, по которой их видно/фильтруемо в Grafana (http://localhost:3300).
# Запускать в ОТДЕЛЬНОМ терминале на каждый параллельный инстанс.
param(
  [Parameter(Mandatory = $true)][string]$Scope,
  [Parameter(ValueFromRemainingArguments = $true)]$ClaudeArgs
)

# Fail-fast валидация scope. Резолв через node-скрипт; stdout = JSON, exit 0 = OK.
$resolveScript = Join-Path $PSScriptRoot ".claude/hooks/scope-resolve.mjs"
if (-not (Test-Path $resolveScript)) {
  Write-Host "[claude-scope] ERROR: $resolveScript not found" -ForegroundColor Red
  exit 2
}

$resolved = node $resolveScript $Scope 2>&1
$resolveExit = $LASTEXITCODE
if ($resolveExit -ne 0) {
  Write-Host "[claude-scope] $resolved" -ForegroundColor Red
  exit 1
}

# Распарсить JSON для отображения (не критично — главное что exit 0).
try {
  $info = $resolved | ConvertFrom-Json
  if ($info.kind -eq 'main') {
    $banner = "scope=main (architect)"
  }
  else {
    $banner = "scope=$($info.scope) → $($info.relativePath) ($($info.packageName))"
  }
}
catch {
  $banner = "scope=$Scope"
}

# OTEL-телеметрия.
$attrs = "scope=$Scope"
if ($info -and $info.packageName) { $attrs += ",package=$($info.packageName)" }

$env:CLAUDE_CODE_ENABLE_TELEMETRY = "1"
$env:OTEL_METRICS_EXPORTER        = "otlp"
$env:OTEL_LOGS_EXPORTER           = "otlp"
$env:OTEL_EXPORTER_OTLP_PROTOCOL  = "grpc"
$env:OTEL_EXPORTER_OTLP_ENDPOINT  = "http://localhost:4317"
$env:OTEL_RESOURCE_ATTRIBUTES     = $attrs
# Скоуп для governance/identity-хуков (OTEL_* в subprocess/hooks не пробрасывается).
$env:CAPSULE_SCOPE                = $Scope
$env:OTEL_METRIC_EXPORT_INTERVAL  = "10000"
$env:OTEL_LOGS_EXPORT_INTERVAL    = "5000"
# Логировать текст промптов и детали тулзов (команды, tool_name) — всё локально.
$env:OTEL_LOG_USER_PROMPTS        = "1"
$env:OTEL_LOG_TOOL_DETAILS        = "1"

# Модель (2026-07-04, решение user): owner-сессии — Opus; main (architect) —
# модель сессии не трогаем (Fable запинен в глобальном ~/.claude/settings.json).
# Перебиваем глобальный пин ДВАЖДЫ (флаг + env) — alias 'opus' = актуальный Opus.
# Явный --model в аргументах запуска уважается и НЕ перекрывается.
if (-not $ClaudeArgs) { $ClaudeArgs = @() }
if ($Scope -ne 'main' -and -not (@($ClaudeArgs) -match '^--model')) {
  $env:ANTHROPIC_MODEL = 'opus'
  $ClaudeArgs = @('--model', 'opus') + @($ClaudeArgs)
  Write-Host "[claude-scope] owner-model: opus (перебивает глобальный пин Fable; main остаётся на своей)" -ForegroundColor DarkCyan
}

Write-Host "[observability] $banner -> otel-collector :4317" -ForegroundColor Cyan
claude @ClaudeArgs
