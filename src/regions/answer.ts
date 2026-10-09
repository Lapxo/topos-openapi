import { found, of } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';
import { canonical, steps } from '@lapxo/topos/wire';
import { handedLines, handedOps } from '../helpers/spec.ts';

/** The JSON kind a declared type is read as: a value of any other kind does not fit it. */
const kindOf = (type: string): string | undefined => ({ string: 'text', number: 'number', integer: 'number', boolean: 'boolean' } as Readonly<Record<string, string>>)[type];
const line = (scope: string, measure: string, value: string): string => canonical({ at: 'place:answer', by: 'openapi', form: 'alphabet', measure, role: 'reads', scope, value });

/**
 * The answer region. It answers, as lines a host parses and hands on, one response as the world types it: only the values
 * whose path and kind the operation's document declares, each a value of its own line — never a body, never a line a value
 * could make — up to the members a read may show; what it holds back it counts. A response whose shape is undeclared
 * answers its counts alone.
 */
export const render = (asked: Asked): readonly string[] => {
  const most = Number(of(found(asked, 'read/items'), 'value').split('..')[1] ?? 0);
  const declared = new Map([...handedOps(asked, 'openapi')].map(([key, op]) => [key, new Map((op.fields['answers'] ?? []).map((one) => [one.slice(0, one.lastIndexOf(':')), one.slice(one.lastIndexOf(':') + 1)]))]));
  const held = handedLines(asked).filter((one) => steps(of(one, 'scope'))[0] === 'answer');
  const requests = [...new Set(held.map((one) => steps(of(one, 'scope'))[1] ?? ''))].filter(Boolean).sort();
  return requests.flatMap((request) => {
    const at = `answer/${request}`;
    const offer = of(held.find((one) => of(one, 'scope') === at && of(one, 'measure') === 'offer') ?? {}, 'value');
    const types = declared.get(offer) ?? new Map<string, string>();
    const values = held.filter((one) => of(one, 'scope').startsWith(`${at}/`) && ['text', 'number', 'boolean'].includes(of(one, 'measure')));
    const shown = values.filter((one) => {
      const path = of(one, 'scope').slice(at.length + 1).split('/');
      const index = path.find((step) => /^\d+$/.test(step));
      return kindOf(types.get(path.map((step) => (/^\d+$/.test(step) ? '*' : step)).join('/')) ?? '') === of(one, 'measure') && (index === undefined || Number(index) < most);
    });
    return [line(at, 'offer', offer || 'unknown'), ...held.filter((one) => (of(one, 'scope') === at || of(one, 'scope').startsWith(`${at}/`)) && ['members', 'shape'].includes(of(one, 'measure'))).map((one) => line(of(one, 'scope'), of(one, 'measure'), of(one, 'value'))),
      ...shown.map((one) => line(of(one, 'scope'), of(one, 'measure'), of(one, 'value'))), line(at, 'withheld', String(values.length - shown.length))].sort();
  });
};
