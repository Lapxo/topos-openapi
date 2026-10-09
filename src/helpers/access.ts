import { list, record, said, stepOf, text } from './spec.ts';
import type { Doc, Row } from './spec.ts';

const scalar = (v: unknown): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : undefined);
const alternatives = (v: unknown): readonly (string | undefined)[] => (Array.isArray(v) ? v.map(scalar) : [scalar(v)]);
const header = (template: string): Doc => ({ in: 'header', name: 'Authorization', template });

/**
 * How access is obtained when a scheme declares no x-access: what OpenAPI's own types already say, as the same profile —
 * a key or a token the person holds is a secret input, a user and password ride as Basic, and an authorization code is
 * a page the person is sent to and a token traded for its code, with the client the place names. Anything else: none.
 */
const implied = (s: Doc): Doc => {
  const [type, scheme, code] = [text(s['type']), text(s['scheme'])?.toLowerCase(), record(record(s['flows'])['authorizationCode'])];
  if (type === 'apiKey' && text(s['in']) && text(s['name'])) return { inputs: { properties: { key: { 'x-ask': 'secret', title: s['name'] } } }, outputs: { token: '$inputs.key' }, 'x-attach': { in: s['in'], name: s['name'], template: '{token}' } };
  if (type === 'http' && scheme === 'bearer') return { inputs: { properties: { token: { 'x-ask': 'secret' } } }, outputs: { token: '$inputs.token' }, 'x-attach': header('Bearer {token}') };
  if (type === 'http' && scheme === 'basic') return { inputs: { properties: { user: { 'x-ask': 'form' }, password: { 'x-ask': 'secret' } } }, outputs: { token: 'base64({$inputs.user}:{$inputs.password})' }, 'x-attach': header('Basic {token}') };
  if (type !== 'oauth2' || !text(code['authorizationUrl']) || !text(code['tokenUrl'])) return {};
  return { 'x-attach': header('Bearer {token}'), outputs: { token: '$steps.exchange.outputs.token', expires: '$steps.exchange.outputs.expires' }, steps: [
    { stepId: 'authorize', 'x-page': code['authorizationUrl'], outputs: { code: '$response.body#/code' }, requestBody: { payload: {
      response_type: 'code', client_id: '$client', redirect_uri: '$callback', state: '$state', code_challenge: 's256($verifier)', code_challenge_method: 'S256', scope: '$scopes' } } },
    { stepId: 'exchange', 'x-url': code['tokenUrl'], 'x-method': 'post', 'x-encoding': 'form', outputs: { token: '$response.body#/access_token', expires: '$response.body#/expires_in' },
      requestBody: { payload: { grant_type: 'authorization_code', code: '$steps.authorize.outputs.code', redirect_uri: '$callback', client_id: '$client', code_verifier: '$verifier' } } },
  ] };
};

const operationOf = (v: unknown, source: string): readonly [string | undefined, string | undefined] =>
  ((id) => (id?.startsWith('$sourceDescriptions.') ? ((rest) => [rest.slice(0, rest.indexOf('.')), rest.slice(rest.indexOf('.') + 1)] as const)(id.slice('$sourceDescriptions.'.length)) : [id === undefined ? undefined : source, id]))(text(v));

const named = (at: string, values: Doc): readonly Row[] => Object.entries(values).flatMap(([name, v]) => (Array.isArray(v) ? said(`openapi/items/${at}/${stepOf(name)}`, 'id', v.map(scalar)) : said(`openapi/value/${at}/${stepOf(name)}`, 'id', [scalar(v)])));

/**
 * How access to a scheme is obtained, as the document declares it in x-access — an Arazzo workflow whose inputs say how
 * each is asked of the person — or as its type implies: what each input is asked as, every step in order with what it
 * is sent and what it keeps, the token and its expiry as expressions over them, and how the token rides a request. A
 * step names an operation of its own source, or of another by `$sourceDescriptions.<source>.<operationId>`; what it is
 * sent or keeps is one line a name, a list's members as items.
 */
export const accessRows = (s: Doc, source: string, key: string): readonly Row[] => ((x) => {
  const [inputs, attach, outputs] = [Object.entries(record(record(x['inputs'])['properties'])), record(x['x-attach']), record(x['outputs'])];
  return [
    ...(['in', 'name', 'template'] as const).flatMap((field) => said(`openapi/attach-${field}/${key}`, 'id', [scalar(attach[field])])),
    ...said(`openapi/token/${key}`, 'id', alternatives(outputs['token'])), ...said(`openapi/expires/${key}`, 'id', alternatives(outputs['expires'])),
    ...said(`openapi/asks/${key}`, 'id', inputs.map(([, p]) => text(record(p)['x-ask']))),
    ...inputs.flatMap(([name, raw]) => ((p, at) => [...said(`openapi/ask/${at}`, 'id', [text(p['x-ask'])]), ...said(`openapi/ttl/${at}`, 'id', [scalar(p['x-ttl'])]),
      ...said(`openapi/from/${at}`, 'id', [text(p['x-from'])]), ...said(`openapi/label/${at}`, 'id', [text(p['x-label']) ?? scalar(p['title'])])])(record(raw), `${key}/inputs/${stepOf(name)}`)),
    ...list(x['steps']).map(record).flatMap((step, i) => ((at, [from, operation]) => [
      ...said(`openapi/id/${at}`, 'id', [text(step['stepId'])]), ...said(`openapi/source/${at}`, 'id', [from]), ...said(`openapi/operation/${at}`, 'id', [operation]),
      ...(['url', 'page', 'method', 'encoding', 'when', 'token'] as const).flatMap((field) => said(`openapi/${field}/${at}`, 'id', [scalar(step[`x-${field}`])])),
      ...named(`${at}/payload`, record(record(step['requestBody'])['payload'])), ...named(`${at}/outputs`, record(step['outputs'])),
    ])(`${key}/steps/${i + 1}`, operationOf(step['operationId'], source))),
  ];
})(record(s['x-access'])['steps'] !== undefined || record(s['x-access'])['outputs'] !== undefined ? record(s['x-access']) : implied(s));
