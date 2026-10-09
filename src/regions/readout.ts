import type { Asked } from '@lapxo/topos/capsule';
import { canonical, steps } from '@lapxo/topos/wire';
import { handedLines } from '../helpers/spec.ts';
import { verdictsOf } from '../helpers/verdict.ts';

/** The readout region. It answers, as lines a host parses and never as prose, everything the world read of an API, its verdict on each operation, and the ceilings it reads under. */
export const render = (asked: Asked): readonly string[] => [
  ...handedLines(asked).filter((line) => ['openapi', 'read', 'write'].includes(steps(line['scope'] ?? '')[0] ?? '')).map((line) => canonical({ ...line })),
  ...verdictsOf(asked).map((v) => canonical({ at: 'place:verdict', by: 'openapi', form: 'interval', measure: 'calls', role: 'reads', scope: `callable/${v.key}`, value: v.called ? '1..1' : '0..0' })),
].sort();
