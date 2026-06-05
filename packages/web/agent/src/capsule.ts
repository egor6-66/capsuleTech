/**
 * @capsuletech/web-agent/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-agent']
 *
 * После регистрации (когда блоки готовы) будут доступны глобалы:
 *   - `Agent.Panel`        → components (чат-панель из ../ui)
 *   - `Controllers.Agent`  → controllers (AgentController из ../controllers)
 *
 * Имя 'Agent' — не JS-builtin (см. web-core/module: имя не должно совпадать
 * с Map/Set/Date/… иначе TS2451 в packages.d.ts).
 *
 * TODO(owner-web-agent): заполнить components/controllers, когда ../ui и
 * ../controllers реализованы.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';

export default defineCapsuleModule({
  name: 'Agent',
  components: {
    // Panel: AgentPanel, // TODO(owner-web-agent)
  },
  // controllers: { Agent: AgentController }, // TODO(owner-web-agent)
});
