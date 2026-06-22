#!/usr/bin/env node
// scope-identity.mjs — SessionStart hook: инжектит owner-identity в контекст сессии.
//
// Канон (2026-06-22): user запускает каждую сессию через `claude-scope.ps1 -Scope <name>`.
// CAPSULE_SCOPE env определяет роль:
//   - 'main' → architect (CLAUDE.md §🎯 описывает роль; хук кладёт лёгкий reminder).
//   - <package-leaf> → owner-<package> (claude.md написан под architect — нужен явный
//     identity-banner, иначе агент по умолчанию думает что он architect).
//   - пусто/невалидно → silent no-op (старый workflow без scope, fail-open).
//
// Контракт (Claude Code SessionStart):
//   stdin  = JSON { session_id, transcript_path, cwd, source, hook_event_name }
//   stdout = JSON { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }
//   exit 0 всегда. FAIL-OPEN: внутренняя ошибка → silent no-op.
//
// Subagents (Agent tool) НЕ триггерят SessionStart — их identity приходит из subagent_type
// system prompt'а. Это касается только top-level claude-сессий из claude-scope.

import { readFileSync } from 'node:fs';
import { resolveScope } from './scope-resolve.mjs';

function silent() {
  process.stdout.write('{}');
  process.exit(0);
}

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext,
      },
    }),
  );
  process.exit(0);
}

function architectBanner() {
  return [
    `# Session identity — CAPSULE_SCOPE=main (architect)`,
    ``,
    `Ты в роли **architect/main**. Правила в \`CLAUDE.md §🎯 Старт сессии\` + \`§🚨 POLICY\` — обязательно к прочтению перед первым действием.`,
    ``,
    `Коротко:`,
    `- Триаж запросов user → routing по \`docs/_meta/architect-routing.md\`.`,
    `- НЕ редактируй \`packages/*/src/\` сам. Делегируй owner-<pkg> агентам (Agent tool) либо пиши brief-файл, user сам запускает owner-сессию в отдельном scope.`,
    `- Cross-package coordination, ADR, контракты, релизы — твоя зона.`,
    `- Git: полный доступ (commit/push/merge/rebase) — \`.main-session-id\` marker даёт права.`,
    `- Subagent через Agent tool работают под gate, как и user-launched owner-сессии.`,
  ].join('\n');
}

function ownerBanner({ scope, packageName, relativePath, packagePath }) {
  return [
    `# Session identity — CAPSULE_SCOPE=${scope} (owner-${scope})`,
    ``,
    `Ты в роли **owner-${scope}**, владелец пакета \`${packageName}\`.`,
    ``,
    `**Ты НЕ architect.** CLAUDE.md написан под architect — игнорируй секции «для architect-agent / главный assistant», они не про тебя.`,
    ``,
    `## Зона ответственности (hard boundary, enforced governance.mjs)`,
    ``,
    `- **Path**: \`${relativePath}/\` (\`${packagePath}\`)`,
    `- **Package**: \`${packageName}\``,
    `- Edits разрешены ТОЛЬКО внутри этой зоны. Попытка править чужой пакет → governance.mjs deny.`,
    `- Перед первым Edit прочитай \`${relativePath}/OWNERSHIP.md\` (если есть) — ownership-gate enforced.`,
    ``,
    `## Правила`,
    ``,
    `- **НЕ пиши ADR**, не принимай cross-package решения, не делегируй другим owner — это зона architect. Если задача упирается в чужой пакет / контракт → STOP, верни state architect с конкретикой.`,
    `- **Git**: commit-only. Push/merge делает architect после ревью. См. memory \`feedback_agents_commit_only_user_pushes\`.`,
    `  - Conventional commits, scoped: \`feat(${scope}): ...\`, \`fix(${scope}): ...\`, \`refactor(${scope}): ...\`.`,
    `  - НЕ создавай topic-ветки в shared working tree без явного указания architect (\`feedback_no_topic_branches_parallel_work\`). Pre-commit hook block ≠ повод \`checkout -b\`.`,
    `- **POLICY** в CLAUDE.md priority 0 — никаких костылей, причина не следствие, эталон = код+тесты+доки.`,
    `- **Канон memory PRIORITY 0**: \`feedback_canon_modules_no_crutches\`, \`feedback_quality_over_speed_no_crutches\`, \`feedback_no_hypotheses_diagnose_with_tools\`.`,
    ``,
    `## Скоуп задачи`,
    ``,
    `Ждёшь от user либо brief-файл (\`docs/_meta/briefs/...\`), либо прямую задачу. Если непонятен scope — STOP, спроси architect / user. Не угадывай.`,
  ].join('\n');
}

function unresolvedBanner(scope) {
  return [
    `# Session identity — CAPSULE_SCOPE=${scope} (UNRESOLVED)`,
    ``,
    `**Aномалия**: scope "${scope}" не резолвится в пакет. claude-scope должен был блокировать запуск (fail-fast). Возможно скрипт устарел или scope опечатан.`,
    ``,
    `**Action**: STOP. Сообщи user что scope невалидный. НЕ начинай работу — нет zone boundary, нет ownership.`,
  ].join('\n');
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    silent();
    return;
  }
  void input;

  const scope = process.env.CAPSULE_SCOPE;
  if (!scope) {
    silent();
    return;
  }

  if (scope === 'main') {
    emit(architectBanner());
    return;
  }

  const resolved = resolveScope(scope);
  if (!resolved || resolved.kind !== 'package') {
    emit(unresolvedBanner(scope));
    return;
  }

  emit(ownerBanner(resolved));
}

try {
  main();
} catch {
  silent();
}
