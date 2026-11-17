import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAuthenticatedFetch} from '../src/auth-fetch.mjs';
import {verifyIdentity} from '../netlify/server/identity.mjs';

test('requests wait for session refresh and share concurrent refresh work',async()=>{
 let release,refreshes=0,reads=0;
 const gate=new Promise(resolve=>{release=resolve});
 const request=createAuthenticatedFetch({getUser:async()=>({}),refreshSession:async()=>{refreshes++;await gate},fetch:async(url,options)=>{reads++;assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');return new Response('{}')}});
 const first=request('/api/state'),second=request('/api/logo',{method:'POST',body:'upload'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(refreshes,1);assert.equal(reads,0);
 release();await Promise.all([first,second]);assert.equal(reads,2);
});

test('a mutation is sent once even if authentication is rejected',async()=>{
 let writes=0;
 const request=createAuthenticatedFetch({getUser:async()=>({}),refreshSession:async()=>null,fetch:async()=>{writes++;return new Response('{}',{status:401})}});
 assert.equal((await request('/api/entries',{method:'POST'})).status,401);assert.equal(writes,1);
});

test('only authentication rejection reports expired sessions',async()=>{
 for(const status of [401,403])assert.equal((await verifyIdentity('test',{fetch:async()=>new Response('{}',{status})})).status,401);
 for(const status of [404,429,500,502])assert.equal((await verifyIdentity('test',{fetch:async()=>new Response('{}',{status})})).status,503);
 assert.equal((await verifyIdentity('test',{fetch:async()=>{throw Error('network')}})).status,503);
 assert.equal((await verifyIdentity('test',{fetch:async()=>new Response('<html>')})).status,503);
});

test('remote verification requires a confirmed account and uses the configured project',async()=>{
 const user={id:'test-user',email:'user@example.com',confirmed_at:'2026-11-17'};
 const verified=await verifyIdentity('test',{base:'https://kps26.netlify.app',fetch:async(url,options)=>{assert.equal(url.origin,'https://kps26.netlify.app');assert.equal(url.pathname,'/.netlify/identity/user');assert.equal(options.redirect,'error');return Response.json(user)}});
 assert.deepEqual(verified,{user});
 assert.equal((await verifyIdentity('test',{fetch:async()=>Response.json({...user,confirmed_at:null})})).status,403);
 assert.equal((await verifyIdentity('test',{fetch:async()=>Response.json({})})).status,503);
});
