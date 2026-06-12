/**
 * Cross-domain capability contracts.
 *
 * Subpath `@capsuletech/web-contract/capabilities` — leaf-протоколы для
 * cross-zone dependency-inversion (per ADR 047 D2). Запрещают runtime/boost
 * пакетам прямой import из domain'ов; consumer'ы импортят контракт здесь,
 * реализатор живёт в соответствующем domain-пакете.
 */
export type { IAuthCapability } from './auth';
