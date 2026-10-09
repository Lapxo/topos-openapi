import { value } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { canonical, steps } from '@lapxo/topos/wire';
import { handedLines, handedOps } from '../helpers/spec.ts';
import { verdictsOf } from '../helpers/verdict.ts';

type Fields = Readonly<Record<string, readonly string[]>>;
const line = (scope: string, measure: string, values: readonly string[] | undefined): readonly string[] =>
  values?.length ? [canonical({ at: 'place:openapi', by: 'openapi', form: 'alphabet', measure, role: 'writes', scope, value: values.join('|') })] : [];
const each = (scope: string, f: Fields, fields: Readonly<Record<string, string>>): readonly string[] => Object.entries(fields).flatMap(([measure, field]) => line(scope, measure, f[field]));

/** The fields a scheme's access flow is said in, each a line under keys/access/<source>/<scheme>[/inputs|steps/…]: the place vocabulary, never a kind. */
const FLOW = ['issuer', 'unresolved', 'attach-in', 'attach-name', 'attach-template', 'token', 'expires', 'asks', 'ask', 'ttl', 'from', 'label', 'id', 'source', 'operation', 'url', 'page', 'method', 'encoding', 'when', 'value', 'items'] as const;

/**
 * The place region. It answers, as lines a host parses and never as prose, the place a source compiles to: where it may
 * be reached, each way access to it is proven — by kind and parameters, never a secret — and every operation it offers,
 * its class by the world's verdict, the form it is asked in and what only a transport reads. Ceilings the world reads
 * under are handed through as they stand. What an overlay made different carries the overlay's digest.
 */
export const render = (asked: Asked): readonly string[] => {
  const held = [...handedOps(asked, 'openapi')];
  const schemes = held.filter(([, op]) => op.fields['auth'] !== undefined || op.fields['flow'] !== undefined).map(([key]) => key);
  const verdicts = new Map(verdictsOf(asked).map((v) => [v.key, v]));
  const unstated = value(asked, 'form/openapi/unstated');
  const derived = handedOps(asked, 'overlaid');
  const from = (scope: string, key: string) => line(scope, 'overlay', derived.has(key) ? [...new Set(Object.values(derived.get(key)!.fields).flat())].sort() : []);
  return [...new Set([
    ...held.filter(([, op]) => ['where', 'overlays', 'issuers', 'unparsed', 'documents', 'unsupported', 'collision'].some((field) => op.fields[field] !== undefined)).flatMap(([source, op]) => [...line(`region/${source}`, 'origins', op.fields['where']),
      ...['unparsed', 'documents', 'unsupported', 'collision', 'unresolved-refs'].flatMap((field) => line(`region/${source}`, field, op.fields[field])),
      ...line(`region/${source}`, 'issuers', op.fields['issuers']), ...line(`region/${source}`, 'overlays', op.fields['overlays']), ...line(`region/${source}`, 'overlays-refused', op.fields['overlays-refused'])]),
    ...held.filter(([key]) => schemes.some((scheme) => key === scheme || key.startsWith(`${scheme}/`))).flatMap(([key, { fields: f }]) => [
      ...from(`keys/access/${key}`, key), ...(f['auth'] !== undefined ? line(`keys/access/${key}`, 'type', [[...(f['auth'] ?? []), ...(f['http'] ?? []), ...(f['flows'] ?? [])].join('/')]) : []),
      ...FLOW.flatMap((field) => line(`keys/access/${key}`, field, f[field])),
    ]),
    ...held.filter(([key]) => verdicts.has(key)).flatMap(([key, { fields: f }]) => [
      ...from(`offers/${key}`, key), ...line(`offers/${key}`, 'class', verdicts.get(key)!.classes), ...line(`offers/${key}`, 'access', f['needs'] ?? (unstated === undefined ? [] : [unstated])),
      ...each(`offers/${key}`, f, { scopes: 'scopes', tags: 'tags', 'unresolved-refs': 'unresolved-refs' }),
      ...each(`offers/${key}/form`, f, { params: 'params', body: 'body', secret: 'secret' }), ...line(`offers/${key}/form`, 'answers', [...(f['returns'] ?? []), ...(f['response'] ?? [])]),
      ...each(`offers/${key}/carry`, f, { method: 'method', path: 'path', idempotency: 'idempotency' }),
    ]),
    ...handedLines(asked).filter((one) => ['read', 'write'].includes(steps(one['scope'] ?? '')[0] ?? '')).map((one) => canonical({ ...one })),
  ])].sort();
};
