import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {getTableName} from 'drizzle-orm';

// Exercise real Hono routes without connecting to a business database or Identity.
let state,role,locks;
function query(operation,table,values){
 const name=getTableName(table);
 const chain={where(){return chain},orderBy(){return chain},returning(){return chain},for(mode){locks.push([name,mode]);return chain},set(data){values=data;return chain},values(data){values=data;return chain},then(resolve,reject){
  return Promise.resolve().then(()=>{
   if(operation==='select')return state[name]||[];
   if(operation==='update'){Object.assign(state[name][0],values);return state[name]}
   const row={id:(state[name]||[]).length+1,...values};(state[name]??=[]).push(row);return [row];
  }).then(resolve,reject);
 }};return chain;
}
const db={select:()=>({from:table=>query('select',table)}),update:table=>query('update',table),insert:table=>query('insert',table),transaction:async run=>{
 const before=structuredClone(state);try{return await run(db)}catch(error){state=before;throw error}
}};
globalThis.__energyTestDb=db;
globalThis.__energyTestIdentity=async()=>({user:{id:'verified',email:'test@example.com',app_metadata:{roles:role==='admin'?['admin']:[]}}});
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='../../db/index.mjs')return {url:'data:text/javascript,export const db=globalThis.__energyTestDb',shortCircuit:true};
 if(specifier==='./identity.mjs')return {url:'data:text/javascript,export const verifyIdentity=globalThis.__energyTestIdentity',shortCircuit:true};
 return next(specifier,context);
}});
const {default:app}=await import('../netlify/server/index.mjs');hooks.deregister();
const reset=()=>{
 role='admin';locks=[];state={members:[],products:[{id:1,name:'لوح',price:'10.25',cost:'6.00',stock:5,unit:'قطعة'}],customers:[{id:1,name:'عميل'}],documents:[],entries:[],movements:[],audit:[],settings:[{id:1,currency:'د.ع'}]};
};
const request=(path,body,origin='https://example.com')=>app.request(`https://example.com/api/${path}`,{method:'POST',headers:{Cookie:'nf_jwt=verified',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('invoice atomically captures cents, inventory and initial receipt currency',async()=>{
 reset();const response=await request('documents',{kind:'invoice',customerId:1,items:[{productId:1,quantity:2}],paid:'0.10'});
 assert.equal(response.status,201);assert.equal(state.products[0].stock,3);
 assert.equal(state.documents[0].total,'20.5');assert.equal(state.entries[0].amount,'0.1');assert.equal(state.entries[0].currency,'د.ع');assert.deepEqual(locks,[['products','update']]);
});
test('insufficient stock and invalid initial payments roll back all invoice work',async()=>{
 for(const body of [{quantity:6,paid:0},{quantity:1,paid:'10.26'},{quantity:1,paid:'0.001'}]){
  reset();const response=await request('documents',{kind:'invoice',customerId:1,items:[{productId:1,quantity:body.quantity}],paid:body.paid});
  assert.equal(response.status,400);assert.equal(state.products[0].stock,5);assert.equal(state.documents.length,0);assert.equal(state.movements.length,0);assert.equal(state.entries.length,0);
 }
});
test('collections retain invoice currency after settings change and reject overpayment',async()=>{
 reset();state.documents=[{id:1,kind:'invoice',total:'20.50',paid:'10.25',currency:'USD'}];
 assert.equal((await request('entries',{kind:'income',description:'تحصيل',amount:'10.26',documentId:1})).status,400);
 assert.equal(state.documents[0].paid,'10.25');assert.equal(state.entries.length,0);
 assert.equal((await request('entries',{kind:'income',description:'تحصيل',amount:'10.25',documentId:1})).status,200);
 assert.equal(state.documents[0].status,'paid');assert.equal(state.entries[0].currency,'USD');
});
test('standalone receipts capture settings currency and stock overflow is rejected',async()=>{
 reset();assert.equal((await request('entries',{kind:'expense',description:'مصروف',amount:'1.25'})).status,200);assert.equal(state.entries[0].currency,'د.ع');
 state.products[0].stock=2000000000;
 assert.equal((await request('stock',{productId:1,quantity:1,reason:'توريد'})).status,400);assert.equal(state.products[0].stock,2000000000);
});
test('converted quotations cannot convert again',async()=>{
 reset();state.documents=[{id:1,kind:'quote',status:'converted'}];
 assert.equal((await request('documents/1/convert',{})).status,400);assert.equal(state.products[0].stock,5);assert.equal(state.documents.length,1);
});
test('sales document responses omit costs while preserving the stored cost snapshot',async()=>{
 reset();role='sales';state.members=[{role:'sales',email:'test@example.com'}];state.products[0].price='0.29';
 const response=await request('documents',{kind:'invoice',customerId:1,items:[{productId:1,quantity:3}],paid:'0.87'});
 assert.equal(response.status,201);const document=await response.json();
 assert.equal(document.total,'0.87');assert.equal(document.status,'paid');assert.equal('cost' in document.items[0],false);assert.equal(state.documents[0].items[0].cost,6);
});
test('role and origin checks reject forbidden writes; malformed objects return client errors',async()=>{
 reset();assert.equal((await request('customers',{name:'عميل'},'https://other.example')).status,403);
 role='finance';state.members=[{role:'finance',email:'test@example.com'}];
 assert.equal((await request('documents',{})).status,403);
 role='admin';for(const body of [null,[],false])assert.equal((await request('products',body)).status,400);
 assert.equal((await app.request('https://example.com/api/state')).status,401);
});
