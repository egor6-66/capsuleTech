/**
 * AuthLoginForm — config-driven form-блок на @capsuletech/web-ui.
 *
 * Рендерит поля из `IRoleStrategy.fields` (Select/Input/Button) — НЕ хардкод-разметка.
 * Брендинг (title/subtitle/submitLabel/footerNote) — props аппа.
 *
 * Submit-канал: стандартный UiProxy meta-tags (HCA-паттерн):
 *   <Button meta={{ tags: ['submit'] }}> → onClick → Controller FSM.
 *   Форма stateless, Controller владеет FSM.
 *
 * Компонент — web-core `View`. `Ui` ПЕРВЫМ аргументом от View-wrapper,
 * уже проксированный под ближайший Controller-scope в дереве (AuthFsm).
 * Апп НЕ передаёт `Ui` пропом — View подхватывает Controller-context автоматически.
 *
 * Регистрируется в capsule.ts как components.LoginForm.
 */

import { useCtx, View } from '@capsuletech/web-core';
import type { IAuthFormField, IRoleStrategy } from '../role/index';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IAuthLoginFormProps {
  /** Стратегия: задаёт поля формы. */
  strategy: IRoleStrategy;
  /** Заголовок формы. @default 'Вход' */
  title?: string;
  /** Подзаголовок формы (опционально). */
  subtitle?: string;
  /** Текст кнопки. @default 'Войти' */
  submitLabel?: string;
  /** Сноска внизу формы (брендинг аппа). */
  footerNote?: string;
}

// ─── AuthLoginForm — web-core View ────────────────────────────────────────────

/**
 * Stateless form-блок для auth — обёрнут в web-core View.
 *
 * View-wrapper:
 *  - получает `BaseUi` из ui-kit web-core;
 *  - проксирует его под ближайший Controller-scope (AuthFsm) через UiProxy;
 *  - передаёт проксированный `Ui` первым аргументом в factory.
 *
 * Результат: `<Button meta={{ tags: ['submit'] }}>` биндится в AuthFsm,
 * а не в вызывающий контекст аппа — корректный HCA-путь.
 *
 * Сигнатура: `View<IAuthLoginFormProps>((Ui, props) => JSX)`
 */
export const AuthLoginForm = View<IAuthLoginFormProps>((Ui, props) => {
  // Реактивный errorMessage из FSM context.data (store.update({ errorMessage })).
  // View рендерится внутри AuthFsm-scope → useCtx() достаёт контекст Feature.
  // При отсутствии контекста (storybook / out-of-scope) — тихо пустая строка.
  const ctx = useCtx();
  const errorMessage = () => (ctx?.store?.ctx?.data?.errorMessage as string | undefined) ?? '';

  // Внешний layout/фон — ответственность страницы-консьюмера (напр. _public layout).
  // Компонент возвращает только карточку формы без min-h-screen / bg-background.
  return (
    <Ui.Card w={96} elevation="lg">
      <Ui.Card.Header divider>
        <Ui.Card.Title align="center">
          {props.title ?? 'Вход'}
        </Ui.Card.Title>
        <Ui.Flow.Show when={props.subtitle}>
          <Ui.Card.Description align="center">
            {props.subtitle}
          </Ui.Card.Description>
        </Ui.Flow.Show>
      </Ui.Card.Header>

      <Ui.Card.Content>
        <Ui.Flow.For each={props.strategy.fields as IAuthFormField[]}>
          {(field: IAuthFormField) => (
            <Ui.Field>
              <Ui.Field.Label>
                {field.label}
              </Ui.Field.Label>
              <Ui.Field.Content>
                <Ui.Flow.Show
                  when={field.type === 'select'}
                  fallback={
                    <Ui.Input
                      type={field.type === 'password' ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      // biome-ignore lint/suspicious/noExplicitAny: meta.tags — TypeScript JSX-fallback inference quirk
                      meta={{ tags: [field.tag] as any }}
                    />
                  }
                >
                  <Ui.Select
                    options={(field.options ?? []) as Array<{ value: string; label: string }>}
                    defaultValue={field.defaultValue}
                    meta={{ tags: [field.tag] }}
                    placeholder={field.placeholder ?? `Выберите ${field.label.toLowerCase()}…`}
                  />
                </Ui.Flow.Show>
              </Ui.Field.Content>
            </Ui.Field>
          )}
        </Ui.Flow.For>

        {/* Ошибка входа — package-level, из FSM context.data.errorMessage.
            Слот ВСЕГДА в DOM (minH=6 = 1 строка) — карточка не прыгает.
            Видимость через dim (opacity) — плавный fade-in/out.
            tone="destructive" — тема-токен, НЕ инлайн-цвет. */}
        <Ui.Layout.Flex align="center" justify="center" minH={6}>
          <Ui.Typography
            variant="p"
            tone="destructive"
            size="sm"
            dim={!errorMessage()}
          >
            {errorMessage()}
          </Ui.Typography>
        </Ui.Layout.Flex>

        <Ui.Button meta={{ tags: ['submit'] }} fullWidth>
          {props.submitLabel ?? 'Войти'}
        </Ui.Button>

        <Ui.Flow.Show when={props.footerNote}>
          <Ui.Layout.Flex direction="col" align="center">
            <Ui.Typography variant="p" align="center" size="xs" tone="muted">
              {props.footerNote}
            </Ui.Typography>
          </Ui.Layout.Flex>
        </Ui.Flow.Show>
      </Ui.Card.Content>
    </Ui.Card>
  );
});

export default AuthLoginForm;
