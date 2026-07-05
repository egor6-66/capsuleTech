"""Drill checker — pure normalization + verdict logic (ADR 069 phase 2).

No network, no app: exercises `normalize` and `check_item` directly. The item
shape mirrors lang's DrillOut item (answerEn/accept/nearMiss), incl. the real
past-perfect эталон used in the brief acceptance check.
"""

from __future__ import annotations

import pytest

from capsule_learn.checker import check_item, normalize

# The real эталон item (backend/lang vault drill past-perfect-which-clause).
ITEM = {
    "promptRu": "Я уже поел, когда он позвонил.",
    "context": None,
    "answerEn": "I had already eaten when he called.",
    "accept": [
        "I'd already eaten when he called.",
        "I had eaten when he called.",
    ],
    "nearMiss": [
        {"match": "contains", "pattern": "did eat",
         "hint": "«Поел» случилось РАНЬШЕ звонка → это Past Perfect."},
        {"match": "regex", "pattern": r"had( already)? eat(ed)?\b",
         "hint": "eat неправильный: причастие — eaten."},
    ],
    "graboTag": None,
}


# --- normalization ----------------------------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("  I had eaten  ", "i had eaten"),          # trim + lowercase
        ("I HAD EATEN.", "i had eaten"),             # trailing period
        ("I had eaten?!", "i had eaten"),            # multiple final punct
        ("I  had   eaten", "i had eaten"),           # collapse whitespace
        ("I’d eaten", "i'd eaten"),             # curly apostrophe → '
        ("I`d eaten", "i'd eaten"),                  # backtick apostrophe → '
        ("I had eaten .", "i had eaten"),            # space before final punct
    ],
)
def test_normalize(raw, expected):
    assert normalize(raw) == expected


# --- correct ----------------------------------------------------------------


def test_correct_by_answer_en():
    # Surface noise (case, trailing period) is normalized away.
    assert check_item(ITEM, "i had already eaten when he called.", False) == {
        "verdict": "correct"
    }


def test_correct_by_accept_with_apostrophe():
    # Straight vs curly apostrophe both fold to the accept[] reference.
    assert check_item(ITEM, "I’d already eaten when he called", False) == {
        "verdict": "correct"
    }


# --- near_miss --------------------------------------------------------------


def test_near_miss_contains_first_pattern_wins():
    res = check_item(ITEM, "I did eat when he called", False)
    assert res["verdict"] == "near_miss"
    assert "Past Perfect" in res["hint"]


def test_near_miss_regex_catches_wrong_participle():
    # "had eated" → the regex nearMiss fires (contains pattern doesn't).
    res = check_item(ITEM, "I had eated when he called", False)
    assert res["verdict"] == "near_miss"
    assert "eaten" in res["hint"]


def test_regex_near_miss_does_not_touch_correct_eaten():
    # The correct "eaten" answer must not trip the `eat(ed)?\b` regex — it is
    # graded correct, never near_miss.
    assert check_item(ITEM, "I had already eaten when he called.", False)[
        "verdict"
    ] == "correct"


# --- wrong ------------------------------------------------------------------


def test_wrong_when_nothing_matches():
    assert check_item(ITEM, "totally unrelated sentence", False) == {"verdict": "wrong"}


# --- reveal -----------------------------------------------------------------


def test_reveal_echoes_answer_en_and_keeps_verdict():
    res = check_item(ITEM, "totally unrelated sentence", True)
    assert res["verdict"] == "wrong"
    assert res["answer"] == "I had already eaten when he called."


def test_reveal_on_correct_still_echoes_answer():
    res = check_item(ITEM, "I had eaten when he called.", True)
    assert res["verdict"] == "correct"
    assert res["answer"] == "I had already eaten when he called."
