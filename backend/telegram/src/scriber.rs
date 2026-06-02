//! HTTP-клиент к `capsule-server` (`/conversations`, `/models`, `/chat/stream`).
//!
//! Читает SSE-поток `/chat/stream` и собирает финальный текст ответа. Telegram
//! v1 не стримит токены по мере поступления — ждём `done` и шлём ответ целиком
//! (стриминговые edit'ы — будущее, по UX-вкусу). SSE-парсинг — ручной, как
//! NDJSON в `scriber/ollama`.

use futures_util::StreamExt;
use serde::Deserialize;

/// Клиент capsule-server.
#[derive(Clone)]
pub struct ScriberClient {
    http: reqwest::Client,
    base: String,
}

/// Исход chat-запроса для бота.
pub enum ChatResult {
    /// Готовый ответ модели.
    Reply(String),
    /// Провайдер отдал ошибку (в потоке или статусом стрима).
    ProviderError(String),
    /// Указанной conversation нет (capsule-server перезапущен) — пересоздать.
    ConversationGone,
}

#[derive(Debug, Deserialize)]
struct CreatedConversation {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ModelInfo {
    provider: String,
    name: String,
}

/// Терминальное событие SSE-потока (внутреннее).
enum Terminal {
    Done(String),
    Error(String),
}

impl ScriberClient {
    /// Новый клиент с базовым URL capsule-server.
    pub fn new(http: reqwest::Client, base: String) -> Self {
        Self { http, base }
    }

    /// Создать новую conversation, вернуть её id.
    pub async fn create_conversation(&self) -> anyhow::Result<String> {
        let resp = self
            .http
            .post(format!("{}/conversations", self.base))
            .send()
            .await?;
        if !resp.status().is_success() {
            anyhow::bail!("create_conversation: HTTP {}", resp.status());
        }
        Ok(resp.json::<CreatedConversation>().await?.id)
    }

    /// Первая модель данного провайдера из `/models` (для дефолта, если
    /// `TELEGRAM_MODEL` не задан).
    pub async fn first_model(&self, provider: &str) -> anyhow::Result<Option<String>> {
        let resp = self
            .http
            .get(format!("{}/models", self.base))
            .send()
            .await?;
        if !resp.status().is_success() {
            anyhow::bail!("/models: HTTP {}", resp.status());
        }
        let models: Vec<ModelInfo> = resp.json().await?;
        Ok(models
            .into_iter()
            .find(|m| m.provider == provider)
            .map(|m| m.name))
    }

    /// Отправить сообщение в `/chat/stream` и собрать финальный ответ.
    pub async fn chat(
        &self,
        provider: &str,
        model: &str,
        message: &str,
        conversation_id: Option<&str>,
        system: Option<&str>,
    ) -> anyhow::Result<ChatResult> {
        let mut body = serde_json::json!({
            "provider": provider,
            "model": model,
            "message": message,
        });
        if let Some(cid) = conversation_id {
            body["conversation_id"] = serde_json::Value::String(cid.to_string());
        }
        if let Some(sys) = system {
            body["system"] = serde_json::Value::String(sys.to_string());
        }

        let resp = self
            .http
            .post(format!("{}/chat/stream", self.base))
            .json(&body)
            .send()
            .await?;
        let status = resp.status();
        if status == reqwest::StatusCode::NOT_FOUND {
            return Ok(ChatResult::ConversationGone);
        }
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("chat_stream: HTTP {status}: {text}");
        }

        let mut stream = resp.bytes_stream();
        let mut buf: Vec<u8> = Vec::new();
        let mut outcome = ChatResult::Reply(String::new());

        'outer: while let Some(chunk) = stream.next().await {
            buf.extend_from_slice(&chunk?);
            // SSE-события разделены пустой строкой ("\n\n").
            while let Some(idx) = find_subsequence(&buf, b"\n\n") {
                let block: Vec<u8> = buf.drain(..idx + 2).collect();
                let block = String::from_utf8_lossy(&block);
                if let Some(term) = scan_block(&block) {
                    outcome = match term {
                        Terminal::Done(text) => ChatResult::Reply(text),
                        Terminal::Error(msg) => ChatResult::ProviderError(msg),
                    };
                    break 'outer;
                }
            }
        }
        Ok(outcome)
    }
}

/// Вытащить терминальное событие из одного SSE-блока, если оно там есть.
/// Игнорирует `token`/`tool_call` и keep-alive-комментарии.
fn scan_block(block: &str) -> Option<Terminal> {
    for line in block.lines() {
        let Some(data) = line.strip_prefix("data:") else {
            continue;
        };
        let data = data.trim();
        if data.is_empty() {
            continue;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(data) else {
            continue;
        };
        match v.get("type").and_then(|t| t.as_str()) {
            Some("done") => {
                let content = v
                    .get("content")
                    .and_then(|c| c.as_str())
                    .unwrap_or_default()
                    .to_string();
                return Some(Terminal::Done(content));
            }
            Some("error") => {
                let msg = v
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                return Some(Terminal::Error(msg));
            }
            _ => {}
        }
    }
    None
}

/// Индекс первого вхождения `needle` в `haystack`.
fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_block_extracts_done_content() {
        let block = "event: done\ndata: {\"type\":\"done\",\"content\":\"Hello world\"}\n\n";
        match scan_block(block) {
            Some(Terminal::Done(s)) => assert_eq!(s, "Hello world"),
            _ => panic!("expected Done"),
        }
    }

    #[test]
    fn scan_block_ignores_token() {
        let block = "event: token\ndata: {\"type\":\"token\",\"content\":\"Hi\"}\n\n";
        assert!(scan_block(block).is_none());
    }

    #[test]
    fn scan_block_extracts_error() {
        let block = "event: error\ndata: {\"type\":\"error\",\"message\":\"boom\"}\n\n";
        match scan_block(block) {
            Some(Terminal::Error(m)) => assert_eq!(m, "boom"),
            _ => panic!("expected Error"),
        }
    }

    #[test]
    fn scan_block_ignores_keepalive_comment() {
        assert!(scan_block(": keep-alive\n\n").is_none());
    }

    #[test]
    fn find_subsequence_finds_double_newline() {
        assert_eq!(find_subsequence(b"abc\n\ndef", b"\n\n"), Some(3));
        assert_eq!(find_subsequence(b"abcdef", b"\n\n"), None);
    }
}
