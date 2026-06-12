-- Загруженные сборки приложений: история + текущая.
--
-- Каждый deploy = новая (неизменяемая) строка. Среди сборок одного app ровно
-- одна помечена is_current — её и раздаём под её base. Старые сборки остаются
-- историей (версионирование), а не затираются.
CREATE TABLE builds (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    app              text NOT NULL,                  -- имя приложения: 'ewc', 'playground'
    base             text NOT NULL,                  -- путь раздачи: '/ewc/' или '/'
    is_root          boolean NOT NULL DEFAULT false, -- раздаётся под корнем '/' (hub)
    version          text,                           -- метка версии/тега (опционально)

    -- git-метадата деплоя (может отсутствовать — деплой не всегда из git)
    git_branch       text,
    git_commit       text,
    git_author       text,
    git_message      text,
    git_committed_at timestamptz,

    size_bytes       bigint NOT NULL DEFAULT 0,      -- размер загрузки
    storage_path     text NOT NULL,                  -- где на диске распакованный dist
    is_current       boolean NOT NULL DEFAULT true,  -- текущая раздаваемая сборка app
    deployed_by      uuid REFERENCES users(id) ON DELETE SET NULL, -- кто залил (если знаем)
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- Быстрый список сборок приложения от новых к старым.
CREATE INDEX builds_app_created_idx ON builds (app, created_at DESC);

-- Инвариант БД: на каждый app — максимум одна текущая сборка.
CREATE UNIQUE INDEX builds_one_current_per_app ON builds (app) WHERE is_current;

-- Инвариант БД: среди текущих сборок — максимум одна корневая (hub под '/').
CREATE UNIQUE INDEX builds_single_current_root ON builds ((is_root)) WHERE is_root AND is_current;
