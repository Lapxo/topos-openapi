import { value } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { byBytes } from '@lapxo/topos/wire';
import { handedOps } from './spec.ts';

export interface Verdict { readonly key: string; readonly method: string; readonly effect: readonly string[]; readonly classes: readonly string[]; readonly split: boolean; readonly called: boolean }

/**
 * The world's one judgment over the operations a region is handed. An operation's classes are the effect its method maps
 * to by the world's lines, or the unmapped word, together with every effect the document declares; when two readings
 * disagree on anything read of it — its method, its path, its parameters or what it declares — its one class is the split
 * word; one whose request holds a reference the world cannot follow, the unresolved word. It may be called only when its classes are exactly the callable one.
 */
export const verdictsOf = (asked: Asked): readonly Verdict[] => {
  const [callable, unmapped, split, unresolved] = ['callable', 'unmapped', 'split', 'unresolved'].map((word) => value(asked, `form/openapi/${word}`) ?? '') as [string, string, string, string];
  return [...handedOps(asked, 'openapi')].filter(([, op]) => op.fields['method'] !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, op]) => {
    const method = op.fields['method']?.join(', ') ?? '';
    const mapped = value(asked, `form/openapi/effect/${method}`);
    const effect = op.fields['declared'] ?? (mapped === undefined ? [] : [mapped]);
    const isSplit = op.split.size > 0;
    const classes = isSplit ? [split] : op.fields['unresolved-refs'] ? [unresolved] : [...new Set([mapped ?? unmapped, ...(op.fields['declared'] ?? [])])].sort(byBytes);
    return { key, method, effect, classes, split: isSplit, called: callable !== '' && classes.length === 1 && classes[0] === callable };
  });
};
