/**
 * CanvasFrame — iframe-shell для preview-области студио.
 *
 * Изолирует canvas от app'а: рендерит детей внутрь same-origin iframe'а,
 * зеркалит CSS (`<link rel=stylesheet>` + `<style>`) и темовые атрибуты
 * (`data-theme` + `dark`/`light` классы на `<html>`) из родителя. Solid JSX
 * рендерится через `<Portal mount={iframeBody}>` — JS-контекст остаётся
 * родительский, DOM — изолирован.
 *
 * ### Что даёт изоляция
 * - `data-theme`/`.dark` можно ставить на iframe'овский `<html>` независимо
 *   от глобальной темы апп'а через `theme`/`dark` пропы (canvas-only override).
 * - CSS-каскад не пересекает границу iframe'а: hover/focus стили из app-chrome
 *   не задевают preview, и наоборот.
 * - Глобальные body-mirror'ы (`.dark` на `<body>` для 3rd-party observer'ов
 *   и т.д.) не затрагивают canvas — у iframe свой body.
 *
 * ### Чего НЕ даёт
 * **Kobalte / Portal-based компоненты** монтируют popover'ы через
 * `document.body` JS-контекста — а контекст у нас родительский, значит popover
 * уезжает в app's body. Решается на следующей итерации через `<MountProvider>`
 * с `mount={iframeBody}`, который kit-обёртки будут консумить.
 *
 * ### Override semantics (theme / dark пропы)
 *
 * - `theme === undefined | null` — ось "inherit": iframe `<html>` получает
 *   `data-theme` от parent'а (через MutationObserver на parent's html),
 *   реактивно следует за глобальным `setTheme(...)`.
 * - `theme === string` — override активен: iframe получает указанное значение,
 *   parent'ские изменения по этой оси игнорируются.
 * - Аналогично для `dark` (`boolean` / `null|undefined`).
 *
 * Две оси независимы — можно override'нуть только тему, dark при этом
 * продолжит наследоваться от parent'а, и наоборот.
 *
 * ### Гонка инициализации (важно)
 *
 * `initIframe` вызывается ДВАЖДЫ — синхронно в `onMount` (если
 * `contentDocument.readyState === 'complete'`, типичный HMR-кейс с
 * пере-mount'ом существующего iframe) и через `load`-event (первичная
 * загрузка — sync ветка пропускается, listener срабатывает позже).
 *
 * Двойной запуск НЕ дедуплицируется намеренно: на первой загрузке синхронная
 * попытка может схватить ещё не до-инжекченные Vite-dev'ом CSS-`<style>` теги.
 * Повторный прогон по `load` чистит iframe'овский head (`innerHTML = ''`) и
 * пере-зеркалит уже полный набор. Это идемпотентно для setBody (то же ref →
 * Solid-signal не файрит) и безвредно для observer'ов (старые dispose'ятся
 * перед регистрацией новых).
 *
 * ### CSS-зеркалирование
 *
 * Vite-dev инжектит `import 'foo.css'` как JS-добавление `<style>` в `<head>`.
 * Build-mode эмитит `<link rel=stylesheet>`. Покрываем оба:
 * - копируем все актуальные `link[rel=stylesheet]` и `<style>` из parent.head;
 * - MutationObserver на parent.head ловит будущие добавления (HMR / late imports).
 *
 * Содержимое уже-существующих `<style>`-нод не отслеживается per-node
 * observer'ом — для тем не нужно (контент статичен). Если HMR начнёт мутировать
 * textContent у style-тегов и iframe увидит stale — добавим характ-observer.
 */

