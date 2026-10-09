/** A step of a path an overlay targets: a member by name, an index, or every member. */
type Step = { readonly name: string } | { readonly index: number } | { readonly every: true };
type Node = { readonly parent: Record<string, unknown> | unknown[]; readonly key: string | number };

/** The steps of a target, in the part of JSONPath overlays use — names, quoted names, indices, wildcards; anything else is no target. */
const stepsOf = (target: string): readonly Step[] | undefined => {
  if (!target.startsWith('$')) return undefined;
  const steps: Step[] = [];
  let rest = target.slice(1);
  while (rest.length) {
    const named = /^\.([A-Za-z_][\w-]*)/.exec(rest), quoted = /^\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*\]/.exec(rest), indexed = /^\[\s*(\d+)\s*\]/.exec(rest), every = /^(\.\*|\[\s*\*\s*\])/.exec(rest);
    if (named) steps.push({ name: named[1]! }); else if (quoted) steps.push({ name: quoted[2]!.replace(/\\(.)/g, '$1') }); else if (indexed) steps.push({ index: Number(indexed[1]) }); else if (every) steps.push({ every: true }); else return undefined;
    rest = rest.slice((named ?? quoted ?? indexed ?? every)![0].length);
  }
  return steps;
};

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const childrenOf = (v: unknown, step: Step): readonly Node[] => Array.isArray(v) ? ('index' in step ? (step.index < v.length ? [{ parent: v, key: step.index }] : []) : 'every' in step ? v.map((_, i) => ({ parent: v, key: i })) : [])
  : isObject(v) ? ('name' in step ? (step.name in v ? [{ parent: v, key: step.name }] : []) : 'every' in step ? Object.keys(v).map((key) => ({ parent: v, key })) : []) : [];
const valueAt = (node: Node): unknown => (node.parent as Record<string | number, unknown>)[node.key];
const merged = (into: unknown, update: unknown): unknown => (isObject(into) && isObject(update) ? Object.fromEntries([...Object.keys(into), ...Object.keys(update).filter((k) => !(k in into))].map((k) => [k, k in update ? merged(into[k], update[k]) : into[k]])) : update);

/**
 * A document with an overlay's actions applied in order, as the Overlay Specification 1.0 states them: an update merged
 * into each object a target selects, or appended to each array; a removal taking each selected node away. A target in
 * JSONPath beyond names, indices and wildcards refuses the whole overlay, never part of it; a target selecting nothing
 * is counted.
 */
export const overlaid = (doc: unknown, overlay: Readonly<Record<string, unknown>>): { readonly doc: unknown; readonly unmatched: number } | { readonly refused: string } => {
  if (typeof overlay['overlay'] !== 'string' || !/^1\.0\.\d+$/.test(overlay['overlay']) || !Array.isArray(overlay['actions'])) return { refused: 'not-an-overlay' };
  let root: Record<string, unknown> = { $: structuredClone(doc) };
  let unmatched = 0;
  for (const action of overlay['actions'] as unknown[]) {
    const a = isObject(action) ? action : {};
    const steps = typeof a['target'] === 'string' ? stepsOf(a['target']) : undefined;
    if (steps === undefined) return { refused: 'target-beyond-names' };
    const nodes = steps.reduce<readonly Node[]>((at, step) => at.flatMap((node) => childrenOf(valueAt(node), step)), [{ parent: root, key: '$' }]);
    if (!nodes.length) { unmatched += 1; continue; }
    for (const node of a['remove'] === true ? [...nodes].reverse() : nodes) {
      if (a['remove'] === true) { if (Array.isArray(node.parent)) node.parent.splice(node.key as number, 1); else delete (node.parent as Record<string, unknown>)[node.key as string]; continue; }
      const at = valueAt(node);
      if (Array.isArray(at)) at.push(structuredClone(a['update'])); else (node.parent as Record<string | number, unknown>)[node.key] = merged(at, structuredClone(a['update']));
    }
    root = { $: root['$'] };
  }
  return { doc: root['$'], unmatched };
};
