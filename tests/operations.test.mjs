import test from 'node:test';
import assert from 'node:assert/strict';
import {operation} from '../netlify/server/operations.mjs';

// A serialized transactional double exercises replay/rollback behavior without business writes.
function database(){
 let rows=new Map(),tail=Promise.resolve();
 return {transaction(work){
  const next=tail.then(async()=>{
   const staged=structuredClone(rows);let id;
   const tx={
    insert:()=>({values:value=>{id=value.id;return {onConflictDoNothing:()=>({returning:async()=>{
     if(staged.has(id))return [];staged.set(id,{...value,response:null});return [{id}];
    }})}}}),
    select:()=>({from:()=>({where:async()=>staged.has(id)?[staged.get(id)]:[]})}),
    update:()=>({set:value=>({where:async()=>staged.set(id,{...staged.get(id),...value})})})
   };
   const result=await work(tx);rows=staged;return result;
  });
  tail=next.catch(()=>{});return next;
 }};
}
const table={id:'id'};
const key='11111111-1111-4111-8111-111111111111';
const context=(actor='member@example.test',path='/api/stock',token=key)=>({get:()=>actor,req:{header:()=>token,method:'POST',path}});

test('concurrent duplicate submissions execute business work once and replay the result',async()=>{
 const db=database();let writes=0;
 const work=async()=>({saved:++writes});
 const results=await Promise.all([operation(db,table,context(),{quantity:5},work),operation(db,table,context(),{quantity:5},work)]);
 assert.equal(writes,1);assert.deepEqual(results,[{saved:1},{saved:1}]);
});
test('a key cannot replay different data or a different route',async()=>{
 const db=database();await operation(db,table,context(),{quantity:5},async()=>({ok:true}));
 await assert.rejects(operation(db,table,context(),{quantity:6},()=>assert.fail()),{status:409});
 await assert.rejects(operation(db,table,context(undefined,'/api/entries'),{quantity:5},()=>assert.fail()),{status:409});
});
test('a failed transaction does not consume the key, and actors have independent keys',async()=>{
 const db=database();
 await assert.rejects(operation(db,table,context(),{},async()=>{throw Error('rollback')}));
 assert.deepEqual(await operation(db,table,context(),{},async()=>({ok:true})),{ok:true});
 assert.deepEqual(await operation(db,table,context('another@example.test'),{},async()=>({another:true})),{another:true});
});
test('missing request keys fail before a transaction starts',async()=>{
 await assert.rejects(operation({transaction:()=>assert.fail()},table,context(undefined,undefined,''),{},()=>assert.fail()),{status:400});
});
