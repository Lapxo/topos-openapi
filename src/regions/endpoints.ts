import { found, lang, of } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { fieldOf, fill, handedOps, list, operationsOf, record, resolved, said, placeOf, sourceOf, specOf, text, unresolvedOf } from '../helpers/spec.ts';
import type { Doc, Operation, Row } from '../helpers/spec.ts';

const success = (doc: Doc, op: Doc): Doc => ((codes) => resolved(doc, record(op['responses'])[codes[0] ?? '']))(Object.keys(record(op['responses'])).filter((code) => code.startsWith('2')).sort());
const schemaOf = (doc: Doc, holder: Doc): Doc => resolved(doc, Object.values(record(resolved(doc, holder)['content'])).map(record).find((media) => media['schema'] !== undefined)?.['schema']);
const propertiesOf = (doc: Doc, schema: Doc): readonly (readonly [string, Doc])[] => [...Object.entries(record(schema['properties'])).map(([name, p]) => [name, resolved(doc, p)] as const),
  ...[...list(schema['allOf']), ...list(schema['oneOf']), ...list(schema['anyOf'])].flatMap((one) => propertiesOf(doc, resolved(doc, one)))];
const shapeOf = (doc: Doc, op: Doc): { readonly type?: string; readonly fields: readonly string[] } => ((schema) => ({ type: text(schema['type']), fields: propertiesOf(doc, schema['items'] !== undefined ? resolved(doc, schema['items']) : schema).map(([name]) => name) }))(schemaOf(doc, success(doc, op)));
const paramsOf = (doc: Doc, o: Operation): readonly (string | undefined)[] => [...list(o.item['parameters']), ...list(o.op['parameters'])].map((p) => resolved(doc, p)).map((p) => (text(p['in']) && text(p['name']) ? `${text(p['in'])}:${text(p['name'])}` : undefined));
/** Every value a schema declares, by its path — an array's members under * — and its type; deeper than four steps, nothing more is declared. */
const typesOf = (doc: Doc, schema: Doc, at: string, depth: number): readonly string[] => {
  const type = text(schema['type']) ?? (schema['items'] !== undefined ? 'array' : schema['properties'] !== undefined || schema['allOf'] !== undefined ? 'object' : undefined);
  if (depth > 4 || type === undefined) return [];
  const here = at ? [`${at}:${type}`] : [];
  return type === 'array' ? [...here, ...typesOf(doc, resolved(doc, schema['items']), at ? `${at}/*` : '*', depth + 1)]
    : [...here, ...propertiesOf(doc, schema).flatMap(([name, p]) => typesOf(doc, p, at ? `${at}/${fieldOf(name)}` : fieldOf(name), depth + 1))];
};
const bodyOf = (doc: Doc, o: Operation): readonly (readonly [string, Doc])[] => propertiesOf(doc, schemaOf(doc, record(o.op['requestBody'])));

/** What each operation of a source is: its method, path, tags, parameters, the fields it is sent and which of them are secrets, and the shape it answers with, read from the document alone. */
export const rowsOf = (doc: Doc | undefined, source: string): readonly Row[] => (doc === undefined ? [] : [...said(`openapi/version/${source}`, 'id', [text(doc['openapi'])]), ...operationsOf(doc).flatMap((o) => ((shape, body, key) => [
  ...said(`openapi/method/${key}`, 'id', [o.method]), ...said(`openapi/path/${key}`, 'id', [o.path]),
  ...said(`openapi/tags/${key}`, 'id', list(o.op['tags']).map(text)), ...said(`openapi/params/${key}`, 'id', paramsOf(doc, o)),
  ...said(`openapi/body/${key}`, 'id', body.map(([name]) => name)), ...said(`openapi/secret/${key}`, 'id', body.filter(([, p]) => p['format'] === 'password').map(([name]) => name)),
  ...said(`openapi/returns/${key}`, 'id', [shape.type]), ...said(`openapi/response/${key}`, 'id', shape.fields),
  ...said(`openapi/answers/${key}`, 'id', typesOf(doc, schemaOf(doc, success(doc, o.op)), '', 0)), ...said(`openapi/unresolved-refs/${key}`, 'id', unresolvedOf(doc, [o.item['parameters'], o.op['parameters'], o.op['requestBody']])),
])(shapeOf(doc, o.op), bodyOf(doc, o), `${source}/${o.key}`))]);
export const observe = (bytes: Uint8Array, ...rest: readonly unknown[]): readonly Row[] => rowsOf(specOf(bytes), sourceOf(placeOf(rest)));

/** The endpoints region. At its first resolution it answers which regions the API has; past it, every form in each. */
export const render = (asked: Asked): readonly string[] => {
  const ops = [...handedOps(asked, 'openapi')].map(([key, op]) => [key, op.fields] as const).filter(([, f]) => f['method'] !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const [untagged, nothing] = ['untagged', 'nothing'].map((key) => of(found(asked, `prose/${lang(asked)}/${key}`), 'about')) as [string, string];
  const regions = [...new Set(ops.flatMap(([, f]) => f['tags'] ?? [untagged]))].sort();
  const inRegion = (tag: string) => ops.filter(([, f]) => (f['tags'] ?? [untagged]).includes(tag));
  if (!ops.length) return [];
  if (asked.at < 1) return [fill(asked, 'regions', {}), '', ...regions.map((tag) => fill(asked, 'region', { tag, count: String(inRegion(tag).length) }))];
  return [fill(asked, 'forms', {}), ...regions.flatMap((tag) => ['', fill(asked, 'region-heading', { tag }), ...inRegion(tag).map(([key, f]) =>
    fill(asked, 'form', { key, method: f['method']?.join(', ') ?? '', path: f['path']?.join(', ') ?? '', params: (f['params'] ?? [nothing]).join(', '), answers: [...(f['returns'] ?? []), ...(f['response'] ?? [])].join(' ') || nothing }))])];
};
