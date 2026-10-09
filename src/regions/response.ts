import { fieldOf, placeOf, said } from '../helpers/spec.ts';
import type { Row } from '../helpers/spec.ts';

const kindOf = (v: unknown): string | undefined => (typeof v === 'string' ? 'text' : typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : undefined);

/**
 * The response region. It reads one response a place holds for a read — laid under its source, its operation and its
 * request — and answers what it carries: the offer it answered, how many members each array holds, and every value by
 * its path and the type JSON gives it. Nothing is read as an instruction; a body that is not JSON is unreadable.
 */
export const observe = (bytes: Uint8Array, ...rest: readonly unknown[]): readonly Row[] => {
  const steps = placeOf(rest).split('/');
  const [source, operation, request] = [steps.at(-3) ?? '', decodeURIComponent(steps.at(-2) ?? ''), (steps.at(-1) ?? '').replace(/\.json$/, '')];
  const at = `answer/${request}`;
  const body = ((textOf) => { try { return { json: JSON.parse(textOf) as unknown }; } catch { return undefined; } })(new TextDecoder().decode(bytes));
  if (body === undefined) return [...said(at, 'offer', [`${source}/${operation}`]), ...said(at, 'shape', ['unreadable'])];
  const walk = (v: unknown, path: string, depth: number): readonly Row[] => (depth > 6 ? [] : Array.isArray(v)
    ? [...said(path ? `${at}/${path}` : at, 'members', [String(v.length)]), ...v.flatMap((one, i) => walk(one, path ? `${path}/${i}` : `${i}`, depth + 1))]
    : v !== null && typeof v === 'object' ? Object.entries(v).flatMap(([name, one]) => walk(one, path ? `${path}/${fieldOf(name)}` : fieldOf(name), depth + 1))
      : ((kind) => (kind === undefined || !path ? [] : said(`${at}/${path}`, kind, [String(v)])))(kindOf(v)));
  return [...said(at, 'offer', [`${source}/${operation}`]), ...walk(body.json, '', 0)];
};
