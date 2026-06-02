//! `capsule-telegram` — Telegram-gateway для capsule-агента.
//!
//! Один процесс = две «головы»:
//! - **бот** — long-poll Telegram Bot API, форвардит чат в `capsule-server`
//!   `/chat/stream` и возвращает ответ модели в Telegram;
//! - **axum-сервер** — backend будущего Telegram **Mini App**: валидирует
//!   `initData` (HMAC-SHA256 по bot token) и отдаёт `/api/*`.
//!
//! Обе головы делят один bot token (именно поэтому живут в одном процессе:
//! проверка `initData` требует токен, который держит бот).
//!
//! ## Переменные окружения
//!
//! | Var | Default | Что |
//! |-----|---------|-----|
//! | `TELEGRAM_BOT_TOKEN` | — (**required**) | токен из @BotFather |
//! | `SCRIBER_URL` | `http://127.0.0.1:8787` | базовый URL capsule-server |
//! | `TELEGRAM_PROVIDER` | `ollama` | LLM-провайдер |
//! | `TELEGRAM_MODEL` | (первая доступная) | имя модели |
//! | `TELEGRAM_SYSTEM` | — | system prompt |
//! | `TELEGRAM_BIND` | `127.0.0.1:8788` | адрес axum-сервера (Mini App) |
//!
//! `capsule-server` должен быть запущен (`pnpm dev:backend`).

#![forbid(unsafe_code)]

mod bot;
mod config;
mod mini_app;
mod scriber;
mod telegram;
mod web;

use std::sync::Arc;

use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let config = Arc::new(config::Config::from_env()?);
    let http = reqwest::Client::new();

    let tg = telegram::TelegramClient::new(http.clone(), &config.bot_token);
    let scriber = scriber::ScriberClient::new(http.clone(), config.scriber_url.clone());

    // ── axum (Mini App backend) ─────────────────────────────────────────────
    let web_state = web::WebState {
        bot_token: Arc::from(config.bot_token.as_str()),
    };
    let app = web::build_router(web_state);
    let listener = tokio::net::TcpListener::bind(config.bind).await?;
    info!(addr = %config.bind, "telegram gateway: web server listening");
    let web_task = tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            error!(error = %e, "web server crashed");
        }
    });

    // ── бот-цикл (в текущем task'е; живёт до фатальной ошибки) ───────────────
    let bot_result = bot::run(config.clone(), tg, scriber).await;

    web_task.abort();
    bot_result
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("warn,capsule_telegram=info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}
