import { createConversation, streamChat } from '../../services/agent-api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  streaming?: boolean;
}

const DEFAULT_MODEL = 'qwen2.5:14b';

const Main = Feature(() => {
  /**
   * Сообщения и conversationId живут в closure фичи, а не в ctx.data.
   * UI читает их через `store.patch(['messages'], { items: [...] })` —
   * UiProxy реактивно мержит patch в props у элемента с тегом 'messages'.
   *
   * Если бы держали в ctx.data, пришлось бы дублировать `store.update(...)`
   * вызов перед каждым patch — двойной канал ради того же эффекта.
   */
  let messages: ChatMessage[] = [];
  let conversationId: string | undefined;
  let model = DEFAULT_MODEL;

  const pushMessages = (store: any) => {
    store.patch(['messages'], { items: [...messages] });
  };

  return {
    initial: 'idle',
    states: {
      idle: {
        onInit: async ({ store: _store }: any) => {
          try {
            const conv = await createConversation();
            conversationId = conv.id;
          } catch (e) {
            console.error('[chat] createConversation failed', e);
          }

          // ModelPicker-фича бродкастит активную модель через CustomEvent —
          // см. memory/project_pending_cross_feature_pubsub.md. Это временное
          // решение, заменим на typed shared signal.
          window.addEventListener('capsule:model-change', (e) => {
            const detail = (e as CustomEvent<{ name: string }>).detail;
            if (detail?.name) model = detail.name;
          });
        },

        sendMessage: async ({ target, store }: any) => {
          const text = String(target.payload ?? '').trim();
          if (!text) return;

          messages = [
            ...messages,
            { role: 'user', content: text },
            { role: 'assistant', content: '', streaming: true },
          ];
          pushMessages(store);

          try {
            await streamChat({
              model,
              prompt: text,
              conversationId,
              onEvent: (ev) => {
                if (ev.type === 'token') {
                  const last = messages[messages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content += ev.content;
                    pushMessages(store);
                  }
                } else if (ev.type === 'tool_call') {
                  // Заменяем текущий пустой assistant маркером tool и заводим новый
                  // пустой assistant под ответ после возврата tool_result.
                  const last = messages[messages.length - 1];
                  if (last && last.role === 'assistant' && !last.content) {
                    messages = messages.slice(0, -1);
                  }
                  const argsPreview = JSON.stringify(ev.arguments ?? {}).slice(0, 80);
                  messages = [
                    ...messages,
                    { role: 'tool', content: `🔧 ${ev.name}(${argsPreview})` },
                    { role: 'assistant', content: '', streaming: true },
                  ];
                  pushMessages(store);
                } else if (ev.type === 'tool_result') {
                  // Подмешиваем хвост tool-маркера, чтобы было видно что вернулось.
                  for (let i = messages.length - 1; i >= 0; i--) {
                    const m = messages[i];
                    if (m.role === 'tool' && m.content.startsWith(`🔧 ${ev.name}`)) {
                      const preview = ev.result.slice(0, 200).replace(/\s+/g, ' ');
                      m.content = `${m.content} → ${preview}${ev.result.length > 200 ? '…' : ''}`;
                      break;
                    }
                  }
                  pushMessages(store);
                } else if (ev.type === 'done') {
                  const last = messages[messages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.streaming = false;
                    if (ev.final && !last.content) last.content = ev.final;
                  }
                  pushMessages(store);
                } else if (ev.type === 'error') {
                  const last = messages[messages.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = `❌ ${ev.message}`;
                    last.streaming = false;
                  }
                  pushMessages(store);
                }
              },
            });
          } catch (err) {
            console.error('[chat] streamChat failed', err);
            const last = messages[messages.length - 1];
            if (last && last.role === 'assistant') {
              last.content = `❌ ${String(err)}`;
              last.streaming = false;
              pushMessages(store);
            }
          }
        },
      },
    },
  };
});

export default Main;
