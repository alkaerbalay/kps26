import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySession} from '../netlify/server/session.mjs';

test('missing cookie is rejected before contacting Identity',async()=>{
 await assert.rejects(verifySession('',{request:()=>assert.fail('unexpected request')}),{status:401});
});

test('verification uses the configured site and remotely returned user',async()=>{
 const user={email:'member@example.test',confirmed_at:'2026-01-01',app_metadata:{roles:['sales']}};
 const result=await verifySession('other=value; nf_jwt=test-only-token',{
  siteUrl:'https://preview.example.test',
  request:async(url,options)=>{
   assert.equal(url.href,'https://preview.example.test/.netlify/identity/user');
   assert.equal(options.headers.Authorization,'Bearer test-only-token');
   assert.equal(options.redirect,'error');
   assert.equal(options.cache,'no-store');
   return Response.json(user);
  }
 });
 assert.deepEqual(result,user);
});

test('default verification no longer points to the old project',async()=>{
 const previous=process.env.URL;
 delete process.env.URL;
 try{
  await verifySession('nf_jwt=test-only-token',{request:async url=>{
   assert.equal(url.origin,'https://kps26.netlify.app');
   return Response.json({email:'member@example.test'});
  }});
 }finally{if(previous===undefined)delete process.env.URL;else process.env.URL=previous}
});

for(const status of [401,403,404,429,500,503]){
 test(`Identity HTTP ${status} is classified correctly`,async()=>{
  await assert.rejects(verifySession('nf_jwt=test-only-token',{
   request:async()=>new Response(null,{status})
  }),{status:[401,403].includes(status)?401:503});
 });
}

test('timeouts, malformed responses and network failures do not expire the session',async()=>{
 for(const request of [async()=>{throw Error('network')},async()=>new Response('<html>unavailable</html>'),async()=>Response.json(null)]){
  await assert.rejects(verifySession('nf_jwt=test-only-token',{request}),{status:503});
 }
});
