import { createHash } from 'node:crypto';
import { documentOf, filesOf, isSpec, placeOf, profileOf, said, sourceOf, text, unparsedOf, unresolvedOf } from '../helpers/spec.ts';
import type { Doc, Row } from '../helpers/spec.ts';
import { overlaid } from '../helpers/overlay.ts';
import { rowsOf as auth } from './auth.ts';
import { rowsOf as effects } from './effects.ts';
import { rowsOf as endpoints } from './endpoints.ts';

const rows = (doc: Doc | undefined, source: string, others: ReadonlyMap<string, Doc> = new Map()): readonly Row[] => [...endpoints(doc, source), ...effects(doc, source), ...auth(doc, source, others)];
const digest = (body: string): string => `sha256:${createHash('sha256').update(body).digest('hex')}`;
const keyOf = (row: Row): string => `${row.scope} ${row.bound.values.join('|')}`;

/**
 * The spec region. It reads every document a place holds beside each other, JSON or YAML: each OpenAPI document as the
 * source its file names, with the overlays that name the same source — by their own file's name or by the document they
 * extend — applied in the order of their files' names, and each read with the others in view, as overlaid, so a
 * reference from one to another resolves among the documents the place holds and nowhere else. What a source compiles to differently because of an overlay
 * carries that overlay's digest, under overlaid/; an overlay refused is named, and its source compiles as it stands. A
 * file that says it is an OpenAPI document and does not parse is named with the first line of what the parser answered;
 * one of a profile this world does not read (only OpenAPI 3.0 and 3.1) is named with it; a source is its name, read by
 * the digest of its document, and two different documents under one name are named together and neither is compiled; a
 * reference the world cannot follow is named, never read as empty.
 */
export const observe = (bytes: Uint8Array, ...rest: readonly unknown[]): readonly Row[] => {
  const files = ((handed) => (handed.length ? handed : [{ place: placeOf(rest), text: new TextDecoder().decode(bytes) }]))(filesOf(rest));
  const read = files.map((file) => ({ ...file, doc: documentOf(file.text) }));
  const overlays = read.filter((one) => typeof one.doc?.['overlay'] === 'string').sort((a, b) => (a.place < b.place ? -1 : 1));
  const named = [...new Map(read.filter((one) => isSpec(one.doc)).map((one) => [`${sourceOf(one.place)} ${digest(one.text)}`, one])).values()];
  const collided = new Set(named.map((one) => sourceOf(one.place)).filter((source, i, all) => all.indexOf(source) !== i));
  const specs = named.filter((one) => !collided.has(sourceOf(one.place))).map(({ place, doc, text: body }) => {
    const source = sourceOf(place);
    const mine = overlays.filter((one) => sourceOf(one.place) === source || sourceOf(text(one.doc!['extends']) ?? '') === source);
    const applied = mine.reduce<{ doc: unknown; digests: string[]; refused: string[]; unmatched: number }>((at, one) => ((got) => ('refused' in got
      ? { ...at, refused: [...at.refused, `${digest(one.text)}:${got.refused}`] } : { doc: got.doc, digests: [...at.digests, digest(one.text)], refused: at.refused, unmatched: at.unmatched + got.unmatched }))(overlaid(at.doc, one.doc!)),
    { doc, digests: [], refused: [], unmatched: 0 });
    return { place, doc: doc!, source, applied, identity: digest(body), effective: ((d) => (isSpec(d as Doc) ? d as Doc : doc!))(applied.doc) };
  });
  const others = new Map(specs.map((one) => [one.place.split('/').at(-1)!, one.effective] as const));
  const unparsed = files.flatMap((file) => ((why) => (why === undefined ? [] : said(`openapi/unparsed/${sourceOf(file.place)}`, 'id', [why])))(unparsedOf(file.text)));
  const unsupported = read.filter((one) => one.doc !== undefined && profileOf(one.doc) !== undefined && !isSpec(one.doc) && typeof one.doc['overlay'] !== 'string').flatMap((one) => said(`openapi/unsupported/${sourceOf(one.place)}`, 'id', [profileOf(one.doc)]));
  const collisions = [...collided].flatMap((source) => said(`openapi/collision/${source}`, 'id', named.filter((one) => sourceOf(one.place) === source).map((one) => digest(one.text))));
  return [...unparsed, ...unsupported, ...collisions, ...specs.flatMap(({ doc, source, applied, effective, identity }) => {
    const before = new Set(rows(doc, source, others).map(keyOf));
    const after = rows(effective, source, others);
    const derived = applied.digests.length ? after.filter((row) => !before.has(keyOf(row))) : [];
    return [...after, ...said(`openapi/documents/${source}`, 'id', [identity]), ...said(`openapi/unresolved-refs/${source}`, 'id', unresolvedOf(effective)), ...said(`openapi/overlays/${source}`, 'id', applied.digests), ...said(`openapi/overlays-refused/${source}`, 'id', applied.refused),
      ...said(`openapi/overlays-unmatched/${source}`, 'id', applied.unmatched ? [String(applied.unmatched)] : []),
      ...derived.flatMap((row) => said(row.scope.replace(/^openapi\//, 'overlaid/'), 'id', applied.digests))];
  })];
};
