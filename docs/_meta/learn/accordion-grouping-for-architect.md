---
tags: [english, lessons, for-architect, ui, ia]
status: proposal — на обсуждение
author: teacher (Claude)
re: platform-context-for-teacher.md, authoring-contract-for-teacher.md
---

# Группировка Rules и Concepts в аккордеон

> [!abstract] Списки правил и концептов — плоские; растут, тонут. Решение: аккордеон
> для ОБЕИХ вкладок. Классификацию задаю Я во frontmatter (единый источник) —
> ваша сторона рендерит группы из поля, логики распределения у вас нет.

## Принцип: разбивка = данные, не код
- **Учитель проставляет категорию/тип во frontmatter** каждого файла.
- **Апп группирует по полю** и сортирует по `order`. Порядок самих групп и их
  ru-подписи — на стороне аппа (маленький стабильный маппинг).
- Ни один rule/concept не «распределяется» кодом — только читается его поле.

## Rules → аккордеон по ДОМЕНУ
Новое поле `category` + `order` во frontmatter правила. Домены = папки vault.

| category (машинное) | ru-подпись (UI) | order-группы |
|---|---|:--:|
| `phonetics` | Фонетика / Звук | 1 |
| `grammar` | Грамматика | 2 |
| `speech` | Речь / живой язык | 3 |

**Стартовая раскладка (это и есть «разбивка с меня»):**

| файл (id) | category | order |
|---|---|:--:|
| phonetics-sounds | phonetics | 10 |
| connected-speech | phonetics | 20 |
| spelling-vs-sound | phonetics | 30 |
| accents-us-uk | phonetics | 40 |
| grammar-word-order | grammar | 10 |
| grammar-articles | grammar | 20 |
| grammar-determiners | grammar | 25 |
| grammar-prepositions | grammar | 30 |
| grammar-nouns | grammar | 40 |
| grammar-pronouns | grammar | 50 |
| grammar-verbs-tenses | grammar | 60 |
| grammar-irregular-verbs | grammar | 70 |
| constructions | speech | 10 |
| free-speech | speech | 20 |

## Concepts → аккордеон по ПРИРОДЕ совета (не по домену!)
Концепт не про тему, он про **тип guidance**. Поэтому группируем иначе — поле `kind`
+ `order`.

| kind (машинное) | ru-подпись | что это | order-группы |
|---|---|---|:--:|
| `approach` | Подход | КАК работать со словом/языком | 1 |
| `pattern` | Паттерн | mental-модель структуры языка | 2 |
| `recommendation` | Рекомендация | совет, не абсолют | 3 |

**Стартовая раскладка** (⚠️ пока существует только `word-as-image`, остальное —
дорожная карта, наполню файлами по ходу):

| концепт (id) | kind | order | статус |
|---|---|:--:|---|
| word-as-image | approach | 10 | есть |
| word-families-bridge (resist←резистор) | approach | 20 | TBD |
| two-axes-tense-aspect (время × вид) | pattern | 10 | TBD |
| phrase-three-slots (подлежащее+помощник+форма) | pattern | 20 | TBD |
| anchor-and-reach (выбор времени: якорь + дотяг) | pattern | 30 | TBD |
| chunks-take-whole (чанки берём целиком) | pattern | 40 | TBD |
| always-a-verb-be (нет действия → be) | pattern | 50 | TBD |
| learn-with-songs (учи по песням/фильмам) | recommendation | 10 | TBD |
| phonetics-from-day-one | recommendation | 20 | TBD |
| production-not-choice (собирай сам) | recommendation | 30 | TBD |
| revisit-your-slips (возврат к граблям) | recommendation | 40 | TBD |

Пример логики: «учи по песням» — **рекомендация** (совет); «слово = образ» —
**подход** (метод); «оси время/вид» — **паттерн** (модель). Ровно как ты и разложил.

## Изменения авторства (в [[authoring-contract-for-teacher]])
- **Rule frontmatter:** добавить `category: phonetics|grammar|speech` + `order: <int>`.
- **Concept frontmatter:** добавить `kind: approach|pattern|recommendation` + `order: <int>`.
- **Убрать нумерацию из заголовков.** Сейчас title = H1 тела вида «5d. Глаголы и
  времена» — это легаси имён файлов, протекло в UI. Порядок теперь несёт `order`,
  тему — группа. H1 почищу до «Глаголы и времена». (Сделаю по всем rule-файлам,
  когда подтвердишь поля.)

## UX-нюансы (на ваше усмотрение)
- **Concepts — группы развёрнуты по умолчанию.** Концепты читаются подряд как путь;
  свёрнутый аккордеон прячет маршрут. Rules можно сворачивать (это lookup).
- Подзаголовок под именем группы (1 строка «что это») — помогает, особенно для
  концептов (Подход/Паттерн/Рекомендация не самоочевидны).

## Баги рендера (со скрина вкладки Rules — поправите)
1. **Callout не парсится:** `> [!info] …` выводится텍스том «[!info] …». Либо
   поддержать Obsidian-callout (`[!info]/[!warning]/[!tip]/[!note]`), либо скажи —
   перестану их использовать в теле правил и заменю обычными блоками.
2. **H1 задвоился:** заголовок страницы + H1 в теле дублируются. Показывать что-то
   одно (или H1 в теле не рендерить, раз он = title).

## Вопросы
1. Поля `category/order` (rule) и `kind/order` (concept) — принимаем имена/значения?
2. ru-подписи групп и порядок групп держим в аппе (не в контенте) — ок?
3. `kind` — трёх хватает, или добавим 4-й (напр. `trap` — ловушки L1-интерференции)?
   Пока разложил в три; скажешь — заведу отдельный тип под грабли-осознавалки.
