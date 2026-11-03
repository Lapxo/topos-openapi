# Region contracts

Generated from the declared region contracts. Each row states what a region may read or write; it grants no host authority.

| Region | Role | Measure | Selectors |
| --- | --- | --- | --- |
| answer | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs · read/** · answer/** · region/response |
| auth | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs |
| callable | receipt | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs |
| effects | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs |
| endpoints | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs |
| place | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs · read/** · write/** · capsule/** · wire/provider-inputs · region/** |
| readout | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs · read/** · write/** |
| response | receipt | reads | *.json |
| spec | receipt | reads | *.json@* · *.yaml@* · *.yml@* |
| place | writes | writes | region/** · keys/** · offers/** · read/** · write/** |
| response | writes | writes | answer/** |
| spec | writes | writes | openapi/** · overlaid/** |
| openapi-place | render | reads | capsule/key · lang · form/template/** · form/openapi/** · prose/** · openapi/** · overlaid/** · region/spec · wire/provider-inputs · read/** · write/** · capsule/** · wire/provider-inputs · region/** |
| openapi-place | writes | writes | region/** · keys/** · offers/** · read/** · write/** |

`openapi-place` and `place` share an implementation. The provider-input selector for the dedicated view is declared explicitly; missing provider lines refuse.
