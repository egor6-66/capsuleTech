/**
 * Info — 3-аккордионный композер info-панели студио. Stateless: получает
 * preset/type/manifest/contract через props (резолвит WebStudioInfo).
 *
 * Структура зеркалит `ComponentsPalette` — три отдельных `<Accordion>` блока,
 * каждый с одним `Accordion.Item`, обёрнутые в `<Flex wrap>`.
 *
 *   1. Контракт   — `<ContractBlock>`
 *   2. Манифест   — `<ManifestBlock>` (+ preset.description)
 *   3. Readme     — `<ReadmeBlock>` (placeholder)
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import { ContractBlock } from './ContractBlock';
import { ManifestBlock } from './ManifestBlock';
import { ReadmeBlock } from './ReadmeBlock';
import type { IInfoProps } from './types';

export const Info = (props: IInfoProps) => (
  <Flex wrap="wrap" w={'full'}>
    <Accordion defaultValue={['contract']} fluid={300} multiple>
      <Accordion.Item value="contract">
        <Accordion.Trigger>Контракт</Accordion.Trigger>
        <Accordion.Content>
          <ContractBlock contract={props.contract} type={props.type} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>

    <Accordion defaultValue={['manifest']} fluid={300} multiple>
      <Accordion.Item value="manifest">
        <Accordion.Trigger>Манифест</Accordion.Trigger>
        <Accordion.Content>
          <ManifestBlock
            manifest={props.manifest}
            preset={props.preset}
            type={props.type}
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>

    <Accordion defaultValue={[]} fluid={300} multiple>
      <Accordion.Item value="readme">
        <Accordion.Trigger>Readme</Accordion.Trigger>
        <Accordion.Content>
          <ReadmeBlock type={props.type} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  </Flex>
);
