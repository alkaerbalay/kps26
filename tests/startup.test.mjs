import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import guard from '../netlify/plugins/preserve-react-entry/index.cjs';

test('deployment restores the React entry after AMP removes application scripts and styles',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'react-entry-'));
 const entry='<!DOCTYPE html><html lang="ar" dir="rtl"><head><script type="module" crossorigin src="/assets/index-abc.js"></script><link rel="stylesheet" href="/assets/index-abc.css"></head><body><div id="root">جارٍ الفتح</div></body></html>';
 const context={constants:{PUBLISH_DIR:dir},utils:{build:{failBuild(message){throw Error(message)}},status:{show(){}}}};
 try{
  await writeFile(join(dir,'index.html'),entry);
  await guard.onBuild(context);
  await writeFile(join(dir,'index.html'),'<!DOCTYPE html><html amp><body><div id="root"></div></body></html>');
  await guard.onPostBuild(context);
  assert.equal(await readFile(join(dir,'index.html'),'utf8'),entry);
  await writeFile(join(dir,'index.html'),'<html amp><body></body></html>');
  await assert.rejects(guard.onBuild(context),/Vite module/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