import { createEffect, createSignal, type JSX, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ICanvasFrameProps {
  /** Класс на iframe-элементе (для размеров / позиционирования). */
  class?: string;
  /** Контент, который рендерится внутрь iframe body через Portal. */
  children: JSX.Element;
  /**
   * Override `data-theme` на iframe `<html>`. `undefined`/`null` — inherit
   * (зеркалить parent'ский `<html data-theme>`). Строка — фиксированное
   * значение, parent игнорится по этой оси.
   */
  theme?: string | null;
  /**
   * Override dark-mode на iframe `<html>`. `undefined`/`null` — inherit
   * (зеркалить `.dark`/`.light` с parent'ского `<html>`). Boolean —
   * фиксированное значение (`true` → `.dark`, `false` → `.light`), parent
   * игнорится по этой оси.
   */
  dark?: boolean | null;
}

/**
 * Копирует `<link rel=stylesheet>` и `<style>` из `document.head` в iframe'овский
 * head + вешает MutationObserver на будущие добавления. Перед копированием чистит
 * `dstHead.innerHTML` — нужно для второго прогона `initIframe` (load-event):
 * первая (синхронная) попытка могла застать неполный набор стилей, второй прогон
 * заменяет всё на актуальный.
 */
const mirrorParentStyles = (dstDoc: Document): (() => void) => {
  const srcHead = document.head;
  const dstHead = dstDoc.head;

  const copyNode = (n: Node) => {
    if (n instanceof HTMLLinkElement && n.rel === 'stylesheet') {
      dstHead.appendChild(n.cloneNode(true));
    } else if (n instanceof HTMLStyleElement) {
      const clone = dstDoc.createElement('style');
      clone.textContent = n.textContent;
      dstHead.appendChild(clone);
    }
  };

  dstHead.innerHTML = '';
  for (const n of Array.from(srcHead.childNodes)) copyNode(n);

  const obs = new MutationObserver((muts) => {
    for (const m of muts) for (const n of Array.from(m.addedNodes)) copyNode(n);
  });
  obs.observe(srcHead, { childList: true });
  return () => obs.disconnect();
};

const readParentTheme = (): string | null => document.documentElement.getAttribute('data-theme');
const readParentDark = (): boolean => document.documentElement.classList.contains('dark');
const readParentLight = (): boolean => document.documentElement.classList.contains('light');

export const CanvasFrame = (props: ICanvasFrameProps): JSX.Element => {
  let frameEl!: HTMLIFrameElement;
  const [body, setBody] = createSignal<HTMLElement | null>(null);

  // Parent'ские атрибуты как сигналы — реактивный путь к effect'у ниже.
  // MutationObserver на parent.html их обновляет, override-логика читает
  // их только когда соответствующий prop === null/undefined (inherit-режим).
  const [parentTheme, setParentTheme] = createSignal<string | null>(
    typeof document !== 'undefined' ? readParentTheme() : null,
  );
  const [parentDark, setParentDark] = createSignal<boolean>(
    typeof document !== 'undefined' ? readParentDark() : false,
  );
  const [parentLight, setParentLight] = createSignal<boolean>(
    typeof document !== 'undefined' ? readParentLight() : false,
  );

  // Cleanup'ы хранятся в closure — initIframe пере-инициализирует style-mirror
  // на каждом прогоне, старый observer надо dispose'ить ДО регистрации нового.
  // Финальный onCleanup внизу зовёт их же при unmount'е компонента.
  let cleanupStyles: (() => void) | null = null;
  let cleanupParentObs: (() => void) | null = null;

  const initIframe = () => {
    const doc = frameEl.contentDocument;
    if (!doc) return;

    // Гасим дефолтный 8px-margin body и тянем html/body на 100% высоты —
    // wrapper-флекс внутри (`justify-center align-center`) рассчитывает на
    // полноразмерный контейнер.
    doc.body.style.margin = '0';
    doc.body.style.minHeight = '100%';
    doc.body.style.height = '100%';
    doc.documentElement.style.height = '100%';

    cleanupStyles?.();
    cleanupStyles = mirrorParentStyles(doc);

    // setBody с тем же ref'ом — Solid-signal не файрит, Portal остаётся
    // на месте. Это безопасный re-emit во втором прогоне initIframe.
    setBody(doc.body);
  };

  // Наблюдаем parent'ский `<html>` отдельно от initIframe — observer не зависит
  // от состояния iframe'а, parent attrs могут меняться когда iframe ещё грузится.
  const observeParentRoot = (): (() => void) => {
    const srcRoot = document.documentElement;
    const sync = () => {
      setParentTheme(srcRoot.getAttribute('data-theme'));
      setParentDark(srcRoot.classList.contains('dark'));
      setParentLight(srcRoot.classList.contains('light'));
    };
    const obs = new MutationObserver(sync);
    obs.observe(srcRoot, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => obs.disconnect();
  };

  onMount(() => {
    cleanupParentObs = observeParentRoot();
    // HMR-путь: iframe уже live (Solid пере-mount'ит компонент, но iframe
    // элемент тот же) → `load` больше не выстрелит, инициализируем синхронно.
    if (frameEl.contentDocument?.readyState === 'complete') {
      initIframe();
    }
    // Первичная загрузка: синхронная попытка пропускается (readyState !==
    // 'complete'), отрабатывает листенер. На HMR-пути listener тоже запустит
    // initIframe ещё раз — нам это нужно, см. header-doc «Гонка инициализации».
    frameEl.addEventListener('load', initIframe);
  });

  // Effect: применяем theme/dark к iframe `<html>` — переагрегируется при
  // изменении override-пропов ИЛИ parent-сигналов (для inherit-оси).
  // Body нужен только чтобы получить ownerDocument — пока body=null, эффект
  // ничего не делает.
  createEffect(() => {
    const b = body();
    if (!b) return;
    const dstRoot = b.ownerDocument.documentElement;

    // Theme axis: override === undefined/null → inherit (parentTheme).
    const themeOverride = props.theme;
    const themeValue = themeOverride != null ? themeOverride : parentTheme();
    if (themeValue) dstRoot.setAttribute('data-theme', themeValue);
    else dstRoot.removeAttribute('data-theme');

    // Dark axis: override === undefined/null → inherit (parentDark + parentLight).
    // С override'ом — binary: true → .dark, false → .light. Это слегка
    // лосси относительно parent'а (parent может иметь "ни .dark, ни .light"),
    // но для UX preview'я это семантически чище — toggle всегда даёт чёткий
    // визуальный результат.
    const darkOverride = props.dark;
    if (darkOverride != null) {
      dstRoot.classList.toggle('dark', darkOverride);
      dstRoot.classList.toggle('light', !darkOverride);
    } else {
      dstRoot.classList.toggle('dark', parentDark());
      dstRoot.classList.toggle('light', parentLight());
    }
  });

  onCleanup(() => {
    frameEl.removeEventListener('load', initIframe);
    cleanupStyles?.();
    cleanupParentObs?.();
  });

  return (
    <>
      <iframe
        ref={frameEl}
        class={props.class}
        title="capsule-canvas"
        style="display:block; width:100%; height:100%; border:0; background:transparent;"
      />
      {body() && <Portal mount={body() as HTMLElement}>{props.children}</Portal>}
    </>
  );
};
