//! Единый тип ошибки приложения + маппинг в HTTP-ответ.
//!
//! Best-practice: доменные ошибки типизированы (`thiserror`), а наружу отдаём
//! аккуратный JSON `{ "error": "..." }` с правильным статусом. Внутренние
//! детали (ошибки БД) логируем полностью, но клиенту НЕ раскрываем.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("не найдено: {0}")]
    NotFound(String),

    #[error("некорректный запрос: {0}")]
    BadRequest(String),

    #[error("не авторизован")]
    Unauthorized,

    /// Любая ошибка sqlx конвертируется сюда автоматически (`?`).
    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error("внутренняя ошибка: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m.clone()),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "не авторизован".into()),
            AppError::Database(e) => {
                // Полную ошибку — в лог, клиенту — обобщённо.
                tracing::error!(error = %e, "ошибка БД");
                (StatusCode::INTERNAL_SERVER_ERROR, "ошибка базы данных".into())
            }
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m.clone()),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

/// Удобный алиас для возвращаемых значений хендлеров.
pub type AppResult<T> = Result<T, AppError>;
