//! Ollama implementation of [`capsule_core::LlmBackend`].
//!
//! **Status (PR-1)**: scaffold — все методы возвращают `not implemented`.
//! **PR-2**: полный wire-protocol через Ollama HTTP API:
//! - `GET /api/tags` → `list_models`
//! - `GET /api/show` → `capabilities`
//! - `POST /api/chat` (NDJSON stream) → `chat_stream`
//! - `POST /api/pull` (NDJSON progress) → server-specific `pull_stream`
//! - `DELETE /api/delete`, `POST /api/generate` (для keep_alive) — `delete_model`, `set_keep_alive`

#![forbid(unsafe_code)]
#![warn(missing_docs)]

use async_trait::async_trait;
use capsule_core::{
    BoxStream, Capability, ChatChunk, ChatRequest, Error, LlmBackend, ModelInfo, Result,
};

/// Backend для Ollama daemon (`http://localhost:11434` по умолчанию).
pub struct OllamaBackend {
    host: String,
    client: reqwest::Client,
}

impl OllamaBackend {
    /// Создать backend с дефолтным host'ом.
    pub fn new() -> Self {
        Self::with_host("http://localhost:11434".to_string())
    }

    /// Создать backend с кастомным host'ом.
    pub fn with_host(host: String) -> Self {
        let client = reqwest::Client::builder()
            .build()
            .expect("reqwest::Client::builder");
        Self { host, client }
    }

    /// Host daemon'а (для диагностики).
    pub fn host(&self) -> &str {
        &self.host
    }
}

impl Default for OllamaBackend {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl LlmBackend for OllamaBackend {
    fn id(&self) -> &str {
        "ollama"
    }

    async fn available(&self) -> bool {
        // PR-2: GET /api/tags с коротким timeout, true если 200.
        false
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>> {
        // PR-2: GET {host}/api/tags → parse → Vec<ModelInfo>.
        // Capabilities добиваются отдельным /api/show запросом per-model или batched.
        let _ = &self.client;
        Err(Error::Other(
            "OllamaBackend::list_models — not implemented (PR-2)".into(),
        ))
    }

    async fn capabilities(&self, _model: &str) -> Result<Vec<Capability>> {
        // PR-2: GET {host}/api/show?name=... → response.capabilities → map в наш Capability enum.
        Err(Error::Other(
            "OllamaBackend::capabilities — not implemented (PR-2)".into(),
        ))
    }

    async fn chat_stream(&self, _req: ChatRequest) -> Result<BoxStream<ChatChunk>> {
        // PR-2: POST {host}/api/chat (stream=true) NDJSON.
        // Каждая строка — ChatChunk::Token (если есть delta) или Done с tool_calls.
        // Images из req.messages[].images прокидываются как messages[].images (Ollama-native).
        Err(Error::Other(
            "OllamaBackend::chat_stream — not implemented (PR-2)".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backend_id_is_ollama() {
        let backend = OllamaBackend::new();
        assert_eq!(backend.id(), "ollama");
    }

    #[test]
    fn default_host_is_localhost_11434() {
        let backend = OllamaBackend::new();
        assert_eq!(backend.host(), "http://localhost:11434");
    }

    #[test]
    fn custom_host_is_preserved() {
        let backend = OllamaBackend::with_host("http://192.168.1.10:11434".into());
        assert_eq!(backend.host(), "http://192.168.1.10:11434");
    }
}
