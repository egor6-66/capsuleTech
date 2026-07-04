---
tags: [adr, accepted, deployment, infra, gateway, wireguard, gpu]
status: accepted
date: 2026-07-05
last_updated: 2026-07-05
supersedes: []
extends:
  - 065-self-hosted-inference
  - 067-backend-capability-services-lang-voice
  - 068-identity-auth-service-and-single-origin-topology
---

> [!info] Status: accepted
> Деплой в два яруса: **лёгкий VPS** (gateway+TLS, фронты статикой, auth/lang/
> learn-BFF, БД) + **GPU-peer** (voice/image, будущие STT/LLM; сейчас — локалка
> user'а RTX 3070 Ti 8GB). Связность — **WireGuard**-туннель, исходящий ОТ
> GPU-peer'а (CGNAT не мешает); WG-сервер на VPS совмещается с личным VPN
> user'а (разные peers). GPU-peer offline = штатная деградация (audio/image:
> null), не даунтайм. Миграция на будущий GPU-сервер = смена одного upstream.

# ADR 070 — Two-tier deployment: лёгкий VPS + GPU-peer через WireGuard

## Контекст {#context}

Хостинг — обычный VPS без GPU: достаточно для фронтов и лёгких сервисов,
ML-нагрузку (diffusers/TTS/будущие STT/LLM по ADR 065) положит сразу.
У user'а есть локальная машина с RTX 3070 Ti (8GB) — на первое время она и
есть GPU-ярус. Домашняя машина за CGNAT — входящие соединения к ней невозможны.
ADR 067/068 уже изолировали топологию в конфиге: фронты знают только
`/api/<svc>/`, learn-BFF знает upstream'ы только через env — сплит по машинам
не требует изменений кода.

## Решение {#decision}

### D1 — Два яруса {#d1}

- **Light-tier (VPS):** nginx-gateway (prod-форма dev-gateway `docker/gateway`,
  та же карта локаций) + TLS (Let's Encrypt) · фронты статикой (`capsule build`,
  base-пути ADR 068 D5) · auth :8004, lang :8002, learn-BFF :8003 · БД.
  Всё user-критичное (identity, контент, композиция) живёт здесь — GPU-ярус
  не является точкой отказа для ядра.
- **Heavy-tier (GPU-peer):** voice :8001, image :8005, далее STT/LLM (ADR 065).
  Сейчас — локалка user'а; позже — арендный/свой GPU-сервер.

### D2 — Связность: WireGuard, инициатор — GPU-peer {#d2}

VPS = WG-сервер (совмещён с личным VPN user'а: один WG-инстанс, peers с
разными AllowedIPs — сервисный peer маршрутизирует только приватную подсеть,
не весь трафик). Локалка = peer, соединение исходящее → CGNAT не помеха,
наружу на локалке не торчит ни один порт. nginx на VPS апстримит тяжёлые пути
на WG-IP peer'а (`svc_image → 10.x.x.2:8005`); learn-BFF получает
`VOICE_URL/IMAGE_URL` на те же WG-адреса.

**DPI-риск (РФ):** голый WireGuard местами душится провайдерами. Fallback-
лестница: WG поверх `wstunnel`/udp2raw → SSH reverse-tunnel (`autossh -R`).
Внешние координаторы (Tailscale/CF Tunnel) отклонены — лишний сервис в цепочке.

### D3 — GPU-peer offline = штатный режим {#d3}

Выключенная локалка → 502 на `/api/voice|image` → learn-BFF уже отдаёт
`audio/image: null` → апп живой, слова без озвучки/картинок. Кэши на
heavy-tier (image disk-cache есть; voice speak-cache — бриф) сокращают
GPU-обращения; их перенос/прогрев при миграции ярусов — rsync каталога кэша.

### D4 — Инварианты конфига {#d4}

Сервисы не знают топологию (канон gateway). Вся привязка машин — ровно два
места: upstream'ы nginx + env learn-BFF. Смена GPU-peer'а (локалка → сервер) =
правка WG-peer'а и одного upstream, ноль изменений кода — cloud-portable
ADR 065 соблюдён буквально.

### D5 — Безопасность {#d5}

Heavy-tier слушает только `127.0.0.1` + WG-интерфейс. VPS: TLS на gateway,
кука `capsule_session` → `Secure` (шов `cookie_secure` в auth уже есть),
файрвол — наружу только 80/443/WG-порт. Секреты/ключи WG — вне репо
(air-gapped канон: в репо только шаблоны конфигов без адресов/ключей).

## Фазы {#phases}

1. **VPS bootstrap:** nginx+TLS по карте dev-gateway, WG-сервер, лёгкие
   сервисы, статика фронтов, БД. Апп работает полностью (без озвучки/картинок).
2. **GPU-peer:** локалка как WG-peer, voice/image на ней, upstream'ы/env → WG-IP.
3. **GPU-сервер** (когда появится): новый peer, смена upstream'ов. Локалка
   выходит из цепочки.

## Последствия {#consequences}

**Плюсы:** слабый VPS тянет ядро; GPU-мощность бесплатно (уже есть локалка);
деградация вместо даунтайма; миграция ярусов без кода. **Цена:** WG-настройка
(разово) + DPI-риск с готовым fallback'ом; зависимость «тяжёлых» фич от
включённости локалки (осознанно, до GPU-сервера); prod-nginx надо держать
синхронным с dev-gateway картой (source of truth — `docker/gateway/nginx.conf`).
