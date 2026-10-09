import { found, lang, listed, of } from '@lapxo/topos/capsule';
import type { Asked, Handed } from '@lapxo/topos/capsule';
import { alphabet, byBytes, steps } from '@lapxo/topos/wire';
import { parse } from 'yaml';

export type Doc = Readonly<Record<string, unknown>>;
export type Row = { readonly scope: string; readonly measure: string; readonly role: 'reads'; readonly bound: { readonly kind: 'enumerated'; readonly values: readonly string[] } };
export interface Operation { readonly key: string; readonly method: string; readonly path: string; readonly item: Doc; readonly op: Doc }

export const record = (v: unknown): Doc => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Doc : {});
export const list = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
export const text = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
export const said = (scope: string, measure: string, values: readonly (string | undefined)[]): readonly Row[] =>
  ((held) => (held.length ? [{ scope, measure, role: 'reads', bound: { kind: 'enumerated', values: held } }] : []))([...new Set(values.filter((one): one is string => one !== undefined && one !== ''))].sort());

export const documentOf = (textOf: string): Doc | undefined => {
  const read = (decode: (t: string) => unknown): Doc | undefined => { try { return ((v) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Doc : undefined))(decode(textOf)); } catch { return undefined; } };
  return read(JSON.parse) ?? read((t) => parse(t, { maxAliasCount: 100, uniqueKeys: true }));
};
/** Why bytes that say they are an OpenAPI document hold none: the first line of what the parser answered; nothing for bytes that parse, or never said so. */
export const unparsedOf = (textOf: string): string | undefined => {
  if (documentOf(textOf) !== undefined || !/^\s*["']?openapi["']?\s*:/m.test(textOf)) return undefined;
  try { parse(textOf, { maxAliasCount: 100, uniqueKeys: true }); return undefined; } catch (e) { return (e as Error).message.split('\n')[0]!.replace(/\|/g, '/').replace(/:$/, ''); }
};
export const isSpec = (doc: Doc | undefined): doc is Doc => doc !== undefined && /^3\.[01]\.\d+$/.test(text(doc['openapi']) ?? '');
export const profileOf = (doc: Doc | undefined): string | undefined => (text(doc?.['openapi']) !== undefined ? `openapi ${text(doc!['openapi'])}` : text(doc?.['swagger']) !== undefined ? `swagger ${text(doc!['swagger'])}` : undefined);
const refsOf = (v: unknown): readonly string[] => (Array.isArray(v) ? v.flatMap(refsOf) : v !== null && typeof v === 'object' ? Object.entries(v).flatMap(([k, one]) => (k === '$ref' && typeof one === 'string' ? [one] : refsOf(one))) : []);
export const unresolvedOf = (doc: Doc, within: unknown = doc): readonly string[] => [...new Set(refsOf(within).filter((ref) => (ref.startsWith('#/')
  ? ref.slice(2).split('/').reduce<unknown>((at, step) => (at === undefined ? undefined : record(at)[step.split('~1').join('/').split('~0').join('~')]), doc) === undefined
  : !ref.includes('#/components/x-access/'))))].sort();
export const specOf = (bytes: Uint8Array): Doc | undefined => ((doc) => (isSpec(doc) ? doc : undefined))(documentOf(new TextDecoder().decode(bytes)));

export const filesOf = (rest: readonly unknown[]): readonly { readonly place: string; readonly text: string }[] => (rest.find(Array.isArray) as readonly { readonly place: string; readonly text: string }[] | undefined) ?? [];

export const placeOf = (rest: readonly unknown[]): string => ((files) => files?.[0]?.place ?? '')(rest.find(Array.isArray) as readonly { readonly place?: string }[] | undefined);

export const sourceOf = (place: string): string => (place.split('/').at(-1) ?? '').split('.')[0]!.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'api';

export const resolved = (doc: Doc, v: unknown, depth = 0): Doc => ((ref) => (ref === undefined ? record(v) : depth > 16 || !ref.startsWith('#/') ? {}
  : resolved(doc, ref.slice(2).split('/').reduce<unknown>((at, step) => record(at)[step.split('~1').join('/').split('~0').join('~')], doc), depth + 1)))(text(record(v)['$ref']));

export const stepOf = (name: string): string => name.trim().replace(/\s+/g, '-');

export const fieldOf = (name: string): string => stepOf(name).replace(/[/|:]/g, '-') || '-';

/** Every operation the document states: a member of a path item that holds responses, keyed by its id, or by its method and path as one step — never by steps an offer-s own scopes would read as its parts. */
export const operationsOf = (doc: Doc): readonly Operation[] => Object.entries(record(doc['paths'])).flatMap(([path, raw]) => ((item) => Object.entries(item)
  .filter(([, op]) => record(op)['responses'] !== undefined)
  .map(([method, op]) => ({ key: stepOf(text(record(op)['operationId']) ?? `${method}${path}`.replace(/\/+/g, '-')), method, path, item, op: record(op) })))(resolved(doc, raw)));

export const handedLines = (asked: Asked): readonly Handed[] => [...asked.lines, ...Object.values(asked.regions ?? {}).flatMap((region) => region.receipts)];

export interface Op { readonly fields: Readonly<Record<string, readonly string[]>>; readonly split: ReadonlySet<string> }

/**
 * The operations among the lines a region is handed, by the step after the family. Two readings of a field are the same
 * when topos reads their values as the same set; a field read as two different sets is split: every member is kept, and
 * the field is named split, never settled by whichever line came last.
 */
export const handedOps = (asked: Asked, family: string): ReadonlyMap<string, Op> => {
  const seen = new Map<string, Map<string, Map<string, readonly string[]>>>();
  for (const line of handedLines(asked)) {
    const [first, field, ...key] = steps(of(line, 'scope'));
    if (first !== family || field === undefined || !key.length) continue;
    const read = alphabet(of(line, 'value'));
    const members = [...new Set(read.members)].sort(byBytes);
    const op = seen.get(key.join('/')) ?? seen.set(key.join('/'), new Map()).get(key.join('/'))!;
    (op.get(field) ?? op.set(field, new Map()).get(field)!).set(alphabet({ ...read, members }), members);
  }
  return new Map([...seen].map(([key, op]) => [key, {
    fields: Object.fromEntries([...op].map(([field, reads]) => [field, [...new Set([...reads.values()].flat())].sort(byBytes)])),
    split: new Set([...op].filter(([, reads]) => reads.size > 1).map(([field]) => field)),
  }]));
};

export const fill = (asked: Asked, key: string, fields: Readonly<Record<string, string>>): string =>
  listed(asked, `form/template/openapi/${key}`).reduce((t, f) => t.split(`{${f}}`).join(fields[f] ?? ''), of(found(asked, `prose/${lang(asked)}/${key}`), 'about'));
