import { found, lang, of } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { fill, list, operationsOf, said, placeOf, sourceOf, specOf, text } from '../helpers/spec.ts';
import type { Doc, Row } from '../helpers/spec.ts';
import { verdictsOf } from '../helpers/verdict.ts';

const declaredOf = (v: unknown): readonly (string | undefined)[] => (typeof v === 'string' ? [v] : list(v).map(text));

/** The effects an operation declares beyond its method, and the header it takes an idempotency key in, as the document states them: declarations, never proofs. */
export const rowsOf = (doc: Doc | undefined, source: string): readonly Row[] => (doc === undefined ? [] : operationsOf(doc).flatMap((o) => [
  ...said(`openapi/declared/${source}/${o.key}`, 'id', declaredOf(o.op['x-effects'])), ...said(`openapi/idempotency/${source}/${o.key}`, 'id', [text(o.op['x-idempotency'])])]));
export const observe = (bytes: Uint8Array, ...rest: readonly unknown[]): readonly Row[] => rowsOf(specOf(bytes), sourceOf(placeOf(rest)));

/** The effects region. It answers, for each operation, its effect and whether the world lets a host call it. */
export const render = (asked: Asked): readonly string[] => {
  const words = (key: string): string => of(found(asked, `prose/${lang(asked)}/${key}`), 'about');
  const verdicts = verdictsOf(asked);
  return verdicts.length ? [fill(asked, 'effects', {}), '', ...verdicts.map((v) => fill(asked, 'effect', { key: v.key, method: v.method, effect: v.effect.length ? v.effect.join(', ') : words('unknown'), status: words(v.split ? 'split' : v.called ? 'called' : 'listed') }))] : [];
};
