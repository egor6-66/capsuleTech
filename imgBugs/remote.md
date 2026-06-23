1. Архитектурный паттерн: Универсальная точка входа (Standalone vs Host)Чтобы модуль мог работать и сам по себе, и внутри хоста, мы разделяем экспорт для федерации (чистый компонент или Custom Element) и файл инициализации для standalone (index.tsx).Код для Remote (src/remote-entry.tsx — то, что экспортируем в Vite):tsximport { Component } from 'solid-js';

// Описываем строгий интерфейс контекста/пропсов, которые Host ОБЯЗАН передать
export interface RemoteModuleProps {
user: { name: string; token: string } | null;
theme: 'light' | 'dark';
onAction: (event: string, payload: any) => void;
baseUrl?: string; // Для изоляции API API
}

const RemoteApp: Component<RemoteModuleProps> = (props) => {
// ВНИМАНИЕ: В SolidJS нельзя деструктурировать props, иначе пропадет реактивность!
// Используем props.user() или props.theme напрямую в JSX.

return (
<div class="remote-container">
<h3>Ремоут-модуль</h3>
<p>Привет, {props.user?.name || 'Гость'}</p>
<button onClick={() => props.onAction('click_button', { time: Date.now() })}>
Клик в Хост
</button>
</div>
);
};

export default RemoteApp;
Используйте код с осторожностью.Код для Standalone (src/index.tsx — запускается только при npm run dev самого ремоута):tsximport { render } from 'solid-js/web';
import RemoteApp from './remote-entry';

// Создаем моковые данные, имитируя Host-приложение
const mockProps = {
user: { name: 'Иван (Standalone)', token: 'mock-token' },
theme: 'light' as const,
baseUrl: 'https://example.com',
onAction: (event: string, payload: any) => {
console.log(`[Standalone Log] Событие: ${event}`, payload);
}
};

const root = document.getElementById('root');
if (root) {
render(() => <RemoteApp {...mockProps} />, root);
}
Используйте код с осторожностью.2. Реализация изоляции CSS (Shadow DOM + SolidJS)Если Клод не знает, как засунуть Solid-компонент в Shadow DOM с сохранением реактивности пропсов и изоляцией стилей, покажите ему этот паттерн через @solidjs/custom-elements.Шаг 1: remote-компонент со встроенными стилямиВ Vite мы можем импортировать CSS как строку с помощью синтаксиса ?inline.tsximport { customElement } from '@solidjs/custom-elements';
import RemoteApp from './remote-entry';
// Импортируем стили как строку. Vite не вставит их в <head> хоста!
import styles from './styles.css?inline';

export function registerRemoteElement() {
// Проверяем, чтобы не зарегистрировать тег дважды
if (customElements.get('remote-module-element')) return;

customElement(
'remote-module-element',
{
// Регистрируем пропсы (они станут атрибутами HTML-тега)
// В веб-компонентах атрибуты всегда строки, поэтому сложные объекты передаем аккуратно
user: null,
theme: 'light',
baseUrl: ''
},
(props, { element }) => {
// Создаем функцию-мост для отправки событий наверх в Хост через CustomEvents
const dispatchAction = (name: string, detail: any) => {
element.dispatchEvent(new CustomEvent('remote-event', {
bubbles: true,
composed: true, // Позволяет событию пройти сквозь Shadow DOM
detail: { name, detail }
}));
};

      return (
        <>
          {/* Вставляем стили внутрь Shadow Root. Полная изоляция! */}
          <style>{styles}</style> 
          
          <div class="shadow-wrapper">
            <RemoteApp 
              user={typeof props.user === 'string' ? JSON.parse(props.user) : props.user}
              theme={props.theme as 'light' | 'dark'}
              baseUrl={props.baseUrl}
              onAction={dispatchAction}
            />
          </div>
        </>
      );
    }
);
}
Используйте код с осторожностью.Шаг 2: Использование на стороне HostХост просто загружает этот веб-компонент и слушает стандартные DOM-события.tsximport { onMount } from 'solid-js';

// Лениво импортируем функцию регистрации из ремоута
import('remote_app/CustomElementRegister').then((mod) => mod.registerRemoteElement());

function HostApp() {
let elementRef: HTMLElement | undefined;

onMount(() => {
// Слушаем события из Shadow DOM
elementRef?.addEventListener('remote-event', (e: any) => {
console.log('Данные из ремоута:', e.detail.name, e.detail.detail);
});
});

return (
<div>
<h1>Хост-приложение</h1>
{/* Используем кастомный тег. Все стили внутри него изолированы */}
<remote-module-element
ref={elementRef}
theme="dark"
user={JSON.stringify({ name: 'Алексей' })}
/>
</div>
);
}
Используйте код с осторожностью.3. Решение проблемы глобальных переменных и i18n/APIЕсли ремоуту нужны свои глобальные настройки (например, конфиг API, отличный от хоста), никогда не пишите их в window. Вместо этого используйте механизм Context в SolidJS.Создаем провайдер контекста внутри Ремоута (src/context.tsx):tsximport { createContext, useContext, ParentComponent } from 'solid-js';

interface RuntimeConfig {
apiUrl: string;
locale: string;
}

const ConfigContext = createContext<RuntimeConfig>();

export const RemoteConfigProvider: ParentComponent<{ config: RuntimeConfig }> = (props) => {
return (
<ConfigContext.Provider value={props.config}>
{props.children}
</ConfigContext.Provider>
);
};

export const useRemoteConfig = () => useContext(ConfigContext);
Используйте код с осторожностью.В корневом компоненте Ремоута вы просто оборачиваете всё приложение в <RemoteConfigProvider config={...}>. Значения для этого конфига вы можете прокидывать через те же props из Хоста (или из моков в standalone режиме). Таким образом, у Хоста будет свой контекст, а у Ремоута — свой собственный, изолированный.Чек-лист для Vite Config, который вы можете дать Клоду:Скажите Клоду настроить vite.config.ts для Ремоута следующим образом:typescriptimport { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { federation } from '@module-federation/vite';

export default defineConfig({
plugins: [
solidPlugin(),
federation({
name: 'remote_app',
filename: 'remoteEntry.js',
exposes: {
// Чистый компонент Solid
'./PureComponent': './src/remote-entry.tsx',
// Компонент, обернутый в Shadow DOM Custom Element
'./CustomElementRegister': './src/register-element.tsx',
},
shared: {
// Гарантируем синглтон рантайма SolidJS
'solid-js': { singleton: true, requiredVersion: '^1.8.0' },
},
}),
],
build: {
target: 'chrome89', // Важно для корректной работы ESM
}
});
Используйте код с осторожностью.Покажите эти куски кода Клоду и попросите его: «На основе этих паттернов (универсальный remote-entry, Shadow DOM обертка через ?inline стили и Context вместо window) напиши полную структуру файлов для моего проекта».Какую именно схему изоляции вы выберете для вашего проекта — чистый компонент в пропсах + CSS Modules или жесткий Shadow DOM? Напишите, и я помогу скорректировать инструкции для Клода под конкретный выбор.
