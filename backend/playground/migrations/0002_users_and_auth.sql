-- Аккаунты пользователей + способы входа.

-- users — учётная запись. Пароль здесь НЕ хранится: способы входа вынесены
-- в auth_identities (на расширение: telegram/email/qr/phone).
CREATE TABLE users (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role         text NOT NULL,                 -- пока любая строка; RBAC/capabilities позже
    display_name text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- auth_identities — «как пользователь логинится». Один user → много identity.
--   kind       — способ входа: 'password' сейчас; 'telegram'/'email'/'qr'/'phone' потом
--   identifier — логин/email/телефон/tg-id (чем юзер опознаётся при входе)
--   secret     — argon2-хеш пароля (для 'password'); NULL для внешних провайдеров
CREATE TABLE auth_identities (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       text NOT NULL,
    identifier text NOT NULL,
    secret     text,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- один и тот же идентификатор не может повторяться внутри одного типа
    -- (например, два аккаунта с логином 'egor' через пароль — нельзя)
    UNIQUE (kind, identifier)
);

CREATE INDEX auth_identities_user_id_idx ON auth_identities (user_id);

-- Стандартный приём Postgres: триггер авто-обновляет updated_at при любом UPDATE,
-- чтобы не выставлять его руками в каждом запросе.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
