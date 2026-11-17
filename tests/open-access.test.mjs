import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Hono} from 'hono';
import {openAccess} from '../netlify/server/access.mjs';
import {createApiFetch} from '../src/api-fetch.mjs';

function application(){
 const app=new Hono();
 app.use('/api/*',openAccess);
 app.all('/api/probe',c=>c.json({role:c.get('role'),actor:c.get('actor')}));
 return app;
}

test('visitors without a session receive administrator access and a shared audit actor',async()=>{
 for(const headers of [{},{Cookie:'nf_jwt=obsolete-session'}]){
  const response=await application().request('https://example.test/api/probe',{headers});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.deepEqual(await response.json(),{role:'admin',actor:'وصول عام'});
 }
});

test('same-origin public writes succeed; foreign and missing origins are rejected',async()=>{
 const app=application();
 for(const method of ['POST','PUT','DELETE','PATCH']){
  const allowed=await app.request('https://example.test/api/probe',{method,headers:{Origin:'https://example.test'}});
  assert.equal(allowed.status,200);
  for(const headers of [{Origin:'https://foreign.test'},{}]){
   const denied=await app.request('https://example.test/api/probe',{method,headers});
   assert.equal(denied.status,403);
   assert.equal(denied.headers.get('Cache-Control'),'private, no-store');
  }
 }
});

test('client reads and uploads work without an Identity service and disable caching',async()=>{
 const requests=[];
 const request=createApiFetch({fetch:async(url,options)=>{requests.push({url,...options});return Response.json({ok:true})}});
 await request('/api/state');
 const body=new FormData();body.set('logo',new Blob(['image']),'logo.png');
 await request('/api/logo',{method:'POST',body,cache:'force-cache'});
 assert.equal(requests.length,2);
 for(const options of requests){assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin')}
 assert.equal(requests[1].body,body);
});

test('a failed business write is never replayed automatically',async()=>{
 let writes=0;
 const request=createApiFetch({fetch:async()=>{writes++;return Response.json({error:'unavailable'},{status:503})}});
 assert.equal((await request('/api/entries',{method:'POST',body:'{}'})).status,503);
 assert.equal(writes,1);
});
