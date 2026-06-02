//! axum HTTP-сервер gateway — backend будущего Telegram Mini App.
//!
//! Сейчас: `/health` + `POST /api/auth` (валидирует `initData`, возвращает
//! проверенного `user`). Дальше тут появятся `initData`-защищённые `/api/*`,
//! проксирующие в `capsule-server` под идентичностью Telegram-пользователя.

use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

use crate::mini_app::{verify_init_data, InitDataError};

/// Shared state axum-сервера.
#[derive(Clone)]
pub struct WebState {
    /// Bot token — нужен для проверки `initData`.
    pub bot_token: Arc<str>,
}

/// Собрать router gateway-сервера.
pub fn build_router(state: WebState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/api/auth", post(auth))
        .with_state(state)
        // CORS `*` — dev; prod должен ограничить origin'ом Telegram WebView.
        .layer(CorsLayer::permissive())
}

#[derive(Debug, Deserialize)]
struct AuthRequest {
    /// Raw `window.Telegram.WebApp.initData`.
    init_data: String,
}

/// Проверить `initData`. Успех → `{ ok, user, auth_date }`; иначе 400/401.
async fn auth(
    State(state): State<WebState>,
    Json(req): Json<AuthRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match verify_init_data(&req.init_data, &state.bot_token) {
        Ok(verified) => {
            let user = verified
                .get("user")
                .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
                .unwrap_or(serde_json::Value::Null);
            Ok(Json(serde_json::json!({
                "ok": true,
                "user": user,
                "auth_date": verified.get("auth_date"),
            })))
        }
        Err(InitDataError::BadSignature) => Err(StatusCode::UNAUTHORIZED),
        Err(InitDataError::MissingHash | InitDataError::Malformed) => Err(StatusCode::BAD_REQUEST),
    }
}
