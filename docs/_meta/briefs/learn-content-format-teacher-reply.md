# Ответ «учителя» по формату лексики — предложения

> Ответ на [[learn-content-format-teacher]]. База в наброске правильная: **sense как единица**, теги-группы, фасеты по одному значению, типизированные связи, синонимы через общий тег. Ниже — что добавить под **каноны обучения**, что подтянуть в таксономии, ответ про шкалу уровней и пример в рекомендованном формате.

## TL;DR

- Добавить поля: **`pron_ru`** (кириллица, primary для занятий), **`image`** (думать образами), **`examples` с фонетикой** (первоклассные, не «заметки»), **`collocations`**, **`forms`/`traits`** (морфология + флаги), **`connotation`+`intensity`** (различители синсета).
- Схлопнуть размытые виды тегов `semantic`/`context` → чёткие **`synset` / `field` / `domain` / `phonetic` / `lexical`**.
- **`level` = CEFR (A1–C2)**; наши L0–L5 («ядро/бытовуха/тематические/литературные/технические») — это **категория/сфера, не сложность** → увести в `domain`-теги.
- Связи резолвить **на sense, не на слово-строку**; в формате — глосса-дизамбигуатор.
- Кормить **YAML-блоками на значение** (не плоский CSV) — вложенность + кириллица + git-diff + совпадает с `concept.md`.

---

## 1. Чего не хватает под метод обучения (must-add)

| поле | зачем (канон) |
|---|---|
| **pron_ru** (кириллица) | Кириллический костыль — **primary для занятий**, IPA вторичен (нужен голосовому модулю). В наброске только IPA — разрыв с методом. Нужны **оба**: `pron_ru: "хэпи"` + `ipa` опц. |
| **image / hook** | Метод = **думать образами** (концепт↔слово без русского). В модели аппа `Word.image` был — в наброске потерялся, вернуть. |
| **examples — первоклассные, с фонетикой** | Слово учится **в контексте**, не голой леммой. У **каждого** примера — своя фонетика (без неё пример бесполезен). `examples: [{text, pron_ru, ru}]`. |
| **collocations** | Слова учатся **чанками** (make a *decision*). Нужно для кейса «свап без слома контекста»: нельзя свапнуть, не зная сочетаемости. Список + связь на `Construction`/`Phrase`. |
| **forms (морфология)** | Неправильные формы надо **хранить** (правильные авто-сгенерит `lang`): `child→children`, `sleep→slept`, `big→bigger`. `forms: {plural / past / participle / comparative…}` + флаги `traits: [irregular, countable, transitive]`. |
| **connotation + intensity** | Главный пробел для свапа: `synset:big` группирует big/huge/massive, но НЕ говорит, чем отличаются. Различают их **окраска** (positive/neutral/negative) и **сила** (warm→hot→scorching). Без этих полей свап вслепую. |

## 2. Таксономия тегов — подтянуть (анти-раздутие)

Сейчас `semantic` / `context` / `domain` пересекаются: в примере `bank(река)` помечен `nature (domain)` И `geography (semantic)` для одного значения — путает. Предлагаю непересекающиеся виды:

- **synset** — только группа взаимозаменяемых значений (бывший `semantic`; переименовать).
- **field** (смысловое поле) — широкая область смысла: emotion, nature, motion, time *(сюда сливается `context`)*.
- **domain** — специальный регистр/сфера: tech, finance, medical.
- **phonetic** — звуковые фичи (θ, ð, flap).
- **lexical** — грамматические.

Было 5 размытых → 5 ортогональных. Раздельные `semantic` и `context` — лишнее.

## 3. Шкала уровней (ответ на вопрос) — де-конфликт

Наши **L0–L5** («ядро / бытовуха / тематические / литературные / технические») — это **категория/сфера, НЕ сложность**. А фасет `level` должен быть про сложность. Их склеили.

- **`level` = CEFR (A1–C2)** — стандарт, бьётся с готовыми списками (Oxford 3000/5000, CEFR-J) и автооценкой (`wordfreq`/`textstat`). Храним CEFR.
- **L0–L5** → разносим в `domain`/`tier`-теги (core/everyday/thematic/literary/technical).

Так слово может быть `A2` по сложности и `technical` по сфере одновременно (сейчас конфликтует).

## 4. Связи — на SENSE, не на строку

`antonym → sad` неоднозначно: `sad` тоже многозначно. Раз единица — sense, связь резолвится в **значение**. Для MVP строка ок, но заложить **глоссу**: `antonym → sad (not happy)`.

## 5. Формат отдачи — YAML по-значению

Вложенность (теги, связи, **несколько примеров**) + тяжёлая кириллица → CSV размажет. Рекомендую **YAML-блоки на каждое значение** (или markdown + YAML-фронтматтер): держит вложенность, кириллица-safe, git-diff-able, **совпадает с форматом `concept.md`** (один переходник на оба). CSV — только под bulk-простые слова.

## 6. Пример (рекомендованный формат; **комментарии — добавки к наброску**)

```yaml
- word: happy
  lang: en_US
  gloss: feeling or showing pleasure
  pos: adjective
  level: A1                      # CEFR
  register: neutral
  frequency: high
  pron_ru: "хэпи"                # ← primary для занятий
  ipa: /ˈhæpi/
  image: "улыбка до ушей, солнечно внутри"   # ← думать образами
  connotation: positive          # ← различитель синсета
  intensity: 2                   # ← glad(1)→happy(2)→ecstatic(4)
  forms: {comparative: happier, superlative: happiest}
  synset: glad
  nuance: "базовое повседневное «рад/счастлив»"
  tags:
    - {name: emotion, kind: field}
  relations:
    - {type: antonym, target: "sad (not happy)"}   # ← на sense + глосса
  collocations: ["happy with", "happy to (do sth)"]
  examples:
    - {text: "I'm happy with it.", pron_ru: "айм хэпи уиз ит", ru: "я доволен"}

- word: drive
  lang: en_US
  gloss: operate a motor vehicle
  pos: verb
  level: A1
  register: neutral
  frequency: high
  pron_ru: "драйв (-ing «драйвин»)"
  ipa: /draɪv/
  image: "руки на руле, дорога летит навстречу"
  forms: {past: drove, participle: driven}    # ← irregular
  traits: [irregular, transitive]              # ← морфо-флаги
  valency: "глагол несёт транспорт = авто; объект 'car' опускается"   # ← инсайт обучения
  synset: operate
  tags:
    - {name: motion, kind: field}
    - {name: transport, kind: domain}
  collocations: ["drive to (place)", "drive a car"]
  examples:
    - {text: "I'm driving right now.", pron_ru: "айм драйвин райт нау", ru: "я за рулём"}
```

---

## Что от вас (для следующего захода)

1. Ок ли расширить поля (особенно `pron_ru`, `image`, `examples` с фонетикой) — это критично для метода.
2. Принять CEFR для `level` + увод L0–L5 в `domain`/`tier`.
3. Подтвердить YAML-блоки как основной формат отдачи (+ ваш переходник).
4. Связи: на MVP строка с глоссой ок, или сразу резолвить в sense-id?

Дальше зафиксируем как канон и поедем наполнять.
