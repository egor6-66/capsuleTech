//! Тонкий клиент Telegram Bot API поверх `reqwest`.
//!
//! Без teloxide — хэндроллим только то, что нужно gateway'ю (long-poll
//! `getUpdates` + `sendMessage` + `sendChatAction`), в духе hand-rolled
//! Ollama-wire-клиента в `scriber/ollama`. Telegram-специфика заперта в этом
//! модуле, так что подменить транспорт (или перейти на teloxide) — локальная правка.

use std::time::Duration;

use serde::Deserialize;

/// Лимит текста одного Telegram-сообщения (символов).
pub const MAX_MESSAGE_LEN: usize = 4096;

/// Клиент Bot API. Держит `reqwest::Client` и базу `…/bot<token>`.
#[derive(Clone)]
pub struct TelegramClient {
    http: reqwest::Client,
    base: String,
}

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    ok: bool,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    result: Option<T>,
}

/// Один update из `getUpdates` (только нужные поля; остальное serde игнорит).
#[derive(Debug, Deserialize)]
pub struct Update {
    /// Монотонный id; offset следующего запроса = `update_id + 1`.
    pub update_id: i64,
    /// Сообщение (если update — про сообщение).
    #[serde(default)]
    pub message: Option<Message>,
}

/// Входящее сообщение.
#[derive(Debug, Deserialize)]
pub struct Message {
    /// Чат-источник.
    pub chat: Chat,
    /// Текст (None для не-текстовых сообщений).
    #[serde(default)]
    pub text: Option<String>,
}

/// Чат.
#[derive(Debug, Deserialize)]
pub struct Chat {
    /// id чата (адресат ответа).
    pub id: i64,
}

impl TelegramClient {
    /// Новый клиент для данного bot token'а.
    pub fn new(http: reqwest::Client, bot_token: &str) -> Self {
        Self {
            http,
            base: format!("https://api.telegram.org/bot{bot_token}"),
        }
    }

    /// Long-poll за апдейтами. `offset` — `update_id + 1` последнего обработанного,
    /// `timeout_secs` — серверный long-poll таймаут.
    pub async fn get_updates(&self, offset: i64, timeout_secs: u32) -> anyhow::Result<Vec<Update>> {
        let resp = self
            .http
            .get(format!("{}/getUpdates", self.base))
            .query(&[
                ("offset", offset.to_string()),
                ("timeout", timeout_secs.to_string()),
            ])
            // request-таймаут с запасом поверх серверного long-poll.
            .timeout(Duration::from_secs(u64::from(timeout_secs) + 10))
            .send()
            .await?;
        let parsed: ApiResponse<Vec<Update>> = resp.json().await?;
        if !parsed.ok {
            anyhow::bail!(
                "getUpdates failed: {}",
                parsed.description.unwrap_or_default()
            );
        }
        Ok(parsed.result.unwrap_or_default())
    }

    /// Отправить текст (разбивается на части по [`MAX_MESSAGE_LEN`]).
    pub async fn send_message(&self, chat_id: i64, text: &str) -> anyhow::Result<()> {
        for part in split_message(text) {
            let resp = self
                .http
                .post(format!("{}/sendMessage", self.base))
                .json(&serde_json::json!({ "chat_id": chat_id, "text": part }))
                .send()
                .await?;
            if !resp.status().is_success() {
                let body = resp.text().await.unwrap_or_default();
                anyhow::bail!("sendMessage failed: {body}");
            }
        }
        Ok(())
    }

    /// Послать chat action (напр. `"typing"`). Best-effort — ошибки глотаем.
    pub async fn send_chat_action(&self, chat_id: i64, action: &str) {
        let _ = self
            .http
            .post(format!("{}/sendChatAction", self.base))
            .json(&serde_json::json!({ "chat_id": chat_id, "action": action }))
            .send()
            .await;
    }
}

/// Разбить текст на куски `≤ MAX_MESSAGE_LEN` по границам символов.
/// Пустой текст → один пустой кусок (Telegram не принимает пустые сообщения,
/// но вызывающий код подменяет пустой ответ плейсхолдером раньше).
pub fn split_message(text: &str) -> Vec<String> {
    if text.is_empty() {
        return vec![String::new()];
    }
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut count = 0usize;
    for ch in text.chars() {
        if count + 1 > MAX_MESSAGE_LEN {
            parts.push(std::mem::take(&mut current));
            count = 0;
        }
        current.push(ch);
        count += 1;
    }
    if !current.is_empty() {
        parts.push(current);
    }
    parts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_short_message_single_part() {
        assert_eq!(split_message("hello"), vec!["hello".to_string()]);
    }

    #[test]
    fn split_empty_message_yields_one_empty() {
        assert_eq!(split_message(""), vec![String::new()]);
    }

    #[test]
    fn split_long_message_chunks_and_reassembles() {
        let text = "a".repeat(MAX_MESSAGE_LEN * 2 + 5);
        let parts = split_message(&text);
        assert!(parts.len() >= 3, "expected ≥3 parts, got {}", parts.len());
        assert!(parts.iter().all(|p| p.chars().count() <= MAX_MESSAGE_LEN));
        assert_eq!(parts.concat(), text);
    }
}
