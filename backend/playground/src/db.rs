//! Пул соединений к Postgres (sqlx).
//!
//! Пул — это переиспользуемый набор открытых соединений: дёшево брать/возвращать
//! под каждый запрос вместо нового коннекта каждый раз. `PgPool` клонируется
//! дёшево (внутри `Arc`) и кладётся в `AppState`.

use std::time::Duration;

use sqlx::{postgres::PgPoolOptions, PgPool};

pub async fn connect(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await?;
    Ok(pool)
}
