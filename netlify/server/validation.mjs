export function fail(message,status=400){
 const error=new Error(message);error.status=status;throw error;
}
export function num(value,min=0){
 if(!['number','string'].includes(typeof value)||(typeof value==='string'&&!value.trim()))fail('تحقق من القيم الرقمية');
 const n=Number(value);
 if(!Number.isFinite(n)||n<min||n>1e12)fail('تحقق من القيم الرقمية');
 return n;
}
export function whole(value){
 const n=num(value);
 if(!Number.isInteger(n)||n>2000000000)fail('الكمية يجب أن تكون عدداً صحيحاً ضمن الحدود المسموحة');
 return n;
}
export function money(value,min=0){
 const n=num(value,min),scaled=n*100,rounded=Math.round(scaled);
 if(Math.abs(scaled-rounded)>Number.EPSILON*Math.max(1,Math.abs(scaled))*2)fail('المبالغ المالية تقبل منزلتين عشريتين فقط');
 return rounded/100;
}
export function addLineTotal(total,price,quantity){
 const next=total+Math.round(money(price)*100)*whole(quantity);
 if(!Number.isSafeInteger(next)||next>1e14)fail('إجمالي المستند يتجاوز الحد المسموح');
 return next;
}
export async function readBody(c){
 let body;
 try{body=await c.req.json()}catch{fail('صيغة بيانات الطلب غير صالحة')}
 if(!body||typeof body!=='object'||Array.isArray(body))fail('صيغة بيانات الطلب غير صالحة');
 return body;
}
