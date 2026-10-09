import { found, lang, listed, of, value } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { fill, handedOps, list, operationsOf, record, said, placeOf, sourceOf, specOf, stepOf, text } from '../helpers/spec.ts';
import type { Doc, Row } from '../helpers/spec.ts';
import { accessRows } from '../helpers/access.ts';

/** Each way an operation may be reached, as the document states it: one alternative per requirement, its schemes joined by +, an empty one anonymous (never none, the wire's empty set); a document that states none keeps it unstated. */
const needsOf = (v: unknown): readonly string[] | undefined => (Array.isArray(v) ? (v.length ? v.map((one) => Object.keys(record(one)).map(stepOf).sort().join('+') || 'anonymous') : ['anonymous']) : undefined);
const scopesOf = (v: unknown): readonly (string | undefined)[] => list(v).flatMap((one) => Object.values(record(one)).flatMap((scopes) => list(scopes).map(text)));
const flowsOf = (s: Doc): readonly (readonly [string, Doc])[] => Object.entries(record(s['flows'])).map(([name, flow]) => [name, record(flow)] as const);

const issuerOf = (s: Doc, doc: Doc, others: ReadonlyMap<string, Doc>): { readonly issuer?: string; readonly unresolved?: string } => ((ref) => {
  if (ref === undefined) return {};
  const [file = '', pointer = ''] = ref.split('#');
  const [target, at] = [file ? others.get(file.split('/').at(-1)!) : doc, pointer.split('/').slice(1)];
  return target !== undefined && at.length === 3 && at[0] === 'components' && at[1] === 'x-access' && record(record(target['components'])['x-access'])[at[2]!] !== undefined ? { issuer: stepOf(at[2]!) } : { unresolved: ref };
})(text(record(s['x-access'])['$ref']));

/**
 * How a source is reached and with what: its servers wherever its document declares them, each scheme by its type and
 * how access to it is obtained — the x-access it declares, a flow of the place it refers to by `$ref` (named unresolved
 * when none of the place's documents declares it), or the one its type implies — never its secret.
 */
export const rowsOf = (doc: Doc | undefined, source: string, others: ReadonlyMap<string, Doc> = new Map()): readonly Row[] => (doc === undefined ? [] : [
  ...Object.entries(record(record(doc['components'])['x-access'])).flatMap(([name, flow]) => [...said(`openapi/flow/${stepOf(name)}`, 'id', ['issuer']), ...accessRows({ 'x-access': flow }, source, stepOf(name))]),
  ...said(`openapi/issuers/${source}`, 'id', Object.keys(record(record(doc['components'])['x-access'])).map(stepOf)),
  ...said(`openapi/where/${source}`, 'id', [...new Set([doc, ...operationsOf(doc).flatMap((o) => [o.item, o.op])].flatMap((at) => list(at['servers']).map((one) => text(record(one)['url']))))]),
  ...Object.entries(record(record(doc['components'])['securitySchemes'])).flatMap(([name, raw]) => ((s, key) => [
    ...said(`openapi/auth/${key}`, 'id', [text(s['type'])]), ...said(`openapi/http/${key}`, 'id', [text(s['scheme'])?.toLowerCase()]),
    ...said(`openapi/carried/${key}`, 'id', [text(s['in']) && text(s['name']) ? `${text(s['in'])}:${text(s['name'])}` : text(s['scheme'])?.toLowerCase()]),
    ...said(`openapi/flows/${key}`, 'id', flowsOf(s).map(([flow]) => flow)),
    ...((by) => (by.issuer ? said(`openapi/issuer/${key}`, 'id', [by.issuer]) : by.unresolved ? said(`openapi/unresolved/${key}`, 'id', [by.unresolved]) : accessRows(s, source, key)))(issuerOf(s, doc, others)),
  ])(record(raw), `${source}/${stepOf(name)}`)),
  ...operationsOf(doc).flatMap((o) => [
    ...said(`openapi/needs/${source}/${o.key}`, 'id', needsOf(o.op['security'] ?? doc['security']) ?? []),
    ...said(`openapi/scopes/${source}/${o.key}`, 'id', scopesOf(o.op['security'] ?? doc['security'])),
  ]),
]);
export const observe = (bytes: Uint8Array, ...rest: readonly unknown[]): readonly Row[] => rowsOf(specOf(bytes), sourceOf(placeOf(rest)));

/** The auth region. It answers how the API is reached: every server, and every scheme by the kind the world's lines map it to. */
export const render = (asked: Asked): readonly string[] => {
  const [unknown, nothing] = ['unknown', 'nothing'].map((key) => of(found(asked, `prose/${lang(asked)}/${key}`), 'about')) as [string, string];
  const held = [...handedOps(asked, 'openapi')];
  const schemes = held.map(([key, op]) => [key, op.fields] as const).filter(([, f]) => f['auth'] !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const where = [...new Set([...listed(asked, 'openapi/where'), ...held.flatMap(([, op]) => op.fields['where'] ?? [])])].sort();
  return schemes.length || where.length ? [fill(asked, 'auth-heading', {}), '', ...where.map((url) => fill(asked, 'server', { url })),
    ...schemes.map(([scheme, f]) => ((type) => fill(asked, 'auth', { scheme, type, kind: value(asked, `form/openapi/auth/${type}`) ?? unknown, carried: (f['carried'] ?? [nothing]).join(', ') }))(f['auth']?.join(', ') ?? ''))] : [];
};
