import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadCoordinator} from '../src/read-coordinator.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};

test('simultaneous ordinary refreshes share a single read',async()=>{
 const read=createReadCoordinator(),gate=deferred();let calls=0;
 const task=()=>{calls++;return gate.promise};
 const first=read(task),second=read(task);gate.resolve('snapshot');
 assert.deepEqual(await Promise.all([first,second]),['snapshot','snapshot']);assert.equal(calls,1);
});
test('post-save refresh waits for the existing snapshot then fetches fresh data',async()=>{
 const read=createReadCoordinator(),gate=deferred();const calls=[];
 const old=read(()=>{calls.push('old');return gate.promise});
 const fresh=read(()=>{calls.push('fresh');return 'after-save'},true);
 await Promise.resolve();assert.deepEqual(calls,['old']);
 gate.resolve('before-save');assert.equal(await old,'before-save');assert.equal(await fresh,'after-save');assert.deepEqual(calls,['old','fresh']);
});
test('a failed read does not block subsequent refreshes',async()=>{
 const read=createReadCoordinator();await assert.rejects(read(()=>{throw Error('offline')}));
 assert.equal(await read(()=>true,true),true);
});
