---
tags: [english, lessons, for-teacher, contract, canon]
status: living — ЕДИНСТВЕННЫЙ источник форматов авторства (проверяй сюда, не в переписку)
author: architect
---

# Контракт авторства — форматы всех типов, копипаст-шаблоны

> [!important] Это живой справочник. Пишешь новый файл → бери шаблон ОТСЮДА
> (или копией из существующего файла vault той же папки). Если чего-то не
> хватает — вопрос в канал, я дополняю ЭТОТ файл. Переписка ≠ спека; спека — тут.

## Слово — `words/*.yaml` (формат SenseIn, как весь корпус рядом)

```yaml
# один файл = пачка записей; имя файла свободное (batch2.yaml)
- {word: table, lang: en_US, pos: noun, ru: "стол", pron_ru: "тэ́йбл",
   gloss: "a flat surface with legs you put things on",
   tags: [{name: object, kind: domain}, {name: everyday, kind: domain}]}
```

- `word:` (НЕ text), кавычки обычные `"…"` (НЕ «»), теги парами `{name, kind}`.
- `kind` ∈ domain / field / tier / phonetic / lexical.
- `level` НЕ ставим (CEFR-обогащение словаря — отдельная волна; L0–L5 живут
  на дриллах/уроках).
- `pos`: noun / verb / adjective / adverb / … (полные слова ок).
- Опционально: `image: "текст-образ"` (word-as-image, скоро кормит картинки).

## Дрилл — `drills/<grabo-tag>.md`

```markdown
---
id: tell-vs-speak            # = имя файла, kebab, навсегда
type: drill
title: "tell vs speak: кому и что"
level: L2                    # рукой, отдельно от уровня слов
tags: [vocabulary, verbs]
rule: grammar-verbs-tenses   # id существующего справочника
dimension: other             # НЕ про времена → other; про времена → УБРАТЬ строку
graboTag: tell-vs-speak
words: [tell, speak]         # только content-слова; все должны быть в словаре
items:
  - promptRu: "Расскажи мне о фильме."
    context: "Друг сходил в кино, просишь поделиться."   # для tense-дриллов обязателен маркер/контекст ВРЕМЕНИ
    answerEn: "Tell me about the movie."
    accept:
      - "Tell me about that movie."
    nearMiss:
      - match: contains      # default; regex — только когда contains не тянет
        pattern: "speak me"
        hint: "speak — «говорить вообще»; адресат+содержание — это tell: tell me about…"
---
# (тело — свободные заметки, importer его не парсит)
```

- **`dimension`:** дрилл про времена → строки НЕТ (валидатор требует маркер
  времени в promptRu/context). Не про времена → `dimension: other`.
- nearMiss-паттерны — в нижнем регистре (проверка нормализует).

## Концепт — `lessons/concepts/<name>.md`

```markdown
---
id: word-as-image
type: concept
title: "Слово — это образ, не перевод"
principle: "Учи образ и роль слова, а не пару слово-перевод."
tags: [mindset]
relatedRules: [grammar-verbs-tenses]   # опц.
---
Тело — проза, markdown (таблицы можно). Рендерится в аппе как есть.
```

## Урок — `lessons/<name>.md`

```markdown
---
id: pronouns-basics
type: lesson
title: "Местоимения: кто делает и над кем"
level: L1
tags: [grammar]
concepts: [word-as-image]              # упорядоченные списки = маршрут урока
rules: [grammar-pronouns]
drills: [subject-object-pronouns]
---
intro-текст (опционально, markdown).
```

## Правило — `grammar|phonetics|speech/*.md`

Только `type: rule` во frontmatter. `id` = имя файла, `title` = первый H1 тела.

## Чек-лист перед передачей раунда

1. Имена файлов = id, kebab, навсегда (без temp/wip).
2. Все `words[]` дриллов есть в словаре — недостающие кладёшь в `words/*.yaml`
   В ТОМ ЖЕ раунде.
3. Все ссылки (`rule`, `concepts`, `rules`, `drills`) — на существующие id.
4. Скоро будет самопроверка одной командой (dry-run importer'а — покажет все
   ошибки, не трогая базу); Егор сможет гонять её до передачи.
