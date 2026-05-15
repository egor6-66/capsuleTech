interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  streaming?: boolean;
}

/**
 * Чисто UI чата — список сообщений + input + send. Хедер (с ModelPicker и
 * ссылками) живёт уровнем выше в Widget, чтобы не тянуть Widget-вложение
 * внутрь Entity (нарушение HCA: Entity не композит виджеты).
 */
const Main = Entity(({ List, Input, Button, Field }) => (
  <div class="flex flex-col h-full w-full bg-background text-foreground">
    <List
      meta={{ tags: ['messages'] }}
      items={[] as ChatMessage[]}
      class="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4"
    >
      {(msg: ChatMessage) => (
        <div
          class={
            msg.role === 'user'
              ? 'self-end max-w-[78%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-primary text-primary-foreground shadow-sm'
              : msg.role === 'tool'
                ? 'self-center max-w-[90%] rounded-md px-3 py-1.5 bg-muted/30 text-muted-foreground border border-border/40 text-xs font-mono'
                : 'self-start max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-2.5 bg-muted/60 text-foreground border border-border/50'
          }
        >
          <div class="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {msg.content}
            {msg.streaming ? (
              <span class="inline-block w-1.5 h-4 ml-1 bg-current/70 animate-pulse align-middle" />
            ) : null}
          </div>
        </div>
      )}
    </List>

    <Field
      orientation="horizontal"
      class="flex items-center gap-2 px-6 py-4 border-t border-border/60 bg-background/80 backdrop-blur"
    >
      <Input meta={{ tags: ['input'] }} placeholder="Спроси у агента…" class="flex-1" />
      <Button meta={{ tags: ['send'] }} variant="default">
        Отправить
      </Button>
    </Field>
  </div>
));

export default Main;
