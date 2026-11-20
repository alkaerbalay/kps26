import {test} from 'node:test';
import assert from 'node:assert/strict';
import {num,whole,money,addLineTotal,readBody} from '../netlify/server/validation.mjs';

test('numeric validation rejects coercible nonnumeric input and missing fields',()=>{
 for(const value of [null,undefined,true,false,[],[1],{},'', '  ',Infinity,NaN,-1,1e12+1])assert.throws(()=>num(value),{status:400});
 assert.equal(num('12.5'),12.5);
});
test('quantities reject fractions and combined quantities beyond the stock limit',()=>{
 for(const value of [1.5,'2.1',2000000001])assert.throws(()=>whole(value),{status:400});
 assert.equal(whole(2000000000),2000000000);
});
test('money preserves cents and rejects fractional cents instead of silently rounding',()=>{
 for(const value of ['1.01',0.29,12345.67,'1000000000000'])assert.equal(money(value),Number(value));
 for(const value of [1.005,0.001,'12.999'])assert.throws(()=>money(value),{status:400});
 assert.throws(()=>money(0,0.01),{status:400});
});
test('document line totals use integer cents and reject unsafe or excessive totals',()=>{
 assert.equal(addLineTotal(addLineTotal(0,'0.10',3),'0.29',2),88);
 assert.throws(()=>addLineTotal(0,'1000000000000',2000000000),{status:400});
 assert.throws(()=>addLineTotal(1e14,0.01,1),{status:400});
});
test('request bodies must be valid JSON objects',async()=>{
 for(const body of [null,[],true,3,'bad'])await assert.rejects(readBody({req:{json:async()=>body}}),{status:400});
 await assert.rejects(readBody({req:{json:async()=>{throw new SyntaxError()}}}),{status:400});
 assert.deepEqual(await readBody({req:{json:async()=>({name:'مادة'})}}),{name:'مادة'});
});
