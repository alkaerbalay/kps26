import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAmount,entryCurrency,currentDocument,unknownCurrency} from '../src/business-data.mjs';
import {authenticatedRequester} from '../src/request-attempts.mjs';
import {makeReport} from '../src/report-data.mjs';

test('money keeps supported fractional amounts in displays and print',()=>{
 assert.equal(formatAmount(100.49),'100.49');
 assert.equal(formatAmount('0.01'),'0.01');
});
test('legacy entries inherit only a known linked document currency',()=>{
 const docs=[{id:1,currency:'USD'}];
 assert.equal(entryCurrency({documentId:1},docs),'USD');
 assert.equal(entryCurrency({currency:'د.ع',documentId:1},docs),'د.ع');
 assert.equal(entryCurrency({},docs),unknownCurrency);
});
test('cash totals separate currencies and keep unknown legacy entries visible',()=>{
 const data={role:'admin',documents:[{id:1,currency:'USD'}],entries:[
  {kind:'income',amount:'100',documentId:1},
  {kind:'expense',amount:'2.50',currency:'د.ع'},
  {kind:'income',amount:'900'}
 ].map(e=>({...e,createdAt:'2026-11-17'})),products:[],movements:[],audit:[]};
 for(const [currency,expected] of [['USD',['100','0','100']],['د.ع',['0','2.5','-2.5']],[unknownCurrency,['900','0','900']]]){
  const report=makeReport(data,{type:'cash',currency});
  assert.deepEqual(report.sections[0].rows.map(r=>r[1]),expected);
 }
});
test('open documents follow refreshed state and disappear when access removes them',()=>{
 const old={type:'view',doc:{id:1,paid:'0',status:'unpaid'}};
 const latest={id:1,paid:'50',status:'paid'};
 assert.equal(currentDocument(old,[latest]).doc,latest);
 assert.equal(currentDocument(old,[]),null);
 assert.equal(old.doc.paid,'0');
});
test('retry after a lost response keeps the operation key, success permits a new operation',async()=>{
 const keys=[];let calls=0;let prepared=0;
 const client=authenticatedRequester({prepare:async()=>{prepared++},uuid:()=>`key-${keys.length}`,request:async(url,options)=>{
  keys.push(options.headers.get('Idempotency-Key'));
  assert.equal(options.credentials,'same-origin');
  if(calls++===0)throw Error('lost response');
  return Response.json({ok:true});
 }});
 const options={method:'POST',body:'{"quantity":5}'};
 await assert.rejects(client.fetch('/api/stock',options));
 await client.fetch('/api/stock',options);
 await client.fetch('/api/stock',options);
 assert.equal(keys[0],keys[1]);
 assert.notEqual(keys[1],keys[2]);
 assert.equal(prepared,3);
});
test('truncated success, service errors and changed payloads retain safe retry identities',async()=>{
 const keys=[];let counter=0;
 const client=authenticatedRequester({uuid:()=>String(++counter),request:async(url,o)=>{
  keys.push(o.headers.get('Idempotency-Key'));
  return keys.length===1?new Response('{'):new Response(null,{status:503});
 }});
 await client.fetch('/api/entries',{method:'POST',body:'first'});
 await client.fetch('/api/entries',{method:'POST',body:'first'});
 await client.fetch('/api/entries',{method:'POST',body:'first'});
 await client.fetch('/api/entries',{method:'POST',body:'second'});
 assert.equal(keys[0],keys[1]);assert.equal(keys[1],keys[2]);assert.notEqual(keys[2],keys[3]);
});
