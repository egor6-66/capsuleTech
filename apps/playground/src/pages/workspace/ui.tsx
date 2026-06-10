/**
 * /workspace/ui — превью финиш-мода.
 *
 * Сетка карточек для проверки эффекта «Finish»: переключи тоггл «Finish»
 * в меню темы (хедер) — surface-примитивы (Card) получат стеклянный финиш
 * (градиент-поверхность + верхний hairline + цветная глубина). Контраст
 * текста должен сохраниться в обоих состояниях.
 */
const UiSection = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-section p-section">
    <Ui.Layout.Flex class="flex-col gap-tight">
      <Ui.Typography variant="h3" class="text-xl font-semibold text-foreground">
        UI — Finish preview
      </Ui.Typography>
      <Ui.Typography variant="p" class="text-muted-foreground">
        Переключи «Finish» в меню темы (хедер) — карточки получат стеклянный финиш.
      </Ui.Typography>
    </Ui.Layout.Flex>

    <Ui.Layout.Flex class="flex-wrap gap-cell">
      <Ui.Card class="w-72">
        <Ui.Card.Header>
          <Ui.Card.Title>Поверхность</Ui.Card.Title>
          <Ui.Card.Description>Градиент + hairline-кромка</Ui.Card.Description>
        </Ui.Card.Header>
        <Ui.Card.Content>
          <Ui.Typography variant="p" class="text-sm text-muted-foreground">
            Базовая карточка для проверки финиша и контраста текста.
          </Ui.Typography>
        </Ui.Card.Content>
      </Ui.Card>

      <Ui.Card class="w-72">
        <Ui.Card.Header>
          <Ui.Card.Title>Глубина</Ui.Card.Title>
          <Ui.Card.Description>Мягкое цветное свечение</Ui.Card.Description>
        </Ui.Card.Header>
        <Ui.Card.Content>
          <Ui.Layout.Flex class="flex-col gap-tight">
            <Ui.Typography variant="p" class="text-sm text-muted-foreground">
              Тинт следует активной палитре.
            </Ui.Typography>
            <Ui.Button class="w-full">Действие</Ui.Button>
          </Ui.Layout.Flex>
        </Ui.Card.Content>
      </Ui.Card>

      <Ui.Card class="w-72">
        <Ui.Card.Header>
          <Ui.Card.Title>Панели</Ui.Card.Title>
          <Ui.Card.Description>Select-панель тоже с финишем</Ui.Card.Description>
        </Ui.Card.Header>
        <Ui.Card.Content>
          <Ui.Select
            options={[
              { value: 'a', label: 'Вариант A' },
              { value: 'b', label: 'Вариант B' },
              { value: 'c', label: 'Вариант C' },
            ]}
            defaultValue="a"
            placeholder="Выбери…"
          />
        </Ui.Card.Content>
      </Ui.Card>
    </Ui.Layout.Flex>
  </Ui.Layout.Flex>
));

export default UiSection;
