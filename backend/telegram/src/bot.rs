//! Бот-цикл: long-poll апдейтов → роутинг команд/текста → capsule-server → ответ.

use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::scriber::{ChatResult, ScriberClient};
use crate::telegram::TelegramClient;

/// Маппинг chat_id → conversation_id. In-memory: сбрасывается при рестарте
/// gateway (как и сами conversation'ы в capsule-server). `tokio::sync::Mutex`,
/// а не `std` — лочим across `.await`.
type ConvMap = Arc<Mutex<HashMap<i64, String>>>;

const POLL_TIMEOUT_SECS: u32 = 30;

/// Запустить бот-цикл. Возвращается только при фатальной ошибке (напр. модель
/// не разрешилась на старте); ошибки отдельных сообщений логируются и не валят бот.
pub async fn run(
    config: Arc<Config>,
    tg: TelegramClient,
    scriber: ScriberClient,
) -> anyhow::Result<()> {
    let model = resolve_model(&config, &scriber).await?;
    info!(provider = %config.provider, model = %model, "telegram bot: ready");

    let convs: ConvMap = Arc::new(Mutex::new(HashMap::new()));
    let mut offset: i64 = 0;

    loop {
        let updates = match tg.get_updates(offset, POLL_TIMEOUT_SECS).await {
            Ok(updates) => updates,
            Err(e) => {
                warn!(error = %e, "getUpdates failed; retrying in 3s");
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                continue;
            }
        };
        for update in updates {
            offset = offset.max(update.update_id + 1);
            let Some(message) = update.message else {
                continue;
            };
            let chat_id = message.chat.id;
            let Some(text) = message.text else {
                continue;
            };
            if let Err(e) =
                handle_text(&config, &model, &tg, &scriber, &convs, chat_id, &text).await
            {
                error!(error = %e, chat_id, "handle_text failed");
                let _ = tg
                    .send_message(
                        chat_id,
                        "⚠️ Не удалось обработать сообщение. Попробуйте ещё раз.",
                    )
                    .await;
            }
        }
    }
}

async fn handle_text(
    config: &Config,
    model: &str,
    tg: &TelegramClient,
    scriber: &ScriberClient,
    convs: &ConvMap,
    chat_id: i64,
    text: &str,
) -> anyhow::Result<()> {
    let trimmed = text.trim();
    match trimmed {
        "/start" => {
            tg.send_message(
                chat_id,
                "Привет! Я мост к capsule-агенту. Просто напишите сообщение.\n/new — начать новый диалог.",
            )
            .await?;
            return Ok(());
        }
        "/new" => {
            convs.lock().await.remove(&chat_id);
            tg.send_message(chat_id, "🧹 Контекст очищен. Новый диалог.")
                .await?;
            return Ok(());
        }
        "" => return Ok(()),
        _ => {}
    }

    tg.send_chat_action(chat_id, "typing").await;

    let conv_id = ensure_conversation(scriber, convs, chat_id).await?;
    let reply = match dispatch(config, model, scriber, trimmed, &conv_id).await? {
        ChatResult::Reply(text) => text,
        ChatResult::ProviderError(msg) => format!("⚠️ Ошибка провайдера: {msg}"),
        ChatResult::ConversationGone => {
            // capsule-server перезапущен — пересоздаём conversation и повторяем раз.
            convs.lock().await.remove(&chat_id);
            let fresh = ensure_conversation(scriber, convs, chat_id).await?;
            match dispatch(config, model, scriber, trimmed, &fresh).await? {
                ChatResult::Reply(text) => text,
                ChatResult::ProviderError(msg) => format!("⚠️ Ошибка провайдера: {msg}"),
                ChatResult::ConversationGone => "⚠️ Не удалось создать диалог.".to_string(),
            }
        }
    };

    let reply = if reply.trim().is_empty() {
        "…(пустой ответ модели)".to_string()
    } else {
        reply
    };
    tg.send_message(chat_id, &reply).await?;
    Ok(())
}

async fn dispatch(
    config: &Config,
    model: &str,
    scriber: &ScriberClient,
    text: &str,
    conv_id: &str,
) -> anyhow::Result<ChatResult> {
    scriber
        .chat(
            &config.provider,
            model,
            text,
            Some(conv_id),
            config.system.as_deref(),
        )
        .await
}

async fn ensure_conversation(
    scriber: &ScriberClient,
    convs: &ConvMap,
    chat_id: i64,
) -> anyhow::Result<String> {
    if let Some(id) = convs.lock().await.get(&chat_id) {
        return Ok(id.clone());
    }
    // create_conversation — вне лока (сетевой await не держит mutex).
    let id = scriber.create_conversation().await?;
    convs.lock().await.insert(chat_id, id.clone());
    Ok(id)
}

/// Модель: env-override → первая доступная из `/models`.
async fn resolve_model(config: &Config, scriber: &ScriberClient) -> anyhow::Result<String> {
    if let Some(m) = &config.model {
        return Ok(m.clone());
    }
    match scriber.first_model(&config.provider).await? {
        Some(m) => Ok(m),
        None => anyhow::bail!(
            "no models available from provider '{}'; set TELEGRAM_MODEL",
            config.provider
        ),
    }
}
