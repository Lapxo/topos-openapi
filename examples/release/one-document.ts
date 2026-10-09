// One small document asked of this world through the one contract: its own declaration, read from its one lock, every operation as a form, which of them a host may call, and the line a place adopts the world with.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { declarationOf, receiptShell, shell } from '@lapxo/topos/capsule';
import { answer } from '@lapxo/topos/contract';
import { toposStanding } from '@lapxo/topos/standing';
import { PROTOCOL, canonical } from '@lapxo/topos/wire';
import * as auth from '../../src/regions/auth.ts';
import * as callable from '../../src/regions/callable.ts';
import * as effects from '../../src/regions/effects.ts';
import * as endpoints from '../../src/regions/endpoints.ts';

const own = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8').split('\n').filter((line) => line.startsWith('bound-lock/1'));
const lock = own('TARGET.bound');
const reads = declarationOf(lock).regions;
const document = JSON.stringify({
  openapi: '3.0.3', info: { title: 'a lending desk', version: '1' }, servers: [{ url: 'https://desk.example/v1' }],
  components: { securitySchemes: { token: { type: 'http', scheme: 'bearer' } } }, security: [{ token: [] }],
  paths: {
    '/books': { get: { operationId: 'listBooks', tags: ['books'], responses: { 200: { description: 'the shelf' } } }, post: { operationId: 'addBook', tags: ['books'], responses: { 201: { description: 'shelved' } } } },
    '/books/{id}/lend': { get: { operationId: 'lendBook', tags: ['loans'], 'x-effects': ['pay'], responses: { 200: { description: 'lent' } } } },
  },
});
const rows = [endpoints, effects, auth].flatMap((region) => ((got) => (got.kind === 'fact' ? got.claims as { scope: string; measure: string; role: string; bound: { values: string[] } }[] : []))(answer(region, { protocol: PROTOCOL, verb: 'read', rootScope: '', files: [{ place: 'desk.json', text: document }] }, '')));
const key = / scope=capsule\/key value=(\S+)/.exec(lock.join('\n'))?.[1] ?? '';
const lines = [...lock.filter((line) => / scope=(prose|form)\//.test(line)).map((line) => line.replace(new RegExp(` scope=prose/([^/ ]+)/${key}/`), ' scope=prose/$1/')),
  canonical({ at: 'policy:desk', by: 'target', form: 'alphabet', measure: 'id', role: 'writes', scope: 'lang', value: 'en' }),
  ...rows.map((row) => canonical({ at: 'place:desk.json', by: 'reader:openapi', form: 'alphabet', measure: row.measure, role: row.role, scope: row.scope, value: row.bound.values.join('|') }))];
const render = shell({ endpoints: { reads: reads['endpoints'] ?? [], region: endpoints.render }, effects: { reads: reads['effects'] ?? [], region: effects.render } });
const shown = (region: string, at: number) => ((got) => (got.kind === 'fact' ? got.lines ?? [] : [got.why ?? '']))(answer({ render }, { protocol: PROTOCOL, verb: 'render', rootScope: '', files: [], lines, region, at, shape: 'README.md', name: 'desk', reads: reads[region] ?? [] }, ''));
const verdict = answer({ receipt: receiptShell({ callable: { reads: reads['callable'] ?? [], region: callable.receipt } }) }, { protocol: PROTOCOL, verb: 'read', rootScope: '', files: [], lines, region: 'callable', reads: reads['callable'] ?? [] }, '');
const standing = toposStanding(lock);

for (const line of lock.filter((one) => / scope=(capsule|region)\//.test(one))) console.log(line);
for (const line of [...shown('endpoints', 1), '', ...shown('effects', 1)]) console.log(line);
console.log('callable', JSON.stringify(verdict.kind === 'fact' ? verdict.claims : verdict.why));
console.log(canonical({ at: 'policy:desk/worlds', by: 'target', form: 'alphabet', measure: 'digest', role: 'writes', scope: 'uses/topos-openapi', value: `sha256:${createHash('sha256').update(standing ?? '').digest('hex')}` }));
