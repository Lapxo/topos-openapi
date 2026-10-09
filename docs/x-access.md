## The x-access profile

An OpenAPI document says what an API offers and how a request proves access: a bearer, a key, OAuth 2.0. It does not say how a person gets that proof when the API has a login of its own. `x-access` says it, as a profile of the Arazzo workflow format, on the security scheme it proves or once for every API of the same issuer. topos-openapi compiles it into lines a host runs, and the host never guesses a step.

### Where it goes

On a security scheme, or once under `components/x-access/<issuer>` and referred to from every scheme that uses it. These are two documents of this world's own vectors:

```yaml
# auth.yaml
components:
  x-access:
    org:
      inputs: { properties: { email: { x-ask: form } } }
      steps:
        - { stepId: login, operationId: login, requestBody: { payload: { email: $inputs.email } }, outputs: { token: $response.body#/token } }
      outputs: { token: $steps.login.outputs.token }
      x-attach: { in: header, name: Authorization, template: "Bearer {token}" }

# jobs.yaml
components:
  securitySchemes:
    BearerAuth: { type: http, scheme: bearer, x-access: { $ref: "auth.yaml#/components/x-access/org" } }
```

The flow compiles once, under its issuer, and each scheme that refers to it compiles to one line, `issuer=org`. A reference that resolves to none of the documents the place holds is named `unresolved`, never guessed, and it resolves when the document that declares it is connected.

### Inputs

Each input says how it is asked of the person, with `x-ask`. A `form` is a value the person types, asked by the client's own form or on the host's one-time page. A `one-time` code is one the provider just sent, with `x-ttl` for how long it lives. A `choice` is one among the values an earlier answer listed: `x-from` the values, `x-label` their names. A `secret` is a key or a password, asked only on the host's own page and only where the place's root allows one. What the person is shown is `x-label`, else `title`.

### Steps

Steps run in order. A step names an operation of its own document by `operationId`, or of another document of the place by `$sourceDescriptions.<source>.<operationId>`; or an address, with `x-url`, `x-method` and `x-encoding` (`json` or `form`); or a page the person is sent to and comes back from, with `x-page`. `requestBody.payload` says what is sent and `outputs` what is kept. `x-when` runs a step only when its expression holds something, and `x-token` sends it with the token obtained so far. A step whose answer holds nothing its outputs name stops the flow by its name, and so does one that answers an error and names nothing to keep; an error that carries what the outputs name goes on, as a login that answers 409 with a choice to make.

### Expressions

`$inputs.<name>`, `$steps.<id>.outputs.<name>`, `$response.body#/<pointer>` (a `*` step collects every member), `$callback` (the host's return address), `$state`, `$verifier`, `$client` (a client id the place signs), `$scopes`, and `s256(...)`, `base64url(...)`, `base64(...)`. Braces interpolate inside a string. A literal the wire would read as something else is quoted, as `'none'`.

### What it ends in

`outputs.token`, alternatives in order with the first that holds something taken, and `outputs.expires` in seconds. `x-attach` says how the token rides a request: `in` a header or the query, its `name`, and a `template` around `{token}`.

### When a document declares none

A scheme with no `x-access` gets the flow its type implies. A key or a bearer is a secret input; `http basic` asks a user and a password; OAuth 2.0 with an authorization code is the provider's page with PKCE and then the token exchange, with the client the place signs.

### Vectors

Each rule above is a case this world answers from its source and from its packed blob: `samples/yes/a-flow-belongs-to-its-issuer.json`, `samples/yes/a-login-the-source-declares.json`, `samples/yes/a-login-whose-next-step-the-first-answer-calls-for.json`, `samples/yes/an-overlay-derived-line-carries-its-digest.json`, `samples/no/a-refused-overlay-is-named-and-changes-nothing.json`, and the spec cases in `vectors/spec.json`.
