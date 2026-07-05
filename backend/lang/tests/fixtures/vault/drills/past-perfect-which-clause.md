---
id: past-perfect-which-clause
type: drill
title: "Past Perfect: на какой половине стоит had"
level: L3
tags: [grammar, past-perfect, which-clause, past-simple]
rule: grammar-verbs-tenses
concept: [word-as-image]
graboTag: past-perfect-which-clause
words: [eat, call, leave, come, already]
items:
  - promptRu: "Я уже поел, когда он позвонил."
    answerEn: "I had already eaten when he called."
    accept:
      - "I'd already eaten when he called."
      - "I had eaten when he called."
    nearMiss:
      - match: contains
        pattern: "did eat"
        hint: "«Поел» случилось РАНЬШЕ звонка → это Past Perfect (had + eaten), а не Past Simple."
      - match: regex
        pattern: 'had( already)? eat(ed)?\b'
        hint: "eat неправильный: причастие — eaten (не «eat»/«eated»). Нужно: had already eaten."
  - promptRu: "Он ушёл, когда я пришёл."
    context: "Ты пришёл на встречу — а его уже нет, он ушёл раньше тебя."
    answerEn: "He had already left when I came."
    accept:
      - "He'd already left when I came."
      - "He had left when I came."
    nearMiss:
      - match: contains
        pattern: "he left when"
        hint: "Без had «He left when I came» = ушёл В МОМЕНТ прихода. По контексту он ушёл РАНЬШЕ → Past Perfect: had left."
---

# Дрилл: Past Perfect — на какой половине стоит `had`

Тренирует один навык: `had` на том, что случилось РАНЬШЕ; точка-событие остаётся
в Past Simple.
