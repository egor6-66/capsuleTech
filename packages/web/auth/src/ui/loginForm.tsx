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

import { View } from '@capsuletech/web-core';
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
  return (
    <Ui.Layout.Flex class="min-h-screen items-center justify-center bg-background p-cell">
      <Ui.Card class="w-96 shadow-lg">
        <Ui.Card.Header class="border-b border-border">
          <Ui.Card.Title class="text-center text-lg font-semibold text-foreground">
            {props.title ?? 'Вход'}
          </Ui.Card.Title>
          <Ui.Flow.Show when={props.subtitle}>
            <Ui.Card.Description class="text-center text-sm text-muted-foreground">
              {props.subtitle}
            </Ui.Card.Description>
          </Ui.Flow.Show>
        </Ui.Card.Header>

        <Ui.Card.Content class="flex flex-col gap-cell p-cell">
          <Ui.Flow.For each={props.strategy.fields as IAuthFormField[]}>
            {(field: IAuthFormField) => (
              <Ui.Field>
                <Ui.Field.Label class="text-sm font-medium text-foreground">
                  {field.label}
                </Ui.Field.Label>
                <Ui.Field.Content class="mt-2">
                  <Ui.Flow.Show
                    when={field.type === 'select'}
                    fallback={
                      <Ui.Input
                        type={field.type === 'password' ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        // biome-ignore lint/suspicious/noExplicitAny: meta.tags — TypeScript JSX-fallback inference quirk
                        meta={{ tags: [field.tag] as any }}
                        class="w-full"
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

          <Ui.Button meta={{ tags: ['submit'] }} class="mt-cell w-full">
            {props.submitLabel ?? 'Войти'}
          </Ui.Button>

          <Ui.Flow.Show when={props.footerNote}>
            <Ui.Layout.Flex class="flex-col items-center">
              <Ui.Typography variant="p" class="text-center text-xs text-muted-foreground">
                {props.footerNote}
              </Ui.Typography>
            </Ui.Layout.Flex>
          </Ui.Flow.Show>
        </Ui.Card.Content>
      </Ui.Card>
    </Ui.Layout.Flex>
  );
});

export default AuthLoginForm;
