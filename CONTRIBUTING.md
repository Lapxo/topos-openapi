# Contributing

Use neutral, synthetic API descriptions and retain a counterexample for every changed interpretation. Do not include accounts, credentials, private API documents or live API responses.

Install dependencies with `npm ci --ignore-scripts`, compile with `npm run build`, and run `node --test test/prior-place.test.ts test/compile-region.test.ts`. The tests verify this world, not its host.

Keep interpretation separate from transport, authorization and execution. Preserve legacy views and disclose semantic changes. Budget changes require a measured witness and an explicit owner decision. Admission, artifact approval and publication are separate acts.
