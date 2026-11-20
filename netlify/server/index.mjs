import { Hono } from 'hono';
import {fail,whole,money,addLineTotal,readBody} from './validation.mjs';
import { verifyIdentity } from './identity.mjs';
import { bodyLimit } from 'hono/body-limit';
import { getStore } from '@netlify/blobs';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db/index.mjs';
import * as t from '../../db/schema.ts';
import { randomUUID } from 'node:crypto';
const app = new Hono();
const roles=['admin','sales','warehouse','finance'];
const can=(role,section)=>role==='admin'||({sales:['customers','documents'],warehouse:['products','movements'],finance:['entries','documents']}[role]||[]).includes(section);
const str=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const publicDoc=(doc,role)=>role==='sales'?{...doc,items:doc.items.map(({cost,...i})=>i)}:doc;
const log=async(tx,actor,action)=>tx.insert(t.audit).values({actor,action});
app.onError((err,c)=>{
 const code=err.code||err.cause?.code;
 if(code==='23505')return c.json({error:'هذا الرمز أو السجل موجود مسبقاً. استخدم قيمة أخرى.'},409);
 return c.json({error:err.status?err.message:'تعذر إكمال العملية. حاول مرة أخرى.'},err.status||500);
});
app.use('/api/*',async(c,next)=>{
 c.header('Cache-Control','private, no-store');
 if(c.req.method!=='GET'&&c.req.header('Origin')!==new URL(c.req.url).origin) return c.json({error:'مصدر الطلب غير مسموح'},403);
 const cookie=c.req.header('Cookie')||'';const token=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('nf_jwt='))?.slice(7);
 if(!token)return c.json({error:'سجّل الدخول للوصول إلى بيانات العمل'},401);
 const verified=await verifyIdentity(token);
 if(verified.error)return c.json({error:verified.error},verified.status);
 const {user}=verified;
 const email=user.email.toLowerCase(); const [member]=await db.select().from(t.members).where(eq(t.members.email,email));
 const role=user.app_metadata?.roles?.includes('admin')?'admin':member?.role;
 if(!roles.includes(role))return c.json({error:'حسابك بانتظار منح الصلاحية من المدير'},403);
 c.header('Cache-Control','private, no-store');
 c.set('actor',email);c.set('role',role); await next();
});
app.get('/api/state',async c=>{
 const result = await db.transaction(async tx=>{
 await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
 const role=c.get('role');
 const [settings]=await tx.select().from(t.settings).where(eq(t.settings.id,1));
 const result={role,email:c.get('actor'),settings:settings||{name:'الكفيل لحلول الطاقة',currency:'د.ع',address:'كربلاء المقدسة، العراق',phone:'',logo:''}};
 for(const name of ['products','customers','documents','entries','members','audit','movements']){
  const allowed=role==='admin'||can(role,name)||(role==='sales'&&name==='products')||(role==='finance'&&['customers','products'].includes(name));
  result[name]=allowed?await tx.select().from(t[name]).orderBy(desc(t[name].id)):[];
 }
 if(role==='sales')result.products=result.products.map(({cost,...p})=>p);
 if(role==='sales')result.documents=result.documents.map(d=>({...d,items:d.items.map(({cost,...item})=>item)}));
 return result;
 });
 return c.json(result);
});
app.post('/api/products',async c=>{
 if(!can(c.get('role'),'products'))fail('ليست لديك صلاحية إدارة المخزن',403);
 const b=await readBody(c);const data={name:str(b.name),sku:str(b.sku,80),category:str(b.category,80),price:String(money(b.price)),cost:String(money(b.cost===''?0:b.cost??0)),stock:whole(b.stock),minimum:whole(b.minimum),unit:str(b.unit,25)||'قطعة'};
 if(!data.name||!data.sku||!data.category)fail('أكمل اسم المادة ورمزها وفئتها');
 await db.transaction(async tx=>{const [p]=await tx.insert(t.products).values(data).returning();await tx.insert(t.movements).values({productId:p.id,quantity:p.stock,reason:'رصيد افتتاحي',createdBy:c.get('actor')});await log(tx,c.get('actor'),`إضافة مادة: ${p.name}`)});
 return c.json({ok:true},201);
});
app.put('/api/products/:id',async c=>{
 if(!can(c.get('role'),'products'))fail('ليست لديك صلاحية تعديل المواد',403);
 const b=await readBody(c);const data={name:str(b.name),sku:str(b.sku,80),category:str(b.category,80),price:String(money(b.price)),cost:String(money(b.cost===''?0:b.cost??0)),minimum:whole(b.minimum),unit:str(b.unit,25)||'قطعة'};
 if(!data.name||!data.sku||!data.category)fail('أكمل البيانات المطلوبة');
 await db.transaction(async tx=>{const [p]=await tx.update(t.products).set(data).where(eq(t.products.id,whole(c.req.param('id')))).returning();if(!p)fail('المادة غير موجودة',404);await log(tx,c.get('actor'),`تعديل مادة: ${p.name}`)});return c.json({ok:true});
});
app.put('/api/customers/:id',async c=>{
 if(!can(c.get('role'),'customers'))fail('ليست لديك صلاحية تعديل العملاء',403);
 const b=await readBody(c);if(!str(b.name))fail('اسم العميل مطلوب');
 const [customer]=await db.update(t.customers).set({name:str(b.name),phone:str(b.phone,40),address:str(b.address)}).where(eq(t.customers.id,whole(c.req.param('id')))).returning();if(!customer)fail('العميل غير موجود',404);return c.json({ok:true});
});
app.post('/api/stock',async c=>{
 if(!can(c.get('role'),'products'))fail('ليست لديك الصلاحية',403);
 const b=await readBody(c);const quantity=whole(b.quantity);if(!quantity||!str(b.reason))fail('حدد الكمية وسبب التوريد');
 await db.transaction(async tx=>{const id=whole(b.productId);const [current]=await tx.select().from(t.products).where(eq(t.products.id,id)).for('update');if(!current)fail('المادة غير موجودة',404);const stock=whole(current.stock+quantity);const [p]=await tx.update(t.products).set({stock}).where(eq(t.products.id,id)).returning();await tx.insert(t.movements).values({productId:p.id,quantity,reason:str(b.reason),createdBy:c.get('actor')});await log(tx,c.get('actor'),`توريد ${quantity} من ${p.name}`)});
 return c.json({ok:true});
});
app.post('/api/customers',async c=>{
 if(!can(c.get('role'),'customers'))fail('ليست لديك الصلاحية',403);
 const b=await readBody(c);if(!str(b.name))fail('اسم العميل مطلوب');
 await db.insert(t.customers).values({name:str(b.name),phone:str(b.phone,40),address:str(b.address)});return c.json({ok:true},201);
});
async function createDocument(tx,b,actor){
 if(!['invoice','quote'].includes(b.kind))fail('نوع المستند غير صالح');
 const [customer]=await tx.select().from(t.customers).where(eq(t.customers.id,whole(b.customerId)));if(!customer)fail('اختر عميلاً مسجلاً');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)fail('أضف مادة واحدة على الأقل');
 const combined=new Map();for(const row of b.items){if(!row||typeof row!=='object'||Array.isArray(row))fail('تحقق من مواد المستند');const id=whole(row.productId),q=whole(row.quantity);if(!q)fail('حدد كمية أكبر من صفر');combined.set(id,whole((combined.get(id)||0)+q))}
 const items=[];let total=0;
 for(const [id,quantity] of [...combined].sort((a,b)=>a[0]-b[0])){
  const [p]=await tx.select().from(t.products).where(eq(t.products.id,id)).for('update');if(!p)fail('إحدى المواد غير موجودة');
  if(b.kind==='invoice'&&p.stock<quantity)fail(`الرصيد غير كافٍ: ${p.name}`);
  items.push({productId:id,name:p.name,quantity,price:Number(p.price),cost:Number(p.cost),unit:p.unit});total=addLineTotal(total,p.price,quantity);
  if(b.kind==='invoice'){await tx.update(t.products).set({stock:p.stock-quantity}).where(eq(t.products.id,id));await tx.insert(t.movements).values({productId:id,quantity:-quantity,reason:'صرف مبيعات',createdBy:actor})}
 }
 total=total/100;const paid=b.kind==='quote'?0:money(b.paid??0);if(paid>total)fail('المبلغ المدفوع أكبر من إجمالي الفاتورة');
 const [settings]=await tx.select().from(t.settings).where(eq(t.settings.id,1));
 const number=`${b.kind==='invoice'?'INV':'QT'}-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`;
 const [doc]=await tx.insert(t.documents).values({number,kind:b.kind,customerId:customer.id,customerName:customer.name,items,total:String(total),paid:String(paid),status:b.kind==='quote'?'active':paid===total?'paid':paid?'partial':'unpaid',notes:str(b.notes,2000),currency:settings?.currency||'د.ع',createdBy:actor}).returning();
 if(paid)await tx.insert(t.entries).values({kind:'income',description:`تحصيل ${number}`,amount:String(paid),documentId:doc.id,createdBy:actor});
 await log(tx,actor,`إنشاء ${b.kind==='invoice'?'فاتورة':'عرض سعر'} ${number}`);return doc;
}
app.post('/api/documents',async c=>{if(!can(c.get('role'),'documents')||c.get('role')==='finance')fail('ليست لديك صلاحية إنشاء المبيعات',403);const b=await readBody(c);return c.json(publicDoc(await db.transaction(tx=>createDocument(tx,b,c.get('actor'))),c.get('role')),201)});
app.post('/api/documents/:id/convert',async c=>{
 if(!['admin','sales'].includes(c.get('role')))fail('ليست لديك الصلاحية',403);
 const doc=await db.transaction(async tx=>{const [q]=await tx.select().from(t.documents).where(eq(t.documents.id,whole(c.req.param('id')))).for('update');if(!q||q.kind!=='quote'||q.status!=='active')fail('عرض السعر غير متاح للتحويل');const d=await createDocument(tx,{...q,kind:'invoice',paid:0},c.get('actor'));await tx.update(t.documents).set({status:'converted'}).where(eq(t.documents.id,q.id));return d});return c.json(publicDoc(doc,c.get('role')));
});
app.post('/api/entries',async c=>{
 if(!can(c.get('role'),'entries'))fail('ليست لديك صلاحية العمليات المالية',403);
 const b=await readBody(c);const amount=money(b.amount,0.01);if(!['income','expense'].includes(b.kind)||!str(b.description))fail('أكمل نوع الحركة ووصفها');
 await db.transaction(async tx=>{let documentId=null;if(b.documentId){if(b.kind!=='income')fail('المصروف لا يرتبط بتحصيل فاتورة');const [d]=await tx.select().from(t.documents).where(eq(t.documents.id,whole(b.documentId))).for('update');if(!d||d.kind!=='invoice')fail('الفاتورة غير موجودة');const paid=(Math.round(Number(d.paid)*100)+Math.round(amount*100))/100;if(paid>Number(d.total))fail('المبلغ يتجاوز المتبقي على الفاتورة');await tx.update(t.documents).set({paid:String(paid),status:paid===Number(d.total)?'paid':'partial'}).where(eq(t.documents.id,d.id));documentId=d.id}await tx.insert(t.entries).values({kind:b.kind,amount:String(amount),description:str(b.description),documentId,createdBy:c.get('actor')});await log(tx,c.get('actor'),`تسجيل حركة مالية: ${str(b.description)}`)});return c.json({ok:true});
});
app.put('/api/settings',async c=>{if(c.get('role')!=='admin')fail('للمدير فقط',403);const b=await readBody(c);const data={name:str(b.name,100),currency:str(b.currency,20),phone:str(b.phone,40),address:str(b.address),logo:str(b.logo,300)};if(!data.name||!data.currency)fail('الاسم والعملة مطلوبان');if(data.logo&&!/^https:\/\//.test(data.logo)&&!/^\/api\/logo\/[a-f0-9-]+\.(png|jpg|webp)$/.test(data.logo))fail('استخدم رابط HTTPS أو ارفع الشعار من الجهاز');await db.transaction(async tx=>{await tx.insert(t.settings).values({id:1,...data}).onConflictDoUpdate({target:t.settings.id,set:data});await log(tx,c.get('actor'),'تحديث إعدادات المؤسسة')});return c.json({ok:true})});
app.post('/api/members',async c=>{if(c.get('role')!=='admin')fail('للمدير فقط',403);const b=await readBody(c);const email=str(b.email,200).toLowerCase(),name=str(b.name,100),role=b.role;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||!roles.includes(role))fail('تحقق من بيانات الموظف');await db.transaction(async tx=>{await tx.insert(t.members).values({email,name,role}).onConflictDoUpdate({target:t.members.email,set:{name,role}});await log(tx,c.get('actor'),`تحديث صلاحية ${email}: ${role}`)});return c.json({ok:true})});
app.delete('/api/members/:id',async c=>{if(c.get('role')!=='admin')fail('للمدير فقط',403);const id=whole(c.req.param('id'));await db.transaction(async tx=>{const [member]=await tx.delete(t.members).where(eq(t.members.id,id)).returning();if(!member)fail('الموظف غير موجود',404);await log(tx,c.get('actor'),`إلغاء صلاحية ${member.email}`)});return c.json({ok:true})});
app.use('/api/logo',bodyLimit({maxSize:600000,onError:c=>c.json({error:'حجم الشعار يجب ألا يتجاوز ٥١٢ كيلوبايت'},413)}));
app.post('/api/logo',async c=>{
 if(c.get('role')!=='admin')fail('رفع الشعار متاح للمدير فقط',403);
 const form=await c.req.formData(),file=form.get('logo');
 if(!(file instanceof File)||file.size>524288||!file.size)fail('اختر صورة PNG أو JPEG أو WebP حتى ٥١٢ كيلوبايت');
 const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);
 const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 const jpg=bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const ext=png?'png':jpg?'jpg':webp?'webp':null;if(!ext)fail('صيغة الصورة غير مدعومة');
 const key=`${randomUUID()}.${ext}`,store=getStore({name:'energy-branding',consistency:'strong'}),logo=`/api/logo/${key}`;
 await store.set(key,buffer);
 try{await db.transaction(async tx=>{await tx.insert(t.settings).values({id:1,logo}).onConflictDoUpdate({target:t.settings.id,set:{logo}});await log(tx,c.get('actor'),'رفع شعار المؤسسة')})}catch(e){await store.delete(key).catch(()=>{});throw e}
 return c.json({ok:true,logo},201);
});
app.get('/api/logo/:key',async c=>{
 const key=c.req.param('key');if(!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key))fail('الشعار غير موجود',404);
 const image=await getStore({name:'energy-branding',consistency:'strong'}).get(key,{type:'arrayBuffer'});if(!image)fail('الشعار غير موجود',404);
 c.header('Content-Type',key.endsWith('.png')?'image/png':key.endsWith('.jpg')?'image/jpeg':'image/webp');c.header('X-Content-Type-Options','nosniff');return c.body(image);
});
export default app;
