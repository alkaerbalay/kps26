import test from 'node:test';
import assert from 'node:assert/strict';
import {whole,money,cents} from '../netlify/server/validation.mjs';
test('invalid JSON scalar types cannot become zero prices or stock',()=>{
 for(const value of [null,undefined,true,false,[],{},'', ' ',Infinity,NaN,-1]){
  assert.throws(()=>whole(value));assert.throws(()=>money(value));
 }
});
test('money retains two decimals and rejects hidden rounding and oversized values',()=>{
 assert.equal(cents('0.29'),29);assert.equal(money('12.50'),'12.5');assert.equal(cents(0),0);
 for(const value of ['1.005','0.001','999999999999.999','1000000000001'])assert.throws(()=>money(value));
 assert.throws(()=>cents('0',0.01));
});
test('aggregated quantities and stock cannot exceed the supported integer bound',()=>{
 assert.equal(whole(2000000000),2000000000);
 for(const value of [2000000001,4000000000,1.5])assert.throws(()=>whole(value));
});
