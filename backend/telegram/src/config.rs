//! Конфигурация gateway из переменных окружения.

use std::net::SocketAddr;

/// Конфиг Telegram-gateway. Читается из env один раз при старте.
#[derive(Debug, Clone)]
pub struct Config {
    /// Bot token из @BotFather. Env `TELEGRAM_BOT_TOKEN` (**required**).
    pub bot_token: String,
    /// Базовый URL capsule-server. Env `SCRIBER_URL`.
    pub scriber_url: String,
    /// LLM-провайдер для chat. Env `TELEGRAM_PROVIDER`.
    pub provider: String,
    /// Модель. Env `TELEGRAM_MODEL` (опц. — если пусто, берётся первая доступная).
    pub model: Option<String>,
    /// Опциональный system prompt. Env `TELEGRAM_SYSTEM`.
    pub system: Option<String>,
    /// Адрес axum-сервера (Mini App backend). Env `TELEGRAM_BIND`.
    pub bind: SocketAddr,
}

impl Config {
    /// Собрать из окружения. Ошибка только если нет `TELEGRAM_BOT_TOKEN`
    /// или `TELEGRAM_BIND` не парсится.
    pub fn from_env() -> anyhow::Result<Self> {
        let bot_token = std::env::var("TELEGRAM_BOT_TOKEN")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .ok_or_else(|| anyhow::anyhow!("TELEGRAM_BOT_TOKEN is required"))?;

        let bind_raw = env_or("TELEGRAM_BIND", "127.0.0.1:8788");
        let bind: SocketAddr = bind_raw
            .parse()
            .map_err(|e| anyhow::anyhow!("invalid TELEGRAM_BIND '{bind_raw}': {e}"))?;

        Ok(Self {
            bot_token,
            scriber_url: env_or("SCRIBER_URL", "http://127.0.0.1:8787"),
            provider: env_or("TELEGRAM_PROVIDER", "ollama"),
            model: opt_env("TELEGRAM_MODEL"),
            system: opt_env("TELEGRAM_SYSTEM"),
            bind,
        })
    }
}

/// Значение env или дефолт (пустая строка трактуется как отсутствие).
fn env_or(key: &str, default: &str) -> String {
    opt_env(key).unwrap_or_else(|| default.to_string())
}

/// Непустое значение env или `None`.
fn opt_env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|s| !s.trim().is_empty())
}
