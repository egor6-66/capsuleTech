/**
 * Реестр компонентов для превью-рендера пресетов (`<PresetPreview>`).
 *
 * Renderer резолвит `node.type` (dot-path, e.g. `ui.Button`, `ui.Layout.Flex`,
 * `ui.Card.Header`) по этому объекту. Это тот же shape, что канвас-апп отдаёт
 * как `registry={{ ui: Ui }}` — но собранный локально из web-ui subpath-экспортов
 * (в студии-хосте нет инъектированного kit'а; канвас живёт в remote-iframe).
 *
 * ⚠️ Fidelity превью ≠ канвасу: рендерится в host-теме (Tailwind-классы web-ui
 * app скан ит на своём уровне). Для ховер-превью достаточно; пиксель-в-пиксель
 * даёт remote-канвас. Дрейф: новый примитив в web-ui не появится в превью, пока
 * не добавлен сюда (осознанный локальный компромисс; будущее — агрегат в web-ui).
 */

import type { Registry } from '@capsuletech/web-renderer';
import { Button } from '@capsuletech/web-ui/button';
import { Card } from '@capsuletech/web-ui/card';
import { Field } from '@capsuletech/web-ui/field';
import { Group } from '@capsuletech/web-ui/group';
import { Icons } from '@capsuletech/web-ui/icons';
import { Input } from '@capsuletech/web-ui/input';
import { Label } from '@capsuletech/web-ui/label';
import { Layout } from '@capsuletech/web-ui/layout';
import { List } from '@capsuletech/web-ui/list';
import { Separator } from '@capsuletech/web-ui/separator';
import { Skeleton } from '@capsuletech/web-ui/skeleton';
import { Spinner } from '@capsuletech/web-ui/spinner';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Typography } from '@capsuletech/web-ui/typography';

// `as unknown as Registry`: рантайм-shape валиден (компоненты + namespace'ы
// компонентов Layout/Icons), но их nominal-интерфейсы (ILayoutNamespace и т.п.)
// не несут index-signature, которую требует структурный `Registry`. Каст —
// честный: resolvePath ходит по ключам объекта, а не по типу.
export const PREVIEW_REGISTRY = {
  ui: {
    Button,
    Card,
    Field,
    Group,
    Icons,
    Input,
    Label,
    Layout,
    List,
    Separator,
    Skeleton,
    Spinner,
    Toggle,
    Typography,
  },
} as unknown as Registry;
