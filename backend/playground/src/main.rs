//! `capsule-playground` — бэкенд плейграунда.
//!
//! Модульный монолит на axum: один бинарь, внутри разрезан по доменам
//! (`serve` / `builds` / `users` / `auth`). Каждый домен самодостаточен и
//! позже выносится в отдельный микросервис без переделки контрактов.
//!
//! Сейчас (каркас): только `GET /health` + подключение к Postgres + миграции.
//!
//! Запуск:
//!   1. `docker compose up -d`            — поднять Postgres + Redis
//!   2. `cargo run -p capsule-playground` — сервер (читает .env / окружение)

#![forbid(unsafe_code)]

use std::{net::SocketAddr, sync::Arc};

use axum::{routing::get, Router};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod config;
mod db;
mod error;
mod modules;
mod state;

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // .env подхватываем только в dev; в проде переменные приходят из окружения.
    dotenvy::dotenv().ok();
    init_tracing();

    let config = Config::from_env();
    info!(addr = %config.bind_addr, "запуск capsule-playground");

    // Пул соединений к Postgres + прогон миграций при старте.
    let pool = db::connect(&config.database_url).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    info!("миграции применены");

    let state = AppState {
        db: pool,
        config: Arc::new(config.clone()),
    };
    let app = build_router(state);

    let addr: SocketAddr = config.bind_addr.parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "capsule-playground слушает");
    axum::serve(listener, app).await?;
    Ok(())
}

/// Сборка axum-роутера. По мере роста сюда подмешиваются роутеры модулей
/// (`builds::router()`, `users::router()`, …) через `.merge(...)`.
fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(modules::health::health))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("warn,capsule_playground=info,tower_http=info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}
