# capsule observability — мониторинг параллельных Claude Code инстансов

Self-hosted стек (всё локально, без облаков — под air-gapped): несколько Claude
Code инстансов, каждый в своём скоупе, шлют OTEL-телеметрию в один collector.
Collector веером раскладывает её в Prometheus (метрики) и Loki (события/логи),
сверху Grafana с фильтром по `scope`. Это срез **A** плана «рабочая база».

```
  CC instance (scope=web-ui)  ─┐
  CC instance (scope=web-core) ─┼─OTLP gRPC :4317─▶ collector ─┬─ metrics ─▶ Prometheus ─┐
  CC instance (scope=...)      ─┘                              └─ logs/events ─▶ Loki ────┴─▶ Grafana :3333
```

## Запуск стека

```bash
cd docker/observability
docker compose up -d
```

- **Grafana:** http://localhost:3333 → дашборд **Capsule / Agent Fleet** (anonymous Admin, без логина).
- Prometheus debug-UI: http://localhost:9090 · Loki — только по внутренней сети.
- Стоп: `docker compose down` (данные в named volumes сохраняются). Снести с данными: `docker compose down -v`.

## Запуск агентов под скоупом

Каждый параллельный инстанс — в отдельном терминале, через враппер (он выставляет
OTEL-переменные и стартует `claude`):

```powershell
# PowerShell (основной)
.\claude-scope.ps1 -Scope web-ui -Package "@capsuletech/web-ui"
.\claude-scope.ps1 -Scope web-core
```
```bash
# bash
./claude-scope.sh web-ui "@capsuletech/web-ui"
./claude-scope.sh web-core
```

`scope` — единственное, что разделяет потоки в дашборде. Договорённость: `scope` =
имя пакета без неймспейса (`web-ui`, `web-core`, `web-shell`, …), `package` —
полное имя для подписи. Меняй интервалы экспорта / опт-ин контента в самом враппере.

> Логируются текст промптов (`OTEL_LOG_USER_PROMPTS`) и детали тулзов —
> `OTEL_LOG_TOOL_DETAILS` (команды, tool_name). Всё остаётся локально в Loki.
> Не нужно — убери эти две строки из враппера.

## Дашборд

`grafana/provisioning/dashboards/capsule-fleet.json` — стартовый fleet-обзор:
event-rate по скоупам, активные скоупы, поток событий (raw), token-usage.
Провижнится автоматически, правится в UI (allowUiUpdates). Экспорт правок —
обратно в этот JSON.

## Smoke — пройден (2026-06-11)

Прогнан один headless-инстанс (`scope=smoke`) → данные дошли по всем трём точкам:

1. **collector принимает** ✅ — `docker logs capsule-otel-collector`:
   `LogsExporter ... log records: 3` + `MetricsExporter ... data points: 12`.
2. **Loki: scope — индексируемый лейбл** ✅ — `/labels` отдаёт
   `["package","scope","service_name"]`; `{scope="smoke"}` возвращает строки
   (`service_name=claude-code`). `otlp_config` в `loki-config.yaml` сработал.
3. **Prometheus: имена метрик подтверждены** ✅ —
   `claude_code_token_usage_tokens_total` (с разбивкой по `type`),
   `claude_code_cost_usage_USD_total`, `claude_code_session_count_total`,
   `claude_code_active_time_seconds_total`. Панель #3 дашборда работает как есть.

Перепроверить заново (после апгрейда образов / смены конфига) — повторить те же
три запроса; команды в git-истории этого PR.

Следующий шаг (не входит в срез A): метрик-панели раскрываются на
cost / active-time / tool-decision по уже подтверждённым именам выше.

## Версии образов (пины)

`otel/opentelemetry-collector-contrib:0.111.0` · `grafana/loki:3.1.1` ·
`prom/prometheus:v2.54.1` · `grafana/grafana:11.2.2`. Меняешь minor Loki —
перепроверь `otlp_config` (схема per-tenant OTLP менялась между релизами).
