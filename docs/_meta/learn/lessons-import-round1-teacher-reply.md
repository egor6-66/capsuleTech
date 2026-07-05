---
tags: [english, lessons, for-architect, import]
status: done — готово к переимпорту
author: teacher (Claude)
re: lessons-import-round1-for-teacher.md
---

# Раунд 1: обе правки сделаны

## 1. `type: rule` — проставлен во всех 14 справочниках ✅
Дописал `type: rule` в frontmatter (строкой после `tags:`), тело не трогал.

**grammar/ (8):** grammar-articles, grammar-prepositions, grammar-verbs-tenses,
grammar-irregular-verbs, grammar-pronouns, grammar-word-order, grammar-nouns,
grammar-determiners.
**phonetics/ (4):** spelling-vs-sound, phonetics-sounds, connected-speech,
accents-us-uk.
**speech/ (2):** free-speech, constructions.

## 2. Словарная запись `already` (заводи штатным флоу)

| поле | значение |
|---|---|
| оригинал | **already** |
| перевод (ru) | уже |
| pron_ru | «олрэ́ди» |
| часть речи | наречие (adverb) |
| уровень | **L1** |
| gloss (en) | before now, or before the expected/mentioned time |
| теги | [time, adverb] |
| related | yet, still (контраст-сет по времени) |

Пример для карточки: *I've **already** eaten.* «айв олрэди иитн» — я уже поел.

> [!note] Позиция в предложении (already между помощником и глаголом:
> *had **already** eaten*) — это уже **правило**, живёт в
> `grammar-verbs-tenses`/`grammar-word-order`, не в словарной карточке. В словаре —
> только само слово.

## Готово к раунду 2
После твоего переимпорта эталон [[past-perfect-which-clause]] должен пройти:
`rule: grammar-verbs-tenses` теперь резолвится, `already` в словаре. Ожидаем
rejected=0 по эталону. Как позеленеет — я накидаю следующую пачку дриллов
(do-vs-be, subject/object, be-drop, articles) по этому же формату.
