//! `capsule-server` — HTTP/SSE binary для scriber LLM router.
//!
//! **PR-1**: минимальный `/health` endpoint + AppState scaffold с trait-object providers.
//! **PR-2**: полные endpoints (`/providers`, `/models`, `/chat/stream`, `/conversations`).

#![forbid(unsafe_code)]

use std::{net::SocketAddr, sync::Arc};

use axum::{routing::get, Router};
use capsule_core::{LlmBackend, ToolProvider};
use capsule_ollama::OllamaBackend;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Shared application state.
///
/// Providers wrapped в trait objects — server-side composition без knowledge
/// о конкретных типах. В PR-2 будут endpoints, которые итерируют по этим
/// векторам для multi-provider роутинга.
#[derive(Clone)]
struct AppState {
    /// LLM providers (Ollama в PR-1, OpenAI/Anthropic/Gemini в P1).
    #[allow(dead_code)] // используется в PR-2 endpoints
    llms: Arc<Vec<Arc<dyn LlmBackend>>>,
    /// Tool providers (native + mcp scaffolds в PR-1, реализация в P1).
    #[allow(dead_code)]
    tools: Arc<Vec<Arc<dyn ToolProvider>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let state = build_app_state();
    let app = build_router(state);

    let addr: SocketAddr = "127.0.0.1:8787".parse()?;
    info!(%addr, "scriber server listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("warn,capsule_server=info,tower_http=info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .init();
}

fn build_app_state() -> AppState {
    let llms: Vec<Arc<dyn LlmBackend>> = vec![Arc::new(OllamaBackend::new())];
    // Tool providers — пустой Vec в PR-1, не регистрируем scaffolds которые return not-implemented.
    let tools: Vec<Arc<dyn ToolProvider>> = vec![];
    AppState {
        llms: Arc::new(llms),
        tools: Arc::new(tools),
    }
}

fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

async fn health() -> &'static str {
    "ok"
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn health_returns_ok() {
        let app = build_router(build_app_state());
        let resp = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(resp.into_body(), 64).await.unwrap();
        assert_eq!(&bytes[..], b"ok");
    }

    #[test]
    fn app_state_includes_ollama_backend() {
        let state = build_app_state();
        assert_eq!(state.llms.len(), 1);
        assert_eq!(state.llms[0].id(), "ollama");
        assert_eq!(state.tools.len(), 0);
    }
}
