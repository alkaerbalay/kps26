import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptInviteSession} from '../src/invite-session.mjs';

test('invitation acceptance establishes the cookie session through login before returning',async()=>{
 const token=Symbol(),password=Symbol(),calls=[];
 const user={email:'invitee@example.test'};
 const result=await acceptInviteSession({
  acceptInvite:async(t,p)=>{assert.equal(t,token);assert.equal(p,password);calls.push('accept');return user},
  login:async(email,p)=>{assert.equal(email,user.email);assert.equal(p,password);calls.push('login');return user}
 },token,password);
 assert.deepEqual(calls,['accept','login']);assert.equal(result,user);
});

test('a rejected invitation never attempts login',async()=>{
 const rejected=new Error('invalid invitation');
 await assert.rejects(acceptInviteSession({acceptInvite:async()=>{throw rejected},login:()=>assert.fail('unexpected login')},Symbol(),Symbol()),error=>error===rejected);
});

test('a login failure after acceptance directs the user to login rather than reuse the invite',async()=>{
 await assert.rejects(acceptInviteSession({acceptInvite:async()=>({email:'invitee@example.test'}),login:async()=>{throw Error()}},Symbol(),Symbol()),{code:'INVITE_ACCEPTED_LOGIN_PENDING'});
});
