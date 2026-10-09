import { readers, receiptShell, shell } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { alphabet } from '@lapxo/topos/wire';
import * as answer from './regions/answer.ts';
import * as auth from './regions/auth.ts';
import * as callable from './regions/callable.ts';
import * as effects from './regions/effects.ts';
import * as endpoints from './regions/endpoints.ts';
import * as place from './regions/place.ts';
import * as readout from './regions/readout.ts';
import * as response from './regions/response.ts';
import * as spec from './regions/spec.ts';

type Fields = Readonly<Record<string, string>>;
/** The world's own lines, as the host hands them through the provider channel; a host that hands none gets no answer. */
const provided = (asked: Asked | undefined): readonly Fields[] => {
  const lines = (asked as { provider?: { lines?: readonly Fields[] } } | undefined)?.provider?.lines;
  if (lines === undefined) throw Error('REFUSE·world its host handed none of its own lines: select it by its standing');
  return lines;
};
const readsOf = (lines: readonly Fields[], region: string): readonly string[] => lines.filter((f) => f['scope'] === `region/${region}` && f['measure'] === 'reads').flatMap((f) => alphabet(f['value'] ?? '').members);
/** The world's own lines a region reads beside the place's, its prose under its key dropped: the key is the world's, never the place's. */
const own = (lines: readonly Fields[]): readonly Fields[] => ((key) => lines.filter((f) => /^(prose|form|read|write)\//.test(f['scope'] ?? '')).map((f) => ({ ...f, scope: (f['scope'] ?? '').replace(new RegExp(`^prose/([^/]+)/${key}/`), 'prose/$1/') })))(lines.find((f) => f['scope'] === 'capsule/key')?.['value'] ?? '');

const renders = { answer: answer.render, auth: auth.render, effects: effects.render, endpoints: endpoints.render, place: place.render, readout: readout.render } as const;
const receipts = { callable: callable.receipt } as const;
const observers = { response: response.observe, spec: spec.observe } as const;
const with_ = <T>(region: (asked: Asked) => T, lines: readonly Fields[]) => (asked: Asked) => region({ ...asked, lines: [...asked.lines, ...own(lines)] });

/** Every region is asked as the world's own lines declare it, read off what the host handed — never off a file of its own. */
export const render = (asked: Asked) => ((lines) => shell(Object.fromEntries(Object.entries(renders).map(([name, region]) => [name, { reads: readsOf(lines, name), region: with_(region, lines) }])))(asked))(provided(asked));
export const receipt = (asked: Asked) => ((lines) => receiptShell(Object.fromEntries(Object.entries(receipts).map(([name, region]) => [name, { reads: readsOf(lines, name), region: with_(region, lines) }])))(asked))(provided(asked));
export const observe = (bytes: Uint8Array, place: string, region: string, files: readonly { readonly place: string; readonly text: string }[] = [], asked?: Asked) =>
  ((lines) => readers(Object.fromEntries(Object.entries(observers).map(([name, read]) => [name, { reads: readsOf(lines, name), observe: read }]))).observe(bytes, place, region, files))(provided(asked));
