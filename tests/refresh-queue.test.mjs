import test from 'node:test';
import assert from 'node:assert/strict';
import {createRefreshQueue} from '../src/refresh-queue.mjs';
test('post-save refresh waits for an older snapshot then reads the new state',async()=>{
 let release,reads=0,value='before';
 const gate=new Promise(resolve=>{release=resolve});
 const refresh=createRefreshQueue(async()=>{reads++;const snapshot=value;if(reads===1)await gate;return snapshot});
 const periodic=refresh(true);await Promise.resolve();
 const overlapping=refresh(true);value='after';
 const afterSave=refresh(true,true);
 assert.equal(reads,1);release();
 assert.equal(await periodic,'before');assert.equal(await overlapping,'before');
 assert.equal(await afterSave,'after');assert.equal(reads,2);
});
test('failed refresh does not permanently block subsequent reads',async()=>{
 let count=0;const refresh=createRefreshQueue(async()=>{if(++count===1)throw Error('network');return true});
 await assert.rejects(refresh());assert.equal(await refresh(),true);
});
