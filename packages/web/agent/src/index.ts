// Корневой barrel — реэкспорт логических блоков. Для tree-shaking
// предпочтительно импортировать через подпуть:
//   import { createAgentClient }  from '@capsuletech/web-agent/client';
//   import { defineAgentTool }    from '@capsuletech/web-agent/tools';
//   import { defineAgentPersona } from '@capsuletech/web-agent/personas';
// UI (/ui) и HCA-адаптер (/controllers) намеренно НЕ в barrel — тянутся
// отдельными subpath'ами (headless-апп берёт только логику).

export * from './client';
export * from './personas';
export * from './tools';
