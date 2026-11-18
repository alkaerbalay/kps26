export const fail=(message,status=400)=>{const error=new Error(message);error.status=status;throw error};
export const num=(value,min=0)=>{
 if(!['string','number'].includes(typeof value)||(typeof value==='string'&&!value.trim()))fail('تحقق من القيم الرقمية');
 const n=Number(value);
 if(!Number.isFinite(n)||n<min||n>1e12)fail('تحقق من القيم الرقمية');
 return n;
};
export const whole=value=>{
 const n=num(value);
 if(!Number.isInteger(n)||n>2000000000)fail('الكمية يجب أن تكون عدداً صحيحاً ضمن الحدود المسموحة');
 return n;
};
// Reject hidden fractions before Postgres rounds them differently from a document total.
export const cents=(value,min=0)=>{
 const n=num(value,min);
 if(!/^\+?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(value).trim()))fail('المبالغ تقبل منزلتين عشريتين كحد أقصى');
 return Math.round(n*100);
};
export const money=(value,min=0)=>String(cents(value,min)/100);
