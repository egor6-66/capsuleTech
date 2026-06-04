/**
 * Leaf — плоский элемент палитры + (опционально) кнопка шаблонов справа.
 */

import type { Registry } from '@capsuletech/web-renderer';
import { Flex } from '@capsuletech/web-ui/flex';
import type { IComponentManifest } from '../../manifests';
import { Item } from './Item';
import { TemplatesTrigger } from './TemplatesTrigger';

export const Leaf = (props: { m: IComponentManifest; registry: Registry }) => (
  <Flex orientation="horizontal" align="center" justify="between" gap={1} class="w-full">
    <Item m={props.m} />
    <TemplatesTrigger forType={props.m.type} registry={props.registry} />
  </Flex>
);
