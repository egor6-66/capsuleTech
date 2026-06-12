//! Конфигурация из окружения (12-factor): ноль хардкода адресов/секретов.
//!
//! Дефолты подобраны под локальный `docker compose` (Postgres на 5433, Redis
//! на 6380) — `cargo run` работает «из коробки» после `docker compose up`.
//! В проде/закрытом контуре всё переопределяется реальными переменными.

use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    /// Адрес, который слушает HTTP-сервер.
    pub bind_addr: String,
    /// Строка подключения к Postgres.
    pub database_url: String,
    /// Строка подключения к Redis (задействуем на следующих шагах).
    pub redis_url: String,
    /// Каталог с распакованными сборками (раздаётся статикой).
    pub data_dir: String,
    /// Bearer-токен для приёма deploy. `None` → deploy отключён.
    pub deploy_token: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            bind_addr: env::var("PLAYGROUND_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into()),
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://capsule:capsule@localhost:5433/capsule_playground".into()
            }),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6380".into()),
            data_dir: env::var("DATA_DIR").unwrap_or_else(|_| "./_data".into()),
            deploy_token: env::var("DEPLOY_TOKEN").ok().filter(|s| !s.is_empty()),
        }
    }
}
