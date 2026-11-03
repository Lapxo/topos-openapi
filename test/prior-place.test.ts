import {test}from'node:test';import{deepStrictEqual}from'node:assert/strict';import{readFileSync}from'node:fs';import{parse}from'@lapxo/topos/wire';import{render}from'../src/regions/place.ts';
const vector=JSON.parse(readFileSync(new URL('../vectors/place.json',import.meta.url),'utf8'));
for(const one of vector.cases)test('prior place: '+one.name,()=>{const lines=vector.worlds[one.world].lines.flatMap((line:string)=>{const p=parse(line);return p.kind==='fact'?[p.value.fields]:[];});deepStrictEqual(render({...one.request,regions:{},lines}),one.expected);});
