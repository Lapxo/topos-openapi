import { counted } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { verdictsOf } from '../helpers/verdict.ts';

/** The callable region. It answers the world's verdict as readings a host acts on: one per operation, one when it may be called, zero when it may not. */
export const receipt = (asked: Asked) => verdictsOf(asked).flatMap((v) => counted(asked, v.key, v.called ? 1 : 0, 'calls'));
