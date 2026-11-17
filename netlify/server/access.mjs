// Public administration is intentional: all visitors share the same access.
// Do not attribute these requests to an authenticated employee.
export async function openAccess(c,next){
 c.header('Cache-Control','private, no-store');
 if(c.req.method!=='GET'&&c.req.header('Origin')!==new URL(c.req.url).origin){
  return c.json({error:'مصدر الطلب غير مسموح'},403);
 }
 c.set('actor','وصول عام');
 c.set('role','admin');
 await next();
}
