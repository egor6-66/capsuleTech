//! `GET /health` — liveness + проверка соединения с БД.

use axum::{extract::State, Json};
use serde_json::{json, Value};

use crate::{error::AppResult, state::AppState};

pub async fn health(State(state): State<AppState>) -> AppResult<Json<Value>> {
    // Простой runtime-запрос. (Макрос `query!` с compile-time проверкой SQL
    // требует доступной БД на компиляции — внедрим, когда появятся таблицы.)
    sqlx::query("SELECT 1").execute(&state.db).await?;
    Ok(Json(json!({ "status": "ok", "db": "up" })))
}
