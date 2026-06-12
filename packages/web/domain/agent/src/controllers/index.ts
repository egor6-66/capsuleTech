/**
 * @capsuletech/web-agent/controllers
 *
 * HCA-АДАПТЕР — `Controllers.Agent`: FSM `idle → thinking → tool-call → done`,
 * управляемая через `useEmit` (ADR 032). Делает агента встраиваемым HCA-native:
 * UI-блоки (../ui) только эмиттят события, вся логика agent-loop'а — в Controller.
 *
 * Единственный subpath с зависимостью на `@capsuletech/web-core` (как
 * `/controllers` у web-ui-creator).
 *
 * TODO(owner-web-agent): реализовать AgentController (default export), завязать
 * на createAgentClient (../client) + реестр tools (../tools) + персону.
 * Зарегистрировать его в ../capsule.ts как `controllers: { Agent: AgentController }`.
 */

export {};
