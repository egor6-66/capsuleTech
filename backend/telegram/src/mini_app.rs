//! Валидация Telegram Mini App `initData`.
//!
//! Краеугольный security-камень будущего Mini App: фронт присылает
//! `window.Telegram.WebApp.initData` (raw query-string), бэкенд проверяет
//! HMAC-подпись по bot token'у **прежде чем** доверять полям `user` / `auth_date`.
//!
//! Алгоритм — <https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app>.

use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Ошибка валидации `initData`.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum InitDataError {
    /// Нет поля `hash`.
    #[error("missing hash field")]
    MissingHash,
    /// Подпись не совпала (или не тот токен).
    #[error("signature mismatch")]
    BadSignature,
    /// `initData` не парсится как query-string.
    #[error("malformed init data")]
    Malformed,
}

/// Распарсенные и проверенные поля `initData` (без `hash`).
#[derive(Debug, Clone)]
pub struct VerifiedInitData {
    /// Пары `key → value` (url-decoded), кроме `hash`.
    fields: Vec<(String, String)>,
}

impl VerifiedInitData {
    /// Значение поля по ключу (напр. `"user"` — сырой JSON-string).
    pub fn get(&self, key: &str) -> Option<&str> {
        self.fields
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

/// Проверить подпись `init_data` bot-token'ом.
///
/// 1. Распарсить query-string (url-decode).
/// 2. Изъять `hash`.
/// 3. `data_check_string` = отсортированные по ключу `key=value`, join `"\n"`.
/// 4. `secret = HMAC-SHA256(key="WebAppData", msg=bot_token)`.
/// 5. `expected = hex(HMAC-SHA256(key=secret, msg=data_check_string))`.
/// 6. Сравнить с `hash` (constant-time).
pub fn verify_init_data(
    init_data: &str,
    bot_token: &str,
) -> Result<VerifiedInitData, InitDataError> {
    let mut pairs: Vec<(String, String)> =
        serde_urlencoded::from_str(init_data).map_err(|_| InitDataError::Malformed)?;

    let hash_idx = pairs
        .iter()
        .position(|(k, _)| k == "hash")
        .ok_or(InitDataError::MissingHash)?;
    let (_, provided_hash) = pairs.remove(hash_idx);

    pairs.sort_by(|(a, _), (b, _)| a.cmp(b));
    let data_check_string = pairs
        .iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("\n");

    let secret = hmac_sha256(b"WebAppData", bot_token.as_bytes());
    let expected = hex::encode(hmac_sha256(&secret, data_check_string.as_bytes()));

    if !constant_time_eq(expected.as_bytes(), provided_hash.as_bytes()) {
        return Err(InitDataError::BadSignature);
    }
    Ok(VerifiedInitData { fields: pairs })
}

fn hmac_sha256(key: &[u8], msg: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC accepts keys of any length");
    mac.update(msg);
    mac.finalize().into_bytes().to_vec()
}

/// Constant-time сравнение байтов (без раннего выхода).
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

    /// Построить валидно подписанный `initData` из полей (та же спека, что в
    /// `verify_init_data`, но написанная отдельно — независимая перепроверка шагов).
    fn sign(fields: &[(&str, &str)], token: &str) -> String {
        let mut sorted = fields.to_vec();
        sorted.sort_by(|a, b| a.0.cmp(b.0));
        let dcs = sorted
            .iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<Vec<_>>()
            .join("\n");
        let secret = hmac_sha256(b"WebAppData", token.as_bytes());
        let hash = hex::encode(hmac_sha256(&secret, dcs.as_bytes()));

        let mut all: Vec<(&str, String)> =
            fields.iter().map(|(k, v)| (*k, (*v).to_string())).collect();
        all.push(("hash", hash));
        serde_urlencoded::to_string(&all).unwrap()
    }

    #[test]
    fn verifies_valid_init_data() {
        let init = sign(
            &[
                ("auth_date", "1700000000"),
                ("user", r#"{"id":42,"first_name":"Bob"}"#),
            ],
            TOKEN,
        );
        let v = verify_init_data(&init, TOKEN).expect("should verify");
        assert_eq!(v.get("auth_date"), Some("1700000000"));
        assert!(v.get("user").unwrap().contains("Bob"));
        assert!(v.get("hash").is_none(), "hash must be stripped");
    }

    #[test]
    fn rejects_wrong_token() {
        let init = sign(&[("auth_date", "1700000000")], TOKEN);
        assert_eq!(
            verify_init_data(&init, "999999:WRONGTOKEN").unwrap_err(),
            InitDataError::BadSignature
        );
    }

    #[test]
    fn rejects_tampered_field() {
        let init = sign(
            &[("auth_date", "1700000000"), ("user", r#"{"id":42}"#)],
            TOKEN,
        );
        let tampered = init.replace("42", "99");
        assert_eq!(
            verify_init_data(&tampered, TOKEN).unwrap_err(),
            InitDataError::BadSignature
        );
    }

    #[test]
    fn rejects_missing_hash() {
        assert_eq!(
            verify_init_data("auth_date=1700000000", TOKEN).unwrap_err(),
            InitDataError::MissingHash
        );
    }
}
