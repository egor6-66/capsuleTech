//! Общее состояние приложения, прокидываемое в каждый хендлер axum.
//!
//! `AppState` обязан быть `Clone` (axum клонирует его на каждый запрос) —
//! но это дёшево: внутри `Arc`/пул, копируется только указатель.

use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    /// Пул соединений к Postgres.
    pub db: PgPool,
    /// Конфигурация (read-only) за `Arc`.
    pub config: Arc<Config>,
}
