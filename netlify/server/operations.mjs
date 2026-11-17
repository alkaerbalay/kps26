import {createHash} from 'node:crypto';
import {eq} from 'drizzle-orm';
const hash=value=>createHash('sha256').update(value).digest('hex');
const error=(message,status)=>Object.assign(new Error(message),{status});
export async function operation(db,table,c,body,work){
 const key=c.req.header('Idempotency-Key');
 if(!key||! /^[a-f0-9-]{36}$/i.test(key))throw error('حدّث الصفحة ثم أعد إرسال العملية.',400);
 const id=hash(`${c.get('actor')}\n${key}`);
 const requestHash=hash(JSON.stringify([c.req.method,c.req.path,body]));
 return db.transaction(async tx=>{
  // The unique insert waits for a concurrent operation to commit or roll back.
  const claimed=await tx.insert(table).values({id,requestHash}).onConflictDoNothing().returning({id:table.id});
  if(!claimed.length){
   const [previous]=await tx.select().from(table).where(eq(table.id,id));
   if(previous?.requestHash!==requestHash)throw error('تغيّرت بيانات العملية. أعد فتح النموذج قبل إرسال عملية جديدة.',409);
   if(previous.response===null)throw error('العملية قيد التنفيذ. أعد المحاولة بعد قليل.',409);
   return previous.response;
  }
  const result=await work(tx);
  await tx.update(table).set({response:result}).where(eq(table.id,id));
  return result;
 });
}
